import { supabase } from './cvStorageService';

/** Lista todos los usuarios (requiere que quien llama sea role='admin', lo filtra la policy de RLS). */
export async function listUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, premium_activo, premium_vence, metodo_pago, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Activa o desactiva premium a mano (para pagos por transferencia/efectivo, como mencionaste). */
export async function setPremium(userId, activo, vence = null) {
  const { error } = await supabase
    .from('profiles')
    .update({ premium_activo: activo, premium_vence: vence, metodo_pago: activo ? 'manual' : null })
    .eq('id', userId);
  if (error) throw error;
}

/** Métricas simples: total de usuarios y cuántos son premium. (Los CVs creados/descargas los tenés en localStorage
 *  por diseño actual — si querés esa métrica agregada real, hay que empezar a loguear esos eventos en Supabase). */
export async function getBasicStats() {
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { count: premiumUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('premium_activo', true);

  return { totalUsers: totalUsers ?? 0, premiumUsers: premiumUsers ?? 0 };
}
