import { supabase } from '../../shared/core/lib/supabaseClient';
import { dal } from '../../shared/core/storage/dataAccessLayer';
import { apiClient } from '../../shared/core/utils/apiClient';
import { UserProfile, UserPlan } from '../../types/user';
import { PaymentClaim } from '../../types/payments';
import { Organization } from '../../types/organization';

export async function listAllUsers(searchQuery: string = '', planFilter: string = 'all'): Promise<UserProfile[]> {
  return await dal.profiles.listAll(searchQuery, planFilter);
}

export async function setUserPlan(userId: string, plan: UserPlan, vence: string | null = null): Promise<UserProfile> {
  const patch: Partial<UserProfile> = {
    plan,
    plan_vence: vence,
    premium_activo: plan !== 'free',
  };

  const updated = await dal.profiles.update(userId, patch);
  if (!updated) throw new Error('No se pudo actualizar el plan del usuario');
  await logAdminAction('set_user_plan', userId, { plan, vence });
  return updated;
}

export async function setPremium(userId: string, activo: boolean, vence: string | null = null, plan: UserPlan = 'pro'): Promise<UserProfile> {
  const targetPlan: UserPlan = activo ? plan : 'free';
  return await setUserPlan(userId, targetPlan, vence);
}

export async function getPlatformMetrics() {
  return await dal.profiles.getPlatformMetrics();
}

export const listUsers = listAllUsers;
export const getBasicStats = getPlatformMetrics;

export async function listAuditLogs(searchQuery: string = '') {
  return await dal.adminAuditLogs.list(searchQuery);
}

export async function listAdminNotifications() {
  return await dal.adminNotifications.list();
}

export async function markNotificationRead(id: string): Promise<void> {
  await dal.adminNotifications.markRead(id);
}

export async function listPendingClaims(): Promise<PaymentClaim[]> {
  return await dal.paymentClaims.listPending();
}

export async function reviewManualClaim(claimId: string, approve: boolean) {
  const { ok, data, error } = await apiClient.post('/api/approve-manual-claim', { claimId, approve });
  if (!ok) throw new Error(error || 'Error revisando comprobante');
  return data;
}

export async function sendRetentionOffer(userId: string, { discountPercent = 50, validDays = 7, planAtOffer = 'enterprise' } = {}): Promise<void> {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validDays);

  await dal.retentionOffers.insert({
    user_id: userId,
    plan_at_offer: planAtOffer,
    discount_percent: discountPercent,
    valid_until: validUntil.toISOString(),
  });

  await dal.adminNotifications.insert({
    type: 'retention_offer_sent',
    title: 'Oferta de retención enviada',
    detail: `${discountPercent}% off por ${validDays} días, plan ${planAtOffer}`,
    user_id: userId,
  });
}

export async function listDriveConnections(): Promise<UserProfile[]> {
  return await dal.profiles.listConnectedDrives();
}

export async function disconnectUserDrive(userId: string) {
  const { ok, data, error } = await apiClient.post('/api/drive/disconnect', { targetUserId: userId });
  if (!ok) throw new Error(error || 'No se pudo desconectar Drive');
  await logAdminAction('disconnect_user_drive', userId);
  return data;
}

export async function listOrganizationsStorage(): Promise<Organization[]> {
  return await dal.organizations.list();
}

export async function getIntegrationsStatus(forcePing = false) {
  const query = forcePing ? '?forcePing=true' : '';
  const { ok, data, error } = await apiClient.get(`/api/admin/integrations-status${query}`);
  if (!ok) throw new Error(error || 'Error al obtener estado de pasarelas');
  return data;
}

export async function listProcessedPayments({ page = 0, limit = 50, provider = 'all', q = '' } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (provider) params.set('provider', provider);
  if (q) params.set('q', q);

  const { ok, data, error } = await apiClient.get(`/api/admin/list-processed-payments?${params.toString()}`);
  if (!ok) throw new Error(error || 'Error al consultar historial de pagos');
  return data;
}

export async function logAdminAction(actionType: string, targetUserId: string | null = null, details: object = {}): Promise<void> {
  try {
    const userRes = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    const userId = userRes.data?.user?.id || 'system';
    await dal.adminAuditLogs.log(userId, actionType, targetUserId, details);
  } catch (err) {
    console.warn('Error guardando auditoría:', err);
  }
}
