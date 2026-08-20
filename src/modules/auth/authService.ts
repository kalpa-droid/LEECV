import { supabase } from '../../shared/core/lib/supabaseClient';
import { UserProfile } from '../../types/user';
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
  const redirectUrl = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://leecv.vercel.app';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      scopes: 'https://www.googleapis.com/auth/drive.file',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Se llama después del redirect de login. Google solo manda provider_refresh_token
 * la primera vez que el usuario da consentimiento.
 */
export async function capturarConexionDriveSiCorresponde(session: Session | null): Promise<boolean> {
  if (!session?.provider_refresh_token) return false;

  try {
    await fetch('/api/drive/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ refreshToken: session.provider_refresh_token }),
    });
    return true;
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
  return profile as UserProfile;
}

export function onAuthStateChange(callback: (user: any) => void) {
  if (!supabase) return { data: { subscription: { unsubscribe() {} } } };
  return supabase.auth.onAuthStateChange((_event, session) => callback(session?.user ?? null));
}
