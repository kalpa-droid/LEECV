// @vitest-environment jsdom
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { useExportEntitlement } from './useExportEntitlement';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';

vi.mock('../auth/AuthContext');
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('useExportEntitlement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('allows export for Pro users without consuming token', async () => {
    (useAuth as Mock).mockReturnValue({
      user: { id: 'user-123' },
      profile: { plan: 'pro' },
    });

    const { result } = renderHook(() => useExportEntitlement());
    
    // checkEntitlement runs on mount
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.canExport).toBe(true);
    expect(result.current.credits).toBe(999);

    // consumeCreditIfNeeded for Pro
    (supabase.rpc as Mock).mockResolvedValueOnce({ data: true, error: null });
    
    const allowed = await result.current.consumeCreditIfNeeded();
    expect(allowed).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('check_and_consume_export_entitlement', { p_user_id: 'user-123' });
  });

  it('allows export for registered users with unconsumed tokens', async () => {
    (useAuth as Mock).mockReturnValue({
      user: { id: 'user-123' },
      profile: { plan: 'free' },
    });

    // Mock count check
    (supabase.from as Mock).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb) => cb({ count: 1, error: null })),
    });

    const { result } = renderHook(() => useExportEntitlement());
    
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.canExport).toBe(true);
    expect(result.current.credits).toBe(1);

    // consumeCreditIfNeeded for Registered user
    (supabase.rpc as Mock).mockResolvedValueOnce({ data: true, error: null });
    
    const allowed = await result.current.consumeCreditIfNeeded();
    expect(allowed).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('check_and_consume_export_entitlement', { p_user_id: 'user-123' });
  });

  it('denies export for registered users with zero tokens', async () => {
    (useAuth as Mock).mockReturnValue({
      user: { id: 'user-123' },
      profile: { plan: 'free' },
    });

    // Mock count check
    (supabase.from as Mock).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb) => cb({ count: 0, error: null })),
    });

    const { result } = renderHook(() => useExportEntitlement());
    
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.canExport).toBe(false);
    expect(result.current.credits).toBe(0);

    // consumeCreditIfNeeded for Registered user
    (supabase.rpc as Mock).mockResolvedValueOnce({ data: false, error: null });
    
    const allowed = await result.current.consumeCreditIfNeeded();
    expect(allowed).toBe(false);
  });

  it('allows PDF export without consuming credits when manually enabled', async () => {
    (useAuth as Mock).mockReturnValue({
      user: { id: 'user-123' },
      profile: { plan: 'free', pdf_export_access_mode: 'enabled' },
    });

    const { result } = renderHook(() => useExportEntitlement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.canExport).toBe(true);
    expect(result.current.credits).toBe(0);
    expect(supabase.from).not.toHaveBeenCalled();

    (supabase.rpc as Mock).mockResolvedValueOnce({ data: true, error: null });
    await expect(result.current.consumeCreditIfNeeded()).resolves.toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('check_and_consume_export_entitlement', {
      p_user_id: 'user-123',
    });
  });

  it('denies PDF export when manually disabled, even for Pro users', async () => {
    (useAuth as Mock).mockReturnValue({
      user: { id: 'user-123' },
      profile: { plan: 'pro', pdf_export_access_mode: 'disabled' },
    });

    const { result } = renderHook(() => useExportEntitlement());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.canExport).toBe(false);
    expect(result.current.reason).toBe('exportacion_bloqueada');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('allows export for guest users with valid token in localStorage', async () => {
    (useAuth as Mock).mockReturnValue({
      user: null,
      profile: null,
    });
    localStorage.setItem('leecv_export_token', 'valid-token-uuid');

    (supabase.rpc as Mock).mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { paid: true, consumed: false }, error: null }),
    });

    const { result } = renderHook(() => useExportEntitlement());
    
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.canExport).toBe(true);
    expect(result.current.credits).toBe(1);

    // consumeCreditIfNeeded for Guest user
    (supabase.rpc as Mock).mockResolvedValueOnce({ data: true, error: null });
    
    const allowed = await result.current.consumeCreditIfNeeded();
    expect(allowed).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('consume_export_token', { p_token: 'valid-token-uuid' });
    expect(localStorage.getItem('leecv_export_token')).toBeNull(); // Should be removed
  });

  it('denies export for guest users without token', async () => {
    (useAuth as Mock).mockReturnValue({
      user: null,
      profile: null,
    });

    const { result } = renderHook(() => useExportEntitlement());
    
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.canExport).toBe(false);

    const allowed = await result.current.consumeCreditIfNeeded();
    expect(allowed).toBe(false);
  });
});
