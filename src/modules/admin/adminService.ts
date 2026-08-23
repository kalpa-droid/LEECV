import { supabase } from '../../shared/core/lib/supabaseClient';
import { apiClient } from '../../shared/core/utils/apiClient';
import { UserProfile, UserPlan } from '../../types/user';
import { PaymentClaim } from '../../types/payments';
import { Organization } from '../../types/organization';

export async function listAllUsers(searchQuery: string = '', planFilter: string = 'all'): Promise<UserProfile[]> {
  if (!supabase) return [];
  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

  if (searchQuery) {
    query = query.or(`email.ilike.%${searchQuery}%,id.ilike.%${searchQuery}%`);
  }

  if (planFilter && planFilter !== 'all') {
    query = query.eq('plan', planFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as UserProfile[];
}

export async function setUserPlan(userId: string, plan: UserPlan, vence: string | null = null): Promise<UserProfile> {
  if (!supabase) throw new Error('Supabase no configurado');
  const patch: Partial<UserProfile> = {
    plan,
    plan_vence: vence,
    premium_activo: plan !== 'free',
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  await logAdminAction('set_user_plan', userId, { plan, vence });
  return data as UserProfile;
}

export async function setPremium(userId: string, activo: boolean, vence: string | null = null, plan: UserPlan = 'pro'): Promise<UserProfile> {
  const targetPlan: UserPlan = activo ? plan : 'free';
  return await setUserPlan(userId, targetPlan, vence);
}

export async function getPlatformMetrics() {
  if (!supabase) return { totalUsers: 0, proUsers: 0, enterpriseUsers: 0, activeSubscriptions: 0 };
  const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const { count: proUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('plan', 'pro');
  const { count: enterpriseUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('plan', 'enterprise');

  return {
    totalUsers: totalUsers || 0,
    proUsers: proUsers || 0,
    enterpriseUsers: enterpriseUsers || 0,
    activeSubscriptions: (proUsers || 0) + (enterpriseUsers || 0),
  };
}

export const listUsers = listAllUsers;
export const getBasicStats = getPlatformMetrics;

export async function listAuditLogs(searchQuery: string = '') {
  if (!supabase) return [];
  let query = supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false });

  if (searchQuery) {
    query = query.or(`action.ilike.%${searchQuery}%,performed_by.ilike.%${searchQuery}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function listAdminNotifications() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('admin_notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

export async function listPendingClaims(): Promise<PaymentClaim[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('payment_claims')
    .select('*')
    .eq('status', 'pendiente')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as PaymentClaim[];
}

export async function reviewManualClaim(claimId: string, approve: boolean) {
  if (!supabase) throw new Error('Supabase no configurado');
  const { ok, data, error } = await apiClient.post('/api/approve-manual-claim', { claimId, approve });
  if (!ok) throw new Error(error || 'Error revisando comprobante');
  return data;
}

export async function sendRetentionOffer(userId: string, { discountPercent = 50, validDays = 7, planAtOffer = 'enterprise' } = {}): Promise<void> {
  if (!supabase) return;
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

export async function listDriveConnections(): Promise<UserProfile[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, plan, drive_connected, drive_quota_percent, drive_last_checked_at')
    .eq('drive_connected', true)
    .order('drive_quota_percent', { ascending: false });
  if (error) throw error;
  return (data || []) as UserProfile[];
}

export async function disconnectUserDrive(userId: string) {
  if (!supabase) throw new Error('Supabase no configurado');
  const { ok, data, error } = await apiClient.post('/api/drive/disconnect', { targetUserId: userId });
  if (!ok) throw new Error(error || 'No se pudo desconectar Drive');
  await logAdminAction('disconnect_user_drive', userId);
  return data;
}

export async function listOrganizationsStorage(): Promise<Organization[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, owner_id, max_members, storage_limit_mb, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Organization[];
}

export async function logAdminAction(actionType: string, targetUserId: string | null = null, details: object = {}): Promise<void> {
  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('admin_audit_logs').insert({
      performed_by: user?.id || 'system',
      action: actionType,
      target_user_id: targetUserId,
      details,
    });
  } catch (err) {
    console.warn('Error guardando auditoría:', err);
  }
}
