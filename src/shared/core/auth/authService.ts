import { supabase } from '../lib/supabaseClient';
import { navigation } from '../utils/navigation';
import { apiClient } from '../utils/apiClient';
import { UserProfile } from '../../../types/user';
import { Session } from '@supabase/supabase-js';

/**
 * Inicia sesión con email y contraseña.
 */
export async function login(email: string, password: string) {
  if (!supabase) throw new Error('Supabase no está configurado (faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

let globalBeforeRedirect: (() => Promise<void>) | null = null;

export function setGlobalBeforeRedirect(callback: (() => Promise<void>) | null) {
  globalBeforeRedirect = callback;
}

let isSignInInProgress = false;

/**
 * Inicia sesión / registro con Google OAuth. Pide también permiso de Drive
 * (solo archivos que la propia app crea, no todo el Drive) con acceso offline.
 */
export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase no está configurado');
  if (isSignInInProgress) {
    console.warn('El inicio de sesión ya está en progreso');
    return null;
  }
  isSignInInProgress = true;

  try {
    const origin = navigation.getOrigin();

    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    // Abrir popup de forma síncrona dentro del gesto de click del usuario para evitar bloqueos
    const popup = window.open(
      'about:blank',
      'google-oauth-popup',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    const isPopupMode = !!popup;
    const callbackUrl = `${origin}/auth/callback${isPopupMode ? '?popup=1' : ''}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
        skipBrowserRedirect: true,
        scopes: 'https://www.googleapis.com/auth/drive.file',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      if (popup) popup.close();
      const msg = error.message || String(error);
      if (
        (error as any).code === 'validation_failed' ||
        msg.includes('validation_failed') ||
        msg.toLowerCase().includes('provider is not enabled') ||
        msg.toLowerCase().includes('unsupported provider')
      ) {
        throw new Error('El inicio de sesión con Google no está disponible en este momento. Probá con tu correo electrónico.');
      }
      throw error;
    }

    if (data?.url) {
      if (isPopupMode && popup) {
        popup.location.href = data.url;
      } else {
        if (globalBeforeRedirect) {
          try {
            await globalBeforeRedirect();
          } catch (e) {
            console.error('Error in globalBeforeRedirect hook:', e);
          }
        }
        window.location.href = data.url;
      }
    } else if (popup) {
      popup.close();
    }

    return data;
  } finally {
    // Liberar el candado después de un corto retraso para evitar clics dobles rápidos
    setTimeout(() => {
      isSignInInProgress = false;
    }, 2000);
  }
}

/**
 * Se utiliza para reintentar el inicio de sesión desde una ventana popup que ya
 * está abierta (ej. después de un error "OAuth state has expired").
 */
export async function retrySignInInCurrentWindow() {
  if (!supabase) throw new Error('Supabase no está configurado');
  const origin = navigation.getOrigin();
  const callbackUrl = `${origin}/auth/callback?popup=1`; // Mantiene la marca de popup

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl,
      skipBrowserRedirect: true,
      scopes: 'https://www.googleapis.com/auth/drive.file',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;
  
  if (data?.url) {
    window.location.href = data.url;
  }
}

/**
 * Se llama después del redirect de login. Google solo manda provider_refresh_token
 * la primera vez que el usuario da consentimiento.
 */
export async function capturarConexionDriveSiCorresponde(session: Session | null): Promise<boolean> {
  if (!session?.provider_refresh_token) return false;

  try {
    const { ok } = await apiClient.post('/api/drive/connect', { refreshToken: session.provider_refresh_token });
    return ok;
  } catch (err) {
    console.warn('No se pudo guardar la conexión con Drive:', err);
    return false;
  }
}

export async function logout(): Promise<void> {
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('SignOut error:', err);
    }
  }
  // Limpieza total de tokens JWT y sesiones de autenticación
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase.auth')) {
          localStorage.removeItem(key);
        }
      });
    }
  } catch {}
}

/** Devuelve el usuario logueado (o null) junto a su fila de la tabla profiles. */
export async function getCurrentProfile(): Promise<UserProfile | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error leyendo perfil:', error);
    
    // Crear fallback y hacer upsert
    const fallbackProfile = {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario',
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
      drive_connected: false,
      created_at: user.created_at || new Date().toISOString(),
    };
    
    // Upsert asincrono para evitar bloquear el UI
    supabase.from('profiles').upsert(fallbackProfile).then(({ error: upsertError }) => {
      if (upsertError) {
        console.error('Error creando perfil de respaldo:', upsertError);
      }
    });

    profile = fallbackProfile;
  }
  
  return {
    ...profile,
    avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture,
    name: profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name,
  } as UserProfile;
}

export function onAuthStateChange(callback: (user: any) => void) {
  if (!supabase) return { data: { subscription: { unsubscribe() {} } } };
  return supabase.auth.onAuthStateChange((_event, session) => callback(session?.user ?? null));
}
