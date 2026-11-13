/**
 * Key Rotation & Rate-Limit Circuit Breaker Engine
 *
 * V2.9.0 — store compartido entre instancias:
 *
 * `getNextAvailableKey` y `markKeyRateLimited` son ahora **async**. Los
 * cooldowns se leen/escriben en la tabla `public.ai_key_cooldowns` (Supabase,
 * ver migración `20261113_ai_key_cooldowns.sql`) como fuente de verdad
 * compartida entre lambdas de Vercel. Se guarda SOLO el SHA-256 de la API key
 * (`hashKey`), nunca la key en texto plano.
 *
 * Resiliencia (fail-safe):
 * - Si la lectura de la DB falla o supera `DB_TIMEOUT_MS`, se usa el Map de
 *   memoria local (comportamiento previo a V2.9.0) y se loguea el fallo. La
 *   rotación de claves NUNCA se rompe por un hipo de la DB.
 * - Si la escritura del cooldown en la DB falla, el cooldown queda en memoria
 *   local y se loguea. El siguiente request en otra instancia podría volver a
 *   intentar la key; el peor caso es un 429 extra, no una caída del pipeline.
 *
 * Un cron periódico (`api/cron-ai-keys-ping.ts`) reporta el estado de los
 * proveedores vía `ping()` y limpia cooldowns expirados de la tabla.
 */

import { createHash } from 'node:crypto';
import { supabaseAdmin } from '../supabaseAdmin.js';

export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** Presupuesto máximo para una operación contra la DB antes de caer a memoria. */
const DB_TIMEOUT_MS = 1500;

interface KeyStatus {
  pausedUntil: number;
}

const keyStatusStoreMap = new Map<string, KeyStatus>();

function getEnvKeysForProvider(providerId: string): string[] {
  let envVal = '';
  if (providerId === 'groq') {
    envVal = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '';
  } else if (providerId === 'gemini') {
    envVal = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
  }

  return envVal
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);
}

function storeMemoryPause(providerId: string, key: string, pausedUntil: number): void {
  keyStatusStoreMap.set(`${providerId}:${key}`, { pausedUntil });
}

function isMemoryPaused(providerId: string, key: string, now: number): boolean {
  const status = keyStatusStoreMap.get(`${providerId}:${key}`);
  return !!status && status.pausedUntil > now;
}

function withTimeout<T>(query: PromiseLike<T>, fallback: T): Promise<T> {
  const guarded = Promise.resolve(query).catch(err => {
    console.warn('[keyRotation] Error en consulta a Supabase:', err);
    return fallback;
  });
  return Promise.race([
    guarded,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), DB_TIMEOUT_MS)),
  ]);
}

/** Hashes de keys pausadas en la DB para el proveedor, o null si la DB falla. */
async function fetchDbPausedHashes(providerId: string, nowIso: string): Promise<Set<string> | null> {
  const query = supabaseAdmin
    .from('ai_key_cooldowns')
    .select('key_hash, paused_until')
    .eq('provider', providerId)
    .gt('paused_until', nowIso);

  const result = await withTimeout(query, null as any);
  if (!result) {
    console.warn('[keyRotation] No se pudieron leer cooldowns de la DB (timeout o error). Usando memoria local.');
    return null;
  }
  if (result.error) {
    console.warn('[keyRotation] Error leyendo cooldowns de la DB. Usando memoria local:', result.error.message);
    return null;
  }
  return new Set((result.data || []).map((row: any) => String(row.key_hash)));
}

async function persistDbPause(providerId: string, keyHash: string, pausedUntilIso: string): Promise<void> {
  const query = supabaseAdmin
    .from('ai_key_cooldowns')
    .upsert(
      { provider: providerId, key_hash: keyHash, paused_until: pausedUntilIso },
      { onConflict: 'provider,key_hash' }
    );

  const result = await withTimeout(query, null as any);
  if (!result) {
    console.warn('[keyRotation] No se pudo persistir el cooldown en la DB (timeout o error). Queda en memoria local.');
    return;
  }
  if (result.error) {
    console.warn('[keyRotation] Error persistiendo cooldown en la DB. Queda en memoria local:', result.error.message);
  }
}

/** Borra cooldowns ya expirados de la tabla. Usado por el cron de limpieza. */
export async function clearExpiredCooldowns(): Promise<boolean> {
  const query = supabaseAdmin
    .from('ai_key_cooldowns')
    .delete()
    .lt('paused_until', new Date().toISOString());

  const result = await withTimeout(query, null as any);
  if (!result) {
    console.warn('[keyRotation] No se pudieron borrar cooldowns expirados (timeout o error).');
    return false;
  }
  if (result.error) {
    console.warn('[keyRotation] Error borrando cooldowns expirados:', result.error.message);
    return false;
  }
  return true;
}

export async function getNextAvailableKey(providerId: string): Promise<string | null> {
  const keys = getEnvKeysForProvider(providerId);
  if (keys.length === 0) return null;

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  // null → la DB no respondió a tiempo: degradar a memoria local (fail-safe).
  const dbPausedHashes = await fetchDbPausedHashes(providerId, nowIso);

  // Arranque al azar por request: reparte carga entre llaves sin estado de índice.
  const startIndex = Math.floor(Math.random() * keys.length);

  for (let i = 0; i < keys.length; i++) {
    const idx = (startIndex + i) % keys.length;
    const candidateKey = keys[idx];

    if (isMemoryPaused(providerId, candidateKey, now)) continue;
    if (dbPausedHashes !== null && dbPausedHashes.has(hashKey(candidateKey))) continue;

    return candidateKey;
  }

  return null;
}

export async function markKeyRateLimited(providerId: string, key: string, retryAfterSec: number = 60): Promise<void> {
  const pausedUntil = Date.now() + Math.max(retryAfterSec, 10) * 1000;
  storeMemoryPause(providerId, key, pausedUntil);
  await persistDbPause(providerId, hashKey(key), new Date(pausedUntil).toISOString());
}
