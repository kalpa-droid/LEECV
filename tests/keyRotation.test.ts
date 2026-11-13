import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHash } from 'node:crypto';

const mockState = {
  pausedRows: [] as Array<{ key_hash: string; paused_until: string }>,
  selectError: null as any,
  upsertError: null as any,
  deleteError: null as any,
  upsertCalls: [] as Array<{ row: any; opts: any }>,
};

vi.mock('../api/_lib/supabaseAdmin.js', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      void table;
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gt: vi.fn(() => Promise.resolve({ data: mockState.pausedRows, error: mockState.selectError })),
          })),
        })),
        upsert: vi.fn((row: any, opts: any) => {
          mockState.upsertCalls.push({ row, opts });
          return Promise.resolve({ error: mockState.upsertError });
        }),
        delete: vi.fn(() => ({
          lt: vi.fn(() => Promise.resolve({ error: mockState.deleteError })),
        })),
      };
    }),
  },
}));

import { getNextAvailableKey, markKeyRateLimited, hashKey, clearExpiredCooldowns } from '../api/_lib/aiProviders/keyRotation.js';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  mockState.pausedRows = [];
  mockState.selectError = null;
  mockState.upsertError = null;
  mockState.deleteError = null;
  mockState.upsertCalls = [];
  delete process.env.GROQ_API_KEYS;
  delete process.env.GROQ_API_KEY;
  delete process.env.GEMINI_API_KEYS;
  delete process.env.GEMINI_API_KEY;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('hashKey', () => {
  it('devuelve SHA-256 hex (64 caracteres) y es determinista', () => {
    const h = hashKey('gsk_test_key');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(createHash('sha256').update('gsk_test_key').digest('hex')).toBe(h);
    expect(hashKey('gsk_test_key')).toBe(h);
  });
});

describe('getNextAvailableKey', () => {
  it('devuelve null cuando no hay claves configuradas', async () => {
    expect(await getNextAvailableKey('groq')).toBeNull();
  });

  it('devuelve una clave configurada cuando no hay cooldowns', async () => {
    process.env.GROQ_API_KEYS = 'key-alpha,key-beta';
    const key = await getNextAvailableKey('groq');
    expect(['key-alpha', 'key-beta']).toContain(key);
  });

  it('saltea una clave pausada en la DB y devuelve la otra', async () => {
    process.env.GROQ_API_KEYS = 'dbcool-key-a,dbcool-key-b';
    mockState.pausedRows = [{ key_hash: hashKey('dbcool-key-a'), paused_until: new Date(Date.now() + 60_000).toISOString() }];
    expect(await getNextAvailableKey('groq')).toBe('dbcool-key-b');
  });

  it('saltea una clave pausada en memoria (fallback) aunque la DB falle', async () => {
    process.env.GROQ_API_KEYS = 'memcool-key-a,memcool-key-b';
    await markKeyRateLimited('groq', 'memcool-key-a', 60);
    mockState.selectError = { message: 'db down' };
    mockState.pausedRows = [];
    expect(await getNextAvailableKey('groq')).toBe('memcool-key-b');
  });

  it('con todas las claves pausadas devuelve null', async () => {
    process.env.GROQ_API_KEYS = 'allcool-key-a';
    mockState.pausedRows = [{ key_hash: hashKey('allcool-key-a'), paused_until: new Date(Date.now() + 60_000).toISOString() }];
    expect(await getNextAvailableKey('groq')).toBeNull();
  });
});

describe('markKeyRateLimited', () => {
  it('persiste el cooldown en la DB con hash (nunca la key en texto)', async () => {
    await markKeyRateLimited('groq', 'plain-secret-key', 60);
    expect(mockState.upsertCalls).toHaveLength(1);
    const { row, opts } = mockState.upsertCalls[0];
    expect(row.provider).toBe('groq');
    expect(row.key_hash).toBe(hashKey('plain-secret-key'));
    expect(row.key_hash).not.toContain('plain-secret-key');
    expect(new Date(row.paused_until).getTime()).toBeGreaterThan(Date.now());
    expect(opts).toEqual({ onConflict: 'provider,key_hash' });
  });

  it('una clave recién limitada queda pausada (en memoria) y no se entrega', async () => {
    process.env.GROQ_API_KEYS = 'rotora-key-x';
    await markKeyRateLimited('groq', 'rotora-key-x', 60);
    // En memoria queda pausada
    expect(await getNextAvailableKey('groq')).toBeNull();
  });
});

describe('clearExpiredCooldowns', () => {
  it('devuelve true cuando el borrado es exitoso', async () => {
    expect(await clearExpiredCooldowns()).toBe(true);
  });

  it('devuelve false cuando la DB falla', async () => {
    mockState.deleteError = { message: 'db down' };
    expect(await clearExpiredCooldowns()).toBe(false);
  });
});
