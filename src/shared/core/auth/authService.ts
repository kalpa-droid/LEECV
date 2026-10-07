import { supabase } from '../lib/supabaseClient';
import { UserProfile } from '../../../types/user';

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
 * Registra un nuevo usuario con email y contraseña.
 */
export async function signup(email: string, password: string, fullName?: string) {
  if (!supabase) throw new Error('Supabase no está configurado');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      }
    }
  });
  if (error) throw error;
  return data.user;
}

/**
 * Solicita el restablecimiento de contraseña.
 */
export async function resetPasswordForEmail(email: string) {
  if (!supabase) throw new Error('Supabase no está configurado');
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/`,
  });
  if (error) throw error;
}

/**
 * Actualiza la contraseña del usuario actual.
 */
export async function updatePassword(password: string) {
  if (!supabase) throw new Error('Supabase no está configurado');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
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

export function onAuthStateChange(callback: (user: any, event?: string) => void) {
  if (!supabase) return { data: { subscription: { unsubscribe() {} } } };
  return supabase.auth.onAuthStateChange((event, session) => callback(session?.user ?? null, event));
}
