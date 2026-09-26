// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthCallbackScreen } from '../src/shared/core/auth/AuthCallbackScreen';
import * as authService from '../src/shared/core/auth/authService';
import { supabase } from '../src/shared/core/lib/supabaseClient';
import { navigation } from '../src/shared/core/utils/navigation';

vi.mock('../src/shared/core/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('../src/shared/core/auth/authService', () => ({
  capturarConexionDriveSiCorresponde: vi.fn().mockResolvedValue(true),
}));

vi.mock('../src/shared/core/utils/navigation', () => ({
  navigation: {
    goTo: vi.fn(),
    cleanQueryParams: vi.fn(),
  },
}));

const flush = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });
};

describe('AuthCallbackScreen', () => {
  let root: Root;
  const originalClose = window.close;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="root"></div>';
    root = createRoot(document.getElementById('root')!);
    window.close = vi.fn();
    delete (window as any).location;
    window.location = { search: '', href: '', hash: '' } as any;
    window.name = '';
    (window as any).opener = null;
  });

  afterEach(() => {
    window.close = originalClose;
    vi.unstubAllGlobals();
  });

  it('procesa la sesión, dispara la captura de Drive y llama window.close() si window.name === "google-oauth-popup"', async () => {
    window.name = 'google-oauth-popup';
    window.location.search = '';
    const mockSession = { user: { id: 'user-1' } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession as any },
      error: null,
    });

    const postMessageMock = vi.fn();
    class MockBroadcastChannel {
      postMessage = postMessageMock;
      close = vi.fn();
    }
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);

    await act(async () => {
      root.render(<AuthCallbackScreen />);
    });
    await flush();

    expect(authService.capturarConexionDriveSiCorresponde).toHaveBeenCalledWith(mockSession);
    expect(postMessageMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'AUTH_COMPLETE' }));
    expect(window.close).toHaveBeenCalled();
    root.unmount();
  });

  it('redirige a / si NO contiene ?popup=1', async () => {
    window.location.search = '';
    const mockSession = { user: { id: 'user-1' } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession as any },
      error: null,
    });

    await act(async () => {
      root.render(<AuthCallbackScreen />);
    });
    await flush();

    expect(navigation.goTo).toHaveBeenCalledWith('/');
    expect(window.close).not.toHaveBeenCalled();
    root.unmount();
  });

  it('traduce el error "Unable to exchange external code" y muestra el botón de reintento', async () => {
    window.location.search = '?error=server_error&error_description=Unable+to+exchange+external+code:+4/0A';
    
    await act(async () => {
      root.render(<AuthCallbackScreen />);
    });
    await flush();

    expect(document.body.textContent).toContain('No pudimos verificar tu inicio de sesión con Google. Por favor, intentá nuevamente.');
    expect(document.body.textContent).toContain('Reintentar con Google');
    root.unmount();
  });

  it('limpia los query params al volver al inicio si no es popup', async () => {
    window.location.search = '?error=access_denied';
    window.name = '';
    
    const cleanQueryParamsSpy = vi.spyOn(navigation, 'cleanQueryParams');

    await act(async () => {
      root.render(<AuthCallbackScreen />);
    });
    await flush();

    const returnBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Volver al inicio'
    );
    expect(returnBtn).toBeTruthy();

    await act(async () => {
      returnBtn!.click();
    });

    expect(cleanQueryParamsSpy).toHaveBeenCalled();
    expect(navigation.goTo).toHaveBeenCalledWith('/');
    root.unmount();
  });
});
