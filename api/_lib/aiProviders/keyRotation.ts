/**
 * Key Rotation & Rate-Limit Circuit Breaker Engine
 */

interface KeyStatus {
  pausedUntil: number;
}

const keyStatusStoreMap = new Map<string, KeyStatus>();
const providerKeyIndexMap = new Map<string, number>();

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
  const startIndex = providerKeyIndexMap.get(providerId) || 0;

  for (let i = 0; i < keys.length; i++) {
    const idx = (startIndex + i) % keys.length;
    const candidateKey = keys[idx];
    const storeKey = `${providerId}:${candidateKey}`;
    const status = keyStatusStoreMap.get(storeKey);

    if (!status || status.pausedUntil <= now) {
      providerKeyIndexMap.set(providerId, (idx + 1) % keys.length);
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
