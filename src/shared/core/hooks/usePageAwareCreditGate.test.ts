/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePageAwareCreditGate } from './usePageAwareCreditGate';
import { supabase } from '../lib/supabaseClient';

import { renderHook, act } from '@testing-library/react';

const fakeLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

vi.stubGlobal('localStorage', fakeLocalStorage);

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe('usePageAwareCreditGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks export when no token is present', async () => {
    const { result } = renderHook(() => usePageAwareCreditGate());
    
    let allowed: boolean = false;
    await act(async () => {
      allowed = await result.current.consumeCredits(1);
    });

    expect(allowed).toBe(false);
    expect(result.current.gateError).toBe('Necesitas pagar por la exportación.');
  });

  it('allows export and consumes token when valid token is present', async () => {
    localStorage.setItem('leecv_export_token', 'valid-token-123');

    vi.mocked(supabase!.rpc).mockResolvedValue({
      data: true,
      error: null,
    } as any);

    const { result } = renderHook(() => usePageAwareCreditGate());
    
    let allowed: boolean = false;
    await act(async () => {
      allowed = await result.current.consumeCredits(1);
    });

    expect(allowed).toBe(true);
    expect(supabase!.rpc).toHaveBeenCalledWith('consume_export_token', {
      p_token: 'valid-token-123',
    });
    expect(localStorage.getItem('leecv_export_token')).toBeNull();
  });

  it('blocks export when token consumption fails', async () => {
    localStorage.setItem('leecv_export_token', 'invalid-token-123');

    vi.mocked(supabase!.rpc).mockResolvedValue({
      data: null,
      error: { message: 'Token invalid or already consumed' },
    } as any);

    const { result } = renderHook(() => usePageAwareCreditGate());
    
    let allowed: boolean = false;
    await act(async () => {
      allowed = await result.current.consumeCredits(1);
    });

    expect(allowed).toBe(false);
    expect(result.current.gateError).toBe('El pago no es válido o ya fue consumido.');
    expect(localStorage.getItem('leecv_export_token')).toBe('invalid-token-123');
  });
});
