import {
  FacturadorVaultData,
  VaultEnvelope,
  VaultSession,
  VaultUnlockResult,
  WrappedKey,
} from './facturadorTypes';

/**
 * BÓVEDA CIFRADA — Web Crypto (sin servidor, sin librerías nuevas)
 *
 * Arquitectura de doble envoltura (DEK):
 *  1. Una DEK aleatoria de 256 bits cifra TODA la base (empresa, clientes,
 *     comprobantes y logos).
 *  2. La DEK se envuelve con una clave derivada de la contraseña (PBKDF2).
 *  3. Opcionalmente, la DEK se envuelve otra vez con una Llave de Rescate de
 *     24 caracteres que se muestra una sola vez al crear la bóveda.
 *
 * Sin la contraseña ni la llave de rescate no hay forma de recuperar los datos:
 * eso es intencional (cero nube, cero puerta trasera).
 */

const ITERATIONS = 600_000;
const AAD_DEK_PASSWORD = 'leecv-facturador:dek:password:v1';
const AAD_DEK_RECOVERY = 'leecv-facturador:dek:recovery:v1';
const AAD_PAYLOAD = 'leecv-facturador:payload:v1';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const RECOVERY_BODY_LEN = 22;
const RECOVERY_CHECK_LEN = 2;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Copia a un Uint8Array con ArrayBuffer propio: Web Crypto (TS 5.9+) no acepta
 * `Uint8Array<ArrayBufferLike>` en `BufferSource`.
 */
function toBytes(source: Uint8Array | ArrayBuffer): Uint8Array<ArrayBuffer> {
  const src = source instanceof Uint8Array ? source : new Uint8Array(source);
  const out = new Uint8Array(src.length);
  out.set(src);
  return out;
}

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  view.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

async function deriveKek(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: toBytes(salt), iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptWithKey(key: CryptoKey, data: Uint8Array, aad: string): Promise<WrappedKey> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(aad) },
    key,
    toBytes(data)
  );
  return { ivB64: toBase64(iv), dataB64: toBase64(encrypted) };
}

async function decryptWithKey(key: CryptoKey, wrapped: WrappedKey, aad: string): Promise<Uint8Array> {
  const iv = fromBase64(wrapped.ivB64);
  const data = fromBase64(wrapped.dataB64);
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toBytes(iv), additionalData: encoder.encode(aad) },
      key,
      toBytes(data)
    );
    return new Uint8Array(decrypted);
  } catch {
    throw new Error('clave_incorrecta');
  }
}

async function sha256(text: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return new Uint8Array(digest);
}

function randomFromAlphabet(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((b) => ALPHABET[b % ALPHABET.length])
    .join('');
}

