import { supabase } from '../../shared/core/lib/supabaseClient';
import { safeSupabaseCall } from '../../shared/core/utils/safeSupabaseCall';

/** Lista todos los usuarios (requiere rol admin por RLS). */
export async function listUsers(searchQuery = '', page = 0, pageSize = 50) {
  let query = supabase
    .from('profiles')
    .select('id, email, role, plan, plan_vence, premium_activo, premium_vence, metodo_pago, created_at', { count: 'exact' });

  if (searchQuery) {
    query = query.ilike('email', `%${searchQuery}%`);
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { users: data || [], totalCount: count || 0 };
}

/** Asigna un plan (free, pro, enterprise) manualmente a un usuario con vencimiento por defecto a 30 días. */
export async function setUserPlan(userId, plan = 'pro', vence = null) {
  const isActivo = plan !== 'free';

  // Default +30 days expiration if active plan and no custom expiration provided
  let expirationDate = vence;
  if (isActivo && !expirationDate) {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    expirationDate = d.toISOString();
  }

  const { error } = await supabase
    .from('profiles')
    .update({ 
      plan, 
      plan_vence: isActivo ? expirationDate : null, 
      premium_activo: isActivo, 
      premium_vence: isActivo ? expirationDate : null, 
      metodo_pago: isActivo ? 'manual' : null 
    })
    .eq('id', userId);

  if (error) throw error;

  // Log admin action for audit
  await logAdminAction('set_user_plan', userId, { plan, expirationDate });
}

export async function setPremium(userId, activo, vence = null) {
  return await setUserPlan(userId, activo ? 'pro' : 'free', vence);
}

/** Oboge lista de reclamos de pago pendientes desde Supabase */
export async function listPendingClaims() {
  const res = await safeSupabaseCall(async () => {
    return await supabase
      .from('payment_claims')
      .select('*')
      .eq('status', 'pendiente')
      .order('created_at', { ascending: false });
  }, []);

  return res.data || [];
}

/** Aprueba reclamo de pago y activa licencia */
export async function approveClaimInDb(claimId, targetUserId, email) {
  const { data: { user } } = await supabase.auth.getUser();

  const { error: claimErr } = await supabase
    .from('payment_claims')
    .update({
      status: 'aprobado',
      reviewed_by: user?.id || null,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', claimId);

  if (claimErr) console.warn('Warning updating claim status:', claimErr);

  if (targetUserId) {
    await setPremium(targetUserId, true);
  }

  await logAdminAction('approve_payment_claim', targetUserId, { claimId, email });
}

/** Registra acciones administrativas en auditoría */
export async function logAdminAction(actionType, targetUserId = null, details = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('admin_audit_logs')
      .insert({
        admin_id: user.id,
        action_type: actionType,
        target_user_id: targetUserId,
        details
      });
  } catch (err) {
    console.warn('Could not log admin action:', err);
  }
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

/** Bandeja de avisos del panel: pagos automáticos, comprobantes pendientes, vencimientos. */
export async function listAdminNotifications({ onlyUnread = false, limit = 30 } = {}) {
  let query = supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (onlyUnread) query = query.eq('read', false);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function markNotificationRead(id) {
  const { error } = await supabase.from('admin_notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

/** Comprobantes manuales pendientes (transferencia, Payoneer, etc.) esperando revisión. */
export async function listPendingClaims() {
  const { data, error } = await supabase
    .from('payment_claims')
    .select('*')
    .eq('status', 'pendiente')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Aprueba o rechaza un comprobante manual — llama al endpoint que usa el núcleo applyPayment. */
export async function reviewManualClaim(claimId, approve) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch('/api/approve-manual-claim', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ claimId, approve }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error revisando comprobante');
  return data;
}

/**
 * Oferta de retención — pensada para Enterprise (donde perder al usuario
 * te cuesta el storage que le diste), NO para Premium Agencia (que guarda
 * en su propio Drive y no te genera costo de infraestructura al irse).
 */
export async function sendRetentionOffer(userId, { discountPercent = 50, validDays = 7, planAtOffer = 'enterprise' } = {}) {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validDays);

  const { error } = await supabase.from('retention_offers').insert({
    user_id: userId,
    plan_at_offer: planAtOffer,
    discount_percent: discountPercent,
    valid_until: validUntil.toISOString(),
  });
  if (error) throw error;

  await supabase.from('admin_notifications').insert({
    type: 'retention_offer_sent',
    title: 'Oferta de retención enviada',
    detail: `${discountPercent}% off por ${validDays} días, plan ${planAtOffer}`,
    user_id: userId,
  });
}
