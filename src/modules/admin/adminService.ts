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

export async function sendRetentionOffer(userId: string, { discountPercent = 50, validDays = 7, planAtOffer = 'pro' } = {}): Promise<void> {
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



export async function getIntegrationsStatus(forcePing = false) {
  const query = forcePing ? '?forcePing=true' : '';
  try {
    const { ok, data, error } = await apiClient.get(`/api/admin/integrations-status${query}`);
    if (ok && data) return data;
    console.warn('[adminService] Integrations API no disponible o no autenticada:', error);
  } catch (err) {
    console.warn('[adminService] Excepción en getIntegrationsStatus:', err);
  }
  return {
    mercadopago: { status: 'checking', label: 'Sin respuesta del backend (local/offline)' },
    paypal: { status: 'checking', label: 'Sin respuesta del backend (local/offline)' },
  };
}

export async function listProcessedPayments({ page = 0, limit = 50, provider = 'all', q = '' } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (provider) params.set('provider', provider);
  if (q) params.set('q', q);

  try {
    const { ok, data, error } = await apiClient.get(`/api/admin/list-processed-payments?${params.toString()}`);
    if (ok && data) return data;
    console.warn('[adminService] listProcessedPayments API no disponible:', error);
  } catch (err) {
    console.warn('[adminService] Excepción en listProcessedPayments:', err);
  }
  return { payments: [], totalCount: 0, page, pageSize: limit };
}

export async function listCustomers({ page = 0, limit = 50, q = '' } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (q) params.set('q', q);

  try {
    const { ok, data, error } = await apiClient.get(`/api/admin/list-customers?${params.toString()}`);
    if (ok && data) return data;
    console.warn('[adminService] listCustomers API no disponible o falló:', error, 'Activando fallback a Supabase DAL...');
  } catch (err) {
    console.warn('[adminService] Excepción de red en listCustomers:', err);
  }

  // Fallback resiliente a Supabase DAL (resuelve entornos localhost sin funciones serverless o fallos de red)
  try {
    const rawUsers = await dal.profiles.listAll(q);
    const start = page * limit;
    const paginated = rawUsers.slice(start, start + limit);
    return {
      customers: paginated.map((c: any) => ({
        id: c.id,
        email: c.email,
        plan: c.plan || 'free',
        role: c.role || 'user',
        createdAt: c.created_at,
        pdfExportTokens: 0,
        pdfExportAccessMode: c.pdf_export_access_mode || 'automatic',
        aiCredits: 0,
      })),
      totalCount: rawUsers.length,
      page,
      pageSize: limit,
    };
  } catch (fallbackErr) {
    console.error('[adminService] Fallback de lista de clientes falló:', fallbackErr);
    return { customers: [], totalCount: 0, page, pageSize: limit };
  }
}

export async function setPdfExportAccess(userId: string, accessMode: string, reason: string) {
  const { ok, data, error } = await apiClient.post('/api/admin/set-pdf-export-access', {
    userId,
    accessMode,
    reason,
  });
  if (!ok) throw new Error(error || 'Error al actualizar el acceso a exportación PDF');
  return data;
}

export async function listPendingGrants({ page = 0, limit = 20 } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));

  try {
    const { ok, data, error } = await apiClient.get(`/api/admin/list-pending-grants?${params.toString()}`);
    if (ok && data) return data;
    console.warn('[adminService] listPendingGrants API no disponible:', error);
  } catch (err) {
    console.warn('[adminService] Excepción en listPendingGrants:', err);
  }
  return { grants: [], totalCount: 0, page, pageSize: limit };
}

export async function resolvePendingGrant({
  grantId,
  targetEmail,
  reason,
  approveAmountMismatch,
}: {
  grantId: string;
  targetEmail: string;
  reason: string;
  approveAmountMismatch: boolean;
}) {
  const { ok, data, error } = await apiClient.post('/api/admin/resolve-pending-grant', {
    grantId,
    targetEmail,
    reason,
    approveAmountMismatch,
  });
  if (!ok) throw new Error(error || 'Error al resolver el pago retenido');
  return data;
}

export async function getAiProvidersStatus() {
  const env = (import.meta as any).env || {};
  const hasGroqKey = !!env.VITE_GROQ_API_KEY || (typeof process !== 'undefined' && !!process.env?.GROQ_API_KEY);
  const hasGeminiKey = !!env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' && !!process.env?.GEMINI_API_KEY);

  return {
    groq: {
      status: hasGroqKey ? 'active' : 'missing_vars',
      label: hasGroqKey ? 'Groq Llama 3 / Mixtral API Online' : 'VITE_GROQ_API_KEY no configurada',
      provider: 'Groq Cloud API'
    },
    gemini: {
      status: hasGeminiKey ? 'active' : 'missing_vars',
      label: hasGeminiKey ? 'Gemini 1.5 Pro / Flash API Online' : 'VITE_GEMINI_API_KEY no configurada',
      provider: 'Google AI Studio API'
    }
  };
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

export async function listAiTelemetry(limit: number = 100, filters?: { from?: string; endpoint?: string }) {
  return await dal.aiTelemetry.list(limit, filters);
}

export async function getAiTelemetryStats() {
  return await dal.aiTelemetry.getAggregatedStats();
}
