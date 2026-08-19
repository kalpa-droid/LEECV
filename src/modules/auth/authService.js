import { supabase } from '../../shared/core/lib/supabaseClient';

/**
 * Inicia sesión con email y contraseña.
 * (El alta de usuarios se hace con supabase.auth.signUp en tu formulario de registro,
 *  o directamente desde el Dashboard de Supabase para arrancar).
 */
export async function login(email, password) {
  if (!supabase) throw new Error('Supabase no está configurado (faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function logout() {
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

/** Devuelve el usuario logueado (o null) junto a su fila de la tabla profiles (rol, premium, etc). */
export async function getCurrentProfile() {
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
  return profile;
}

export function onAuthStateChange(callback) {
  if (!supabase) return { data: { subscription: { unsubscribe() {} } } };
  return supabase.auth.onAuthStateChange((_event, session) => callback(session?.user ?? null));
}
