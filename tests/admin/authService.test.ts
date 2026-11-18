import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * getCurrentProfile() NUNCA debe rechazar.
 * Si getUser() rechaza (token corrupto en localStorage, navigator.locks
 * abortado, timeout o red), la promesa resuelve null: la UI puede mostrar
 * el login en vez de quedar en blanco permanentemente.
 */

const getUserMock = vi.fn();
const fromMock = vi.fn();
const rpcMock = vi.fn();

vi.mock('../../src/shared/core/lib/supabaseClient', () => ({
  supabase: {
    auth: { getUser: () => getUserMock() },
    from: (...args: any[]) => fromMock(...args),
    rpc: (...args: any[]) => rpcMock(...args),
  },
  checkStorageStatus: () => ({ isCloud: false, label: 'local' }),
}));

import { getCurrentProfile } from '../../src/shared/core/auth/authService';

describe('getCurrentProfile (authService)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock.mockReturnValue({
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
    });
  });

  it('getUser() rechaza (lock abortado / red) → resuelve null, nunca rechaza', async () => {
    getUserMock.mockRejectedValue(new Error('AbortError: the lock request was aborted'));
    await expect(getCurrentProfile()).resolves.toBeNull();
  });

  it('getUser() devuelve usuario null → resuelve null', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    await expect(getCurrentProfile()).resolves.toBeNull();
  });

  it('la consulta a profiles explota (red) → resuelve null, nunca rechaza', async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: { id: 'u1', email: 'a@b.com', user_metadata: {}, created_at: '2026-01-01' },
      },
      error: null,
    });
    fromMock.mockImplementation(() => {
      throw new Error('fetch failed');
    });
    await expect(getCurrentProfile()).resolves.toBeNull();
  });
});
