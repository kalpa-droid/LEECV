import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests de getAiKeyCooldownSummary (api/_lib/aiProviders/keyRotation.ts):
 * el resumen de cooldowns que consume el panel admin.
 *
 * Reglas que se defienden:
 * 1. La respuesta son SOLO conteos: nunca sale el texto de una key ni su SHA-256.
 * 2. La verdad de pausas es la UNIÓN de la tabla compartida (DB) y la memoria
 *    local de la instancia (el fail-safe cuando la escritura a la DB falló).
 * 3. Si la DB no responde (timeout o error) se degrada a memoria local sin lanzar.
 * 4. Los hashes de claves que ya no están en el entorno (filas viejas) NO cuentan.
 */

vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  supabaseAdmin: { from: vi.fn() },
}));

import { supabaseAdmin } from '../../api/_lib/supabaseAdmin.js';
import {
  getAiKeyCooldownSummary,
  hashKey,
  markKeyRateLimited,
} from '../../api/_lib/aiProviders/keyRotation.js';

function makeChainable(result: { data?: any[]; error?: any } | 'timeout') {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    gt: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    lt: vi.fn(() => chain),
  };
  if (result === 'timeout') {
    // Thenable que nunca resuelve: withTimeout debe caer al fallback (1500ms).
    chain.then = () => new Promise(() => {});
  } else {
    chain.then = (onFulfilled: any, onRejected: any) =>
      Promise.resolve({ data: result.data ?? [], error: result.error ?? null }).then(onFulfilled, onRejected);
  }
  vi.mocked(supabaseAdmin.from).mockImplementation(() => chain as any);
  return chain;
}

describe('getAiKeyCooldownSummary — resumen de pausas de claves (solo conteos)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('GROQ_API_KEYS', 'key-a,key-b,key-c');
    vi.stubEnv('GEMINI_API_KEYS', 'g-key-1');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('cuenta solo las claves configuradas que están pausadas en la DB (ignora hashes de claves viejas)', async () => {
    makeChainable({
      data: [
        { key_hash: hashKey('key-b') },
        { key_hash: 'f'.repeat(64) }, // fila vieja de una key ya removida del entorno
      ],
    });

    const summary = await getAiKeyCooldownSummary('groq');

    expect(summary).toEqual({
      provider: 'groq',
      configuredKeys: 3,
      pausedKeys: 1,
      source: 'database',
    });
  });

  it('une la verdad de la DB con las pausas locales de memoria de esta instancia', async () => {
    // Claves exclusivas de este test: la pausa en memoria vive en un Map
    // module-level y no debe filtrar al resto de la suite.
    vi.stubEnv('GROQ_API_KEYS', 'mem-a,mem-b');
    makeChainable({ data: [{ key_hash: hashKey('mem-b') }] });
    // mem-a solo está pausada en memoria local (la escritura a la DB pudo fallar)
    await markKeyRateLimited('groq', 'mem-a', 60);

    const summary = await getAiKeyCooldownSummary('groq');

    expect(summary.configuredKeys).toBe(2);
    expect(summary.pausedKeys).toBe(2); // mem-a (memoria) + mem-b (DB)
    expect(summary.source).toBe('database');
  });

  it('si la DB no responde a tiempo degrada a memoria local sin lanzar (fail-safe)', async () => {
    makeChainable('timeout');

    const summary = await getAiKeyCooldownSummary('groq');

    expect(summary).toEqual({
      provider: 'groq',
      configuredKeys: 3,
      pausedKeys: 0,
      source: 'database-unavailable',
    });
  });

  it('si la DB devuelve error también degrada (nunca rompe el endpoint del panel)', async () => {
    makeChainable({ error: { message: 'RLS bloquea la lectura' } });

    const summary = await getAiKeyCooldownSummary('groq');

    expect(summary.pausedKeys).toBe(0);
    expect(summary.source).toBe('database-unavailable');
  });

  it('con cero claves configuradas reporta cero aunque queden filas huérfanas en la DB', async () => {
    vi.stubEnv('GROQ_API_KEYS', '');
    makeChainable({ data: [{ key_hash: 'a'.repeat(64) }] });

    const summary = await getAiKeyCooldownSummary('groq');

    expect(summary).toEqual({
      provider: 'groq',
      configuredKeys: 0,
      pausedKeys: 0,
      source: 'database',
    });
  });

  it('NUNCA expone material de claves: ni el texto de la key ni su hash, en el resultado', async () => {
    vi.stubEnv('GROQ_API_KEYS', 'sk-super-secret-groq-key,key-b');
    makeChainable({ data: [{ key_hash: hashKey('key-b') }] });

    const summary = await getAiKeyCooldownSummary('groq');

    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain('sk-super-secret-groq-key');
    expect(serialized).not.toContain('key-b');
    expect(serialized).not.toMatch(/[0-9a-f]{64}/);
    expect(Object.keys(summary).sort()).toEqual(['configuredKeys', 'pausedKeys', 'provider', 'source']);
  });
});
