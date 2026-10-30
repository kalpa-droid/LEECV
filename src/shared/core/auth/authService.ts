import { supabase } from '../lib/supabaseClient';
import { UserProfile } from '../../../types/user';

/** Fila que devuelve la función `claim_credits_on_auth` (siempre una sola). */
export type ClaimCreditsResult = {
  credits_claimed: number;
  rows_claimed: number;
  guest_tokens_linked: number;
  matched_email: string;
};

/**
 * Traslada a la cuenta los créditos que se pagaron con su email antes de que
 * existiera la cuenta, y vincula los tokens de invitado del mismo email.
 *
 * Es idempotente: se puede llamar en cada inicio de sesión sin duplicar saldo.
 * Nunca lanza ni bloquea el ingreso: si el reclamo falla (por ejemplo, porque
 * la función todavía no está creada en la base) se registra el aviso y sigue.
 */
export async function claimCreditsOnAuth(
  user: { id?: string | null; email?: string | null } | null | undefined
): Promise<ClaimCreditsResult | null> {
  if (!supabase || !user?.id || !user.email) return null;
  try {
    const { data, error } = await supabase
      .rpc('claim_credits_on_auth', {
        p_user_id: user.id,
        p_email: user.email,
      })
      .maybeSingle();

    if (error) {
      console.warn('[auth] No se pudieron reclamar los créditos del email:', error.message);
      return null;
    }
    return (data as ClaimCreditsResult | null) ?? null;
  } catch (err) {
    console.warn('[auth] Error inesperado al reclamar créditos:', err);
    return null;
  }
}

/**
 * Envía un código de un solo uso al email, sin contraseña.
 * Si el email todavía no tiene cuenta, se crea en ese momento.
 * Lanza el error de Supabase si el envío falla, para que la pantalla pueda
 * mostrar el motivo (email inválido, límite de envíos, etc.).
 */
export async function requestOtp(email: string) {
  if (!supabase) throw new Error('Supabase no está configurado (faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
  return data;
}

/**
 * Confirma el código recibido por email e inicia sesión.
 * Después de validar el código se reclaman los créditos pendientes de ese email.
 */
export async function verifyOtp(email: string, token: string) {
  if (!supabase) throw new Error('Supabase no está configurado (faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  if (error) throw error;

  const user = data.user ?? data.session?.user ?? null;
  if (user) await claimCreditsOnAuth(user);

  return { user, session: data.session };
}

/**
 * Inicia sesión con email y contraseña (sólo para el panel de administración).
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

  // Al restaurar la sesión (o al volver de un login) se reclaman los créditos
  // pendientes del email. Es idempotente y no frena la lectura del perfil.
  await claimCreditsOnAuth(user);

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
