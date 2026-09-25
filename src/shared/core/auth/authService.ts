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

/**
 * Inicia sesión / registro con Google OAuth. Pide también permiso de Drive
 * (solo archivos que la propia app crea, no todo el Drive) con acceso offline.
 */
export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase no está configurado');
  const redirectUrl = navigation.getOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
      scopes: 'https://www.googleapis.com/auth/drive.file',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  if (error) {
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
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      data.url,
      'google-oauth-popup',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    if (!popup) {
      window.location.href = data.url;
    }
  }
  return data;
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

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error leyendo perfil:', error);
    return null;
  }
  
  return {
    ...profile,
    avatar_url: user.user_metadata?.avatar_url,
    name: user.user_metadata?.full_name || user.user_metadata?.name,
  } as UserProfile;
}

export function onAuthStateChange(callback: (user: any) => void) {
  if (!supabase) return { data: { subscription: { unsubscribe() {} } } };
  return supabase.auth.onAuthStateChange((_event, session) => callback(session?.user ?? null));
}
