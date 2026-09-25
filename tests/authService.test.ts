// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setGlobalBeforeRedirect, signInWithGoogle } from '../src/shared/core/auth/authService';
import { supabase } from '../src/shared/core/lib/supabaseClient';

vi.mock('../src/shared/core/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
    },
  },
}));

describe('authService - globalBeforeRedirect & popup fallback', () => {
  const originalOpen = window.open;

  beforeEach(() => {
    vi.clearAllMocks();
    setGlobalBeforeRedirect(null);
  });

  afterEach(() => {
    window.open = originalOpen;
    setGlobalBeforeRedirect(null);
  });

  it('ejecuta el hook globalBeforeRedirect y pasa redirectTo sin ?popup=1 cuando window.open retorna null (popup bloqueado)', async () => {
    const mockCallback = vi.fn().mockResolvedValue(undefined);
    setGlobalBeforeRedirect(mockCallback);

    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { url: 'https://accounts.google.com/oauth', provider: 'google' },
      error: null,
    } as any);

    // Mock popup bloqueado
    window.open = vi.fn().mockReturnValue(null);

    // Prevenir navegación real en jsdom
    delete (window as any).location;
    window.location = { href: '' } as any;

    await signInWithGoogle();

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          redirectTo: expect.not.stringContaining('popup=1'),
        }),
      })
    );
  });

  it('asigna popup.location.href y pasa ?popup=1 cuando window.open es exitoso (popup abierto)', async () => {
    const mockCallback = vi.fn().mockResolvedValue(undefined);
    setGlobalBeforeRedirect(mockCallback);

    const mockPopup = { location: { href: '' }, close: vi.fn() };
    window.open = vi.fn().mockReturnValue(mockPopup);

    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { url: 'https://accounts.google.com/oauth', provider: 'google' },
      error: null,
    } as any);

    await signInWithGoogle();

    expect(mockCallback).not.toHaveBeenCalled();
    expect(mockPopup.location.href).toBe('https://accounts.google.com/oauth');
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('popup=1'),
        }),
      })
    );
  });
});
