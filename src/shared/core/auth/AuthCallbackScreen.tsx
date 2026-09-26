import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { capturarConexionDriveSiCorresponde, retrySignInInCurrentWindow } from './authService';
import { navigation } from '../utils/navigation';

export const AuthCallbackScreen: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'completed' | 'error'>('loading');

  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace('#', '?')); // URLSearchParams expects ?
  const errorParam = params.get('error') || hashParams.get('error');
  const errorDescription = params.get('error_description') || hashParams.get('error_description') || 'Hubo un problema al procesar el inicio de sesión.';

  const isPopup = 
    window.name === 'google-oauth-popup' ||
    !!window.opener ||
    params.get('popup') === '1' ||
    window.location.hash.includes('access_token=') ||
    window.location.hash.includes('error=');

  useEffect(() => {
    let mounted = true;

    async function processCallback() {
      if (errorParam) {
        if (mounted) setStatus('error');
        return;
      }

      try {
        if (!supabase) throw new Error('Supabase no está configurado');
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          await capturarConexionDriveSiCorresponde(session);
        }

        // Emitir señal por BroadcastChannel y localStorage fallback
        try {
          const channel = new BroadcastChannel('leecv-auth');
          channel.postMessage({ type: 'AUTH_COMPLETE', timestamp: Date.now() });
          channel.close();
        } catch (e) {
          // Fallback para entornos sin BroadcastChannel
        }

        try {
          localStorage.setItem('leecv_auth_signal', Date.now().toString());
        } catch (e) {
          // ignore
        }

        if (!mounted) return;
        setStatus('completed');

        if (isPopup) {
          window.close();
        } else {
          navigation.goTo('/');
        }
      } catch (err) {
        console.error('Error en AuthCallbackScreen:', err);
        if (mounted) setStatus('error');
      }
    }

    processCallback();

    return () => {
      mounted = false;
    };
  }, [errorParam, isPopup]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] flex flex-col items-center justify-center font-sans p-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[var(--color-accent-base)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Finalizando inicio de sesión...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    const isStateExpired = errorDescription.toLowerCase().includes('oauth state has expired') || errorDescription.toLowerCase().includes('timeout');
    const displayError = isStateExpired 
      ? 'El tiempo para iniciar sesión expiró o la ventana estuvo abierta demasiado tiempo.' 
      : errorDescription.replace(/\+/g, ' ');

    return (
      <div className="min-h-screen bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] flex flex-col items-center justify-center font-sans p-4 text-center">
        <p className="text-sm font-medium text-[var(--color-accent-rose-bright)] mb-4">
          {displayError}
        </p>
        <div className="flex flex-col gap-3 items-center">
          {isStateExpired && (
            <button
              onClick={() => retrySignInInCurrentWindow().catch(console.error)}
              className="px-4 py-2 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] rounded-xl text-sm font-semibold transition-colors cursor-pointer w-full max-w-xs"
            >
              Reintentar con Google
            </button>
          )}
          <button
            onClick={() => isPopup ? window.close() : navigation.goTo('/')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer w-full max-w-xs ${
              isStateExpired 
                ? 'bg-transparent border-2 border-[var(--ui-text-secondary)] text-[var(--ui-text-primary)] hover:bg-[var(--ui-bg-surface)]' 
                : 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]'
            }`}
          >
            {isPopup ? 'Cerrar ventana' : 'Volver al inicio'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] flex flex-col items-center justify-center font-sans p-4 text-center">
      <div className="w-12 h-12 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] flex items-center justify-center mb-4 text-xl font-bold">
        ✓
      </div>
      <h1 className="text-lg font-bold mb-2">¡Sesión iniciada correctamente!</h1>
      <p className="text-sm text-[var(--ui-text-secondary)] mb-6">Ya podés cerrar esta pestaña para volver a la aplicación.</p>
      <button
        onClick={() => window.close()}
        className="px-5 py-2.5 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] rounded-xl text-sm font-semibold transition-colors cursor-pointer shadow-[var(--shadow-card)]"
      >
        Cerrar ventana
      </button>
    </div>
  );
};

export default AuthCallbackScreen;
