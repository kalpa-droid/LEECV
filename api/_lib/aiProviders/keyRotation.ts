/**
 * Key Rotation & Rate-Limit Circuit Breaker Engine
 */

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

export function getNextAvailableKey(providerId: string): string | null {
  const keys = getEnvKeysForProvider(providerId);
  if (keys.length === 0) return null;

  const now = Date.now();
  // Antes esto arrancaba desde un índice guardado en un Map en memoria del proceso
  // (providerKeyIndexMap). En Vercel, dos pedidos concurrentes pueden atenderse en
  // dos instancias de función distintas, cada una con su propio Map vacío — todas
  // arrancaban en el índice 0 y terminaban eligiendo siempre la misma llave bajo
  // tráfico real, aunque pareciera una rotación distribuida. Elegir el punto de
  // partida al azar en cada pedido reparte la carga estadísticamente bien entre
  // las llaves disponibles sin necesitar ningún estado compartido entre instancias.
  const startIndex = Math.floor(Math.random() * keys.length);

  for (let i = 0; i < keys.length; i++) {
    const idx = (startIndex + i) % keys.length;
    const candidateKey = keys[idx];
    const storeKey = `${providerId}:${candidateKey}`;
    const status = keyStatusStoreMap.get(storeKey);

    if (!status || status.pausedUntil <= now) {
      return candidateKey;
    }
  }

  return null;
}

export function markKeyRateLimited(providerId: string, key: string, retryAfterSec: number = 60): void {
  const storeKey = `${providerId}:${key}`;
  const pausedUntil = Date.now() + Math.max(retryAfterSec, 10) * 1000;
  keyStatusStoreMap.set(storeKey, { pausedUntil });
}