function checksumFor(body: string): string {
  // Checksum síncrono y determinista sobre el cuerpo (FNV-1a de 32 bits).
  let hash = 0x811c9dc5;
  for (let i = 0; i < body.length; i += 1) {
    hash ^= body.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const first = ALPHABET[Math.abs(hash) % ALPHABET.length];
  const second = ALPHABET[Math.abs(hash >>> 5) % ALPHABET.length];
  return `${first}${second}`;
}

/** Llave de rescate legible: 24 caracteres en 6 grupos de 4. */
export function formatRecoveryKey(key: string): string {
  const clean = normalizeRecoveryKey(key);
  return clean.replace(/(.{4})/g, '$1-').replace(/-$/, '');
}

/** Valida el alfabeto y el checksum; devuelve la llave normalizada sin guiones. */
export function normalizeRecoveryKey(input: string): string {
  const clean = String(input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (clean.length !== RECOVERY_BODY_LEN + RECOVERY_CHECK_LEN) {
    throw new Error('llave_invalida');
  }
  if (![...clean].every((c) => ALPHABET.includes(c))) {
    throw new Error('llave_invalida');
  }
  const body = clean.slice(0, RECOVERY_BODY_LEN);
  const check = clean.slice(RECOVERY_BODY_LEN);
  if (checksumFor(body) !== check) {
    throw new Error('llave_invalida');
  }
  return clean;
}

export function generateRecoveryKey(): string {
  const body = randomFromAlphabet(RECOVERY_BODY_LEN);
  return body + checksumFor(body);
}

function newSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

async function generateDek(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

async function wrapDek(dek: CryptoKey, kek: CryptoKey, aad: string): Promise<WrappedKey> {
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', dek));
  return encryptWithKey(kek, raw, aad);
}

async function unwrapDek(wrapped: WrappedKey, kek: CryptoKey, aad: string): Promise<CryptoKey> {
  const raw = await decryptWithKey(kek, wrapped, aad);
  return crypto.subtle.importKey('raw', toBytes(raw), { name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
}

async function payloadBytes(data: FacturadorVaultData): Promise<Uint8Array> {
  return encoder.encode(JSON.stringify(data));
}

export interface CreateVaultOptions {
  vaultId: string;
  data: FacturadorVaultData;
  password: string;
  withRecoveryKey?: boolean;
}

export interface CreateVaultResult {
  envelope: VaultEnvelope;
  session: VaultSession;
  recoveryKey?: string;
}

/** Crea el sobre cifrado inicial. La llave de rescate se devuelve UNA sola vez. */
export async function createVault({
  vaultId,
  data,
  password,
  withRecoveryKey = true,
}: CreateVaultOptions): Promise<CreateVaultResult> {
  const salt = newSalt();
  const kek = await deriveKek(password, salt, ITERATIONS);
  const dek = await generateDek();
  const recoveryKey = withRecoveryKey ? generateRecoveryKey() : undefined;
  const recoveryKek = recoveryKey ? await deriveKek(recoveryKey, salt, ITERATIONS) : undefined;

  const now = new Date().toISOString();
  const envelope: VaultEnvelope = {
    version: 1,
    vaultId,
    kdf: { algo: 'PBKDF2-SHA256', iterations: ITERATIONS, saltB64: toBase64(salt) },
    wrappedDekPassword: await wrapDek(dek, kek, AAD_DEK_PASSWORD),
    wrappedDekRecovery: recoveryKek ? await wrapDek(dek, recoveryKek, AAD_DEK_RECOVERY) : undefined,
    payload: await encryptWithKey(dek, await payloadBytes(data), AAD_PAYLOAD),
    createdAt: now,
    updatedAt: now,
  };

  return { envelope, session: { vaultId, dek, envelope }, recoveryKey };
}

async function unlockWith(
  envelope: VaultEnvelope,
  passphrase: string,
  wrappedField: 'wrappedDekPassword' | 'wrappedDekRecovery',
  aad: string
): Promise<VaultUnlockResult> {
  const wrapped = envelope[wrappedField];
  if (!wrapped) throw new Error('sin_llave_de_rescate');
  const salt = fromBase64(envelope.kdf.saltB64);
  const kek = await deriveKek(passphrase, salt, envelope.kdf.iterations);
  const dek = await unwrapDek(wrapped, kek, aad);
  const raw = await decryptWithKey(dek, envelope.payload, AAD_PAYLOAD);
  const data = JSON.parse(decoder.decode(raw)) as FacturadorVaultData;
  return { data, session: { vaultId: envelope.vaultId, dek, envelope } };
}

export function unlockWithPassword(envelope: VaultEnvelope, password: string): Promise<VaultUnlockResult> {
  return unlockWith(envelope, password, 'wrappedDekPassword', AAD_DEK_PASSWORD);
}

export function unlockWithRecoveryKey(envelope: VaultEnvelope, recoveryKey: string): Promise<VaultUnlockResult> {
  const normalized = normalizeRecoveryKey(recoveryKey);
  return unlockWith(envelope, normalized, 'wrappedDekRecovery', AAD_DEK_RECOVERY);
}

/** Vuelve a cifrar el payload con la misma DEK (autoguardado). */
export async function sealVaultPayload(
  session: VaultSession,
  data: FacturadorVaultData
): Promise<VaultEnvelope> {
  const envelope: VaultEnvelope = {
    ...session.envelope,
    payload: await encryptWithKey(session.dek, await payloadBytes(data), AAD_PAYLOAD),
    updatedAt: new Date().toISOString(),
  };
  session.envelope = envelope;
  return envelope;
}

/**
 * Cambia la contraseña re-envolviendo la MISMA DEK (los datos no se
 * re-cifran). Se exige la contraseña actual para verificar identidad.
 */
export async function rewrapWithNewPassword(
  session: VaultSession,
  currentPassword: string,
  newPassword: string
): Promise<VaultEnvelope> {
  const salt = fromBase64(session.envelope.kdf.saltB64);
  const currentKek = await deriveKek(currentPassword, salt, session.envelope.kdf.iterations);
  await unwrapDek(session.envelope.wrappedDekPassword, currentKek, AAD_DEK_PASSWORD);

  const newKek = await deriveKek(newPassword, salt, session.envelope.kdf.iterations);
  const envelope: VaultEnvelope = {
    ...session.envelope,
    wrappedDekPassword: await wrapDek(session.dek, newKek, AAD_DEK_PASSWORD),
    updatedAt: new Date().toISOString(),
  };
  session.envelope = envelope;
  return envelope;
}

/** Sobre de rescate: la DEK envuelta con una llave nueva (para reemitirla). */
export async function addRecoveryKey(session: VaultSession): Promise<{ envelope: VaultEnvelope; recoveryKey: string }> {
  const salt = fromBase64(session.envelope.kdf.saltB64);
  const recoveryKey = generateRecoveryKey();
  const kek = await deriveKek(recoveryKey, salt, session.envelope.kdf.iterations);
  const envelope: VaultEnvelope = {
    ...session.envelope,
    wrappedDekRecovery: await wrapDek(session.dek, kek, AAD_DEK_RECOVERY),
    updatedAt: new Date().toISOString(),
  };
  session.envelope = envelope;
  return { envelope, recoveryKey };
}

export function isVaultEnvelope(value: any): value is VaultEnvelope {
  return Boolean(
    value &&
      value.version === 1 &&
      typeof value.vaultId === 'string' &&
      value.kdf?.algo === 'PBKDF2-SHA256' &&
      typeof value.kdf?.saltB64 === 'string' &&
      value.wrappedDekPassword?.dataB64 &&
      value.payload?.dataB64
  );
}

/** Utilidad para tests y para el respaldo: hash corto y estable de un texto. */
export async function shortHash(text: string): Promise<string> {
  return toBase64(await sha256(text)).slice(0, 12);
}
