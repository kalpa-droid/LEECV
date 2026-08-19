import { supabase } from '../../shared/core/lib/supabaseClient';

/** Lista todos los usuarios (requiere rol admin por RLS). */
export async function listUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, plan, plan_vence, premium_activo, premium_vence, metodo_pago, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Asigna un plan (free, pro, enterprise) manualmente a un usuario. */
export async function setUserPlan(userId, plan = 'pro', vence = null) {
  const isActivo = plan !== 'free';
  const { error } = await supabase
    .from('profiles')
    .update({ 
      plan, 
      plan_vence: vence, 
      premium_activo: isActivo, 
      premium_vence: vence, 
      metodo_pago: isActivo ? 'manual' : null 
    })
    .eq('id', userId);
  if (error) throw error;
}

export async function setPremium(userId, activo, vence = null) {
  return await setUserPlan(userId, activo ? 'pro' : 'free', vence);
}

/** Métricas básicas de usuarios y suscriptores. */
export async function getBasicStats() {
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { count: proUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .in('plan', ['pro', 'enterprise']);

  return { totalUsers: totalUsers ?? 0, premiumUsers: proUsers ?? 0 };
}
