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

  it('ejecuta el hook globalBeforeRedirect cuando window.open retorna null (popup bloqueado)', async () => {
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
  });

  it('no ejecuta el hook globalBeforeRedirect si window.open es exitoso (popup abierto)', async () => {
    const mockCallback = vi.fn().mockResolvedValue(undefined);
    setGlobalBeforeRedirect(mockCallback);

    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { url: 'https://accounts.google.com/oauth', provider: 'google' },
      error: null,
    } as any);

    // Mock popup exitoso
    window.open = vi.fn().mockReturnValue({ focus: vi.fn() } as any);

    await signInWithGoogle();

    expect(mockCallback).not.toHaveBeenCalled();
  });
});
