// @vitest-environment jsdom
import React, { act, useEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../src/shared/core/auth/AuthProvider';
import * as authService from '../src/shared/core/auth/authService';
import { supabase } from '../src/shared/core/lib/supabaseClient';

let authStateCallback: any = null;

vi.mock('../src/shared/core/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((cb) => {
        authStateCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    }
  }
}));

vi.mock('../src/shared/core/auth/authService', () => ({
  getCurrentProfile: vi.fn(),
  signInWithGoogle: vi.fn(),
  logout: vi.fn(),
}));

let stateCopy: any = {};
function TestComponent() {
  const { user: currentProfile, isLoggedIn, loading, login, logout } = useAuth();
  useEffect(() => {
    stateCopy = { currentProfile, isLoggedIn, loading, login, logout };
  });
  return <div>dummy</div>;
}

const flush = async () => { await act(async () => { await new Promise(r => setTimeout(r, 10)); }); };

describe('AuthProvider', () => {
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    stateCopy = {};
    document.body.innerHTML = '<div id="root"></div>';
    root = createRoot(document.getElementById('root')!);
  });

  it('provides default unauthenticated state initially', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(null);

    await act(async () => {
      root.render(<AuthProvider><TestComponent /></AuthProvider>);
    });
    await flush();

    expect(stateCopy.isLoggedIn).toBe(false);
    expect(stateCopy.currentProfile).toBeNull();
    expect(stateCopy.loading).toBe(false);
    root.unmount();
  });

  it('provides authenticated state when profile is returned', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue({ id: 'user-123', email: 'test@example.com' } as any);

    await act(async () => {
      root.render(<AuthProvider><TestComponent /></AuthProvider>);
    });
    await flush();

    expect(stateCopy.isLoggedIn).toBe(true);
    expect(stateCopy.currentProfile?.id).toBe('user-123');
    expect(stateCopy.loading).toBe(false);
    root.unmount();
  });

  it('subscribes to auth state changes on mount', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(null);

    await act(async () => {
      root.render(<AuthProvider><TestComponent /></AuthProvider>);
    });
    await flush();

    expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
    root.unmount();
  });

  it('Login invoca el motor compartido (Popup OAuth) exitosamente', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue(null);
    vi.mocked(authService.signInWithGoogle).mockResolvedValue();

    await act(async () => {
      root.render(<AuthProvider><TestComponent /></AuthProvider>);
    });
    await flush();

    await act(async () => {
      await stateCopy.login();
    });

    expect(authService.signInWithGoogle).toHaveBeenCalled();
    root.unmount();
  });

  it('Validar que la conexión a Drive se activa una vez logueado (mock property)', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue({ id: 'user-123', drive_connected: true } as any);

    await act(async () => {
      root.render(<AuthProvider><TestComponent /></AuthProvider>);
    });
    await flush();

    expect(stateCopy.currentProfile?.drive_connected).toBe(true);
    root.unmount();
  });

  it('Logout resetea estados y no dispara window.location.reload()', async () => {
    vi.mocked(authService.getCurrentProfile).mockResolvedValue({ id: 'user-123' } as any);
    vi.mocked(authService.logout).mockResolvedValue();

    await act(async () => {
      root.render(<AuthProvider><TestComponent /></AuthProvider>);
    });
    await flush();

    expect(stateCopy.isLoggedIn).toBe(true);

    await act(async () => {
      await stateCopy.logout();
      // Simulate Supabase firing SIGNED_OUT event
      vi.mocked(authService.getCurrentProfile).mockResolvedValue(null);
      if (authStateCallback) authStateCallback('SIGNED_OUT', null);
    });
    await flush();

    expect(authService.logout).toHaveBeenCalled();
    expect(stateCopy.isLoggedIn).toBe(false);
    expect(stateCopy.currentProfile).toBeNull();

    root.unmount();
  });
});
