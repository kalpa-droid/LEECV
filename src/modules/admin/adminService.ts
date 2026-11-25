import { dal } from '../../shared/core/storage/dataAccessLayer';
import { apiClient } from '../../shared/core/utils/apiClient';
import { UserProfile, UserPlan } from '../../types/user';
import { PaymentClaim } from '../../types/payments';
import { Organization } from '../../types/organization';

export async function listAllUsers(searchQuery: string = '', planFilter: string = 'all'): Promise<UserProfile[]> {
  return await dal.profiles.listAll(searchQuery, planFilter);
}

export async function setUserPlan(userId: string, plan: UserPlan, vence: string | null = null): Promise<UserProfile> {
  // Server action: aplica el cambio con service_role y deja auditoría atómica
  // en admin_audit_logs (antes: UPDATE directo desde el navegador + log best-effort).
  const { ok, error } = await apiClient.post('/api/admin/set-plan', { userId, plan, vence });
  if (!ok) throw new Error(error || 'No se pudo actualizar el plan del usuario');
  const updated = await dal.profiles.getById(userId);
  if (!updated) throw new Error('No se pudo actualizar el plan del usuario');
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
export const getPublishedCvsCount = () => dal.publishedCvs.countAll();

export async function listAuditLogs(searchQuery: string = '') {
  return await dal.adminAuditLogs.list(searchQuery);
}

export async function listAdminNotifications() {
  return await dal.adminNotifications.list();
}

export async function markNotificationRead(id: string): Promise<void> {
  await dal.adminNotifications.markRead(id);
}

export async function markAllNotificationsRead(): Promise<void> {
  const ok = await dal.adminNotifications.markAllRead();
  if (!ok) throw new Error('No se pudieron marcar las notificaciones como leídas');
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
    telegram: { status: 'checking', label: 'Sin respuesta del backend (local/offline)' },
    resend: { status: 'checking', label: 'Sin respuesta del backend (local/offline)' },
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

/**
 * Acredita N créditos de exportación PDF a una cuenta desde el servidor
 * (RPC service_role `grant_export_tokens` + auditoría en admin_audit_logs).
 * Antes el panel llamaba la RPC desde el navegador, donde está
 * REVOKEada para `authenticated` → los botones +1/+5/+10 fallaban siempre.
 */
export async function grantExportTokens(userId: string, amount: number, reason?: string) {
  const { ok, data, error } = await apiClient.post('/api/admin/grant-export-tokens', {
    userId,
    amount,
    ...(reason ? { reason } : {}),
  });
  if (!ok) throw new Error(error || `No se pudo asignar +${amount} crédito(s)`);
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

export interface ReconcileSummary {
  scanned: number;
  applied: number;
  rejected: number;
  stillPending: number;
  escalated: number;
  errors: number;
}

export async function reconcilePendingPayments(): Promise<ReconcileSummary> {
  const { ok, data, error } = await apiClient.post('/api/admin/reconcile-payments', {});
  if (!ok) throw new Error(error || 'Error al reconciliar pagos');
  return (data as any)?.summary as ReconcileSummary;
}

export interface UnclaimedCreditRow {
  id: string;
  email: string;
  credits: number;
  provider: string | null;
  plan: string | null;
  amount: number | null;
  currency: string | null;
  created_at: string;
  reminder_sent_at: string | null;
}

export async function listUnclaimedCredits({ page = 0, limit = 20 } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));

  try {
    const { ok, data, error } = await apiClient.get(`/api/admin/list-unclaimed-credits?${params.toString()}`);
    if (ok && data) return data;
    console.warn('[adminService] listUnclaimedCredits API no disponible:', error);
  } catch (err) {
    console.warn('[adminService] Excepción en listUnclaimedCredits:', err);
  }
  return { credits: [] as UnclaimedCreditRow[], totalCount: 0, page, pageSize: limit };
}

export async function resendUnclaimedReminder(id: string): Promise<void> {
  const { ok, error } = await apiClient.post('/api/admin/resend-unclaimed-reminder', { id });
  if (!ok) throw new Error(error || 'Error al reenviar el recordatorio');
}

export interface AiProviderUiStatus {
  status: 'active' | 'missing_vars' | 'invalid_credentials' | 'error' | 'checking';
  label: string;
  model?: string;
  /** Cantidad de claves configuradas en el servidor para el motor. */
  configuredKeys: number;
  /** Claves pausadas temporalmente por límite de uso (cooldown). */
  pausedKeys: number;
  /** De dónde salió la verdad de las pausas: DB compartida, memoria local o DB inaccesible. */
  source: 'database' | 'memory-only' | 'database-unavailable';
}

const EMPTY_AI_PROVIDER_STATUS: AiProviderUiStatus = {
  status: 'checking',
  label: 'Comprobando estado del motor...',
  configuredKeys: 0,
  pausedKeys: 0,
  source: 'database-unavailable',
};

export interface GeminiPoolDiagnosticsUi {
  fastKeysCount: number;
  proKeysCount: number;
  overlappingKeysRemovedFromFast: number;
  proUsesDedicatedPool: boolean;
}

export const AI_PROVIDER_UI_IDS = ['groq', 'gemini', 'gemini_pro', 'openrouter'] as const;

let lastPoolDiagnostics: GeminiPoolDiagnosticsUi | null = null;

/**
 * Diagnóstico REAL de los motores de IA, calculado en el servidor
 * (GET /api/admin/ai-providers-status → ai-providers-status en admin-api.ts).
 */
export async function getAiProvidersStatus(forcePing = false): Promise<Record<string, AiProviderUiStatus>> {
  const out: Record<string, AiProviderUiStatus> = {
    groq: { ...EMPTY_AI_PROVIDER_STATUS },
    gemini: { ...EMPTY_AI_PROVIDER_STATUS },
    gemini_pro: { ...EMPTY_AI_PROVIDER_STATUS },
    openrouter: { ...EMPTY_AI_PROVIDER_STATUS },
  };
  try {
    const { ok, data, error } = await apiClient.get(`/api/admin/ai-providers-status${forcePing ? '?forcePing=true' : ''}`);
    if (ok && data) {
      for (const id of AI_PROVIDER_UI_IDS) {
        const entry = (data as Record<string, unknown>)[id];
        if (entry && typeof entry === 'object') {
          out[id] = { ...EMPTY_AI_PROVIDER_STATUS, ...(entry as Partial<AiProviderUiStatus>) };
        }
      }
      const diag = (data as Record<string, unknown>).poolDiagnostics;
      if (diag && typeof diag === 'object') {
        lastPoolDiagnostics = diag as GeminiPoolDiagnosticsUi;
      }
      return out;
    }
    console.warn('[adminService] ai-providers-status API no disponible:', error);
  } catch (err) {
    console.warn('[adminService] Excepción en getAiProvidersStatus:', err);
  }
  return out;
}

export async function getGeminiPoolDiagnostics(): Promise<GeminiPoolDiagnosticsUi | null> {
  if (!lastPoolDiagnostics) {
    await getAiProvidersStatus(false);
  }
  return lastPoolDiagnostics;
}

/**
 * Limpia pausas de claves YA EXPIRADAS (filas viejas de ai_key_cooldowns).
 * Nunca cancela una pausa activa: si la key sigue en 429 real, reusarla solo
 * genera otro 429. Server-side vía POST /api/admin/clear-ai-cooldowns.
 */
export async function clearAiCooldowns(): Promise<void> {
  const { ok, error } = await apiClient.post('/api/admin/clear-ai-cooldowns', {});
  if (!ok) throw new Error(error || 'No se pudieron limpiar las pausas de claves');
}

export async function listAiTelemetry(limit: number = 100, filters?: { from?: string; endpoint?: string }) {
  return await dal.aiTelemetry.list(limit, filters);
}

export async function getAiTelemetryStats() {
  return await dal.aiTelemetry.getAggregatedStats();
}

export interface ProductMetrics {
  documentsByType: Array<{ docType: string | null; count: number }>;
  paidExportsByDocType: Array<{ docType: string | null; count: number }>;
  revenueByPlanCurrency: Array<{ plan: string; currency: string; totalAmount: number; count: number }>;
  generatedAt?: string;
}

/**
 * Métricas por producto del panel admin (documentos por tipo, exportaciones
 * pagas por tipo e ingresos confirmados por plan+moneda). Se calculan 100%
 * server-side; acá solo se transporta el resultado. null si no está disponible.
 */
export async function metricsByProduct(): Promise<ProductMetrics | null> {
  const { ok, data, error } = await apiClient.get('/api/admin/metrics-by-product');
  if (!ok) {
    console.warn('[adminService] metrics-by-product API no disponible:', error);
    return null;
  }
  return (data as ProductMetrics) || null;
}

export interface PublishedCvModerationRow {
  id: string;
  userId: string;
  cvId: string;
  slug: string;
  driveFileId: string | null;
  isActive: boolean;
  ownerEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Lista paginada de CVs publicados para moderación. `q` vacío = todos; si
 * contiene @ filtra por email del dueño (server-side); si no, por slug.
 */
export async function listPublishedCvs({ page = 0, limit = 20, q = '' }: { page?: number; limit?: number; q?: string } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(q.trim() ? { q: q.trim() } : {}),
  });
  const { ok, data, error } = await apiClient.get(`/api/admin/list-published-cvs?${params.toString()}`);
  if (!ok) {
    console.warn('[adminService] list-published-cvs API no disponible:', error);
    return { items: [] as PublishedCvModerationRow[], totalCount: 0, page, pageSize: limit };
  }
  return {
    items: (data?.items || []) as PublishedCvModerationRow[],
    totalCount: Number(data?.totalCount || 0),
    page: Number(data?.page ?? page),
    pageSize: Number(data?.pageSize ?? limit),
  };
}

/**
 * Activa/desactiva la publicación pública (/c/:slug). Moderación = cambiar
 * is_active únicamente; nunca borra el CV ni el archivo de Drive.
 */
export async function setPublishedCvActive(id: string, isActive: boolean, reason?: string): Promise<void> {
  const { ok, error } = await apiClient.post('/api/admin/set-published-cv-active', {
    id,
    isActive,
    ...(reason && reason.trim() ? { reason: reason.trim() } : {}),
  });
  if (!ok) {
    throw new Error(error || 'No se pudo cambiar el estado de la publicación');
  }
}

export interface AiCooldownRow {
  provider: string;
  /** Primeros 8 caracteres del hash SHA-256 de la key; nunca la key ni el hash completo. */
  keyHashPrefix: string;
  pausedUntil: string;
  updatedAt: string;
}

/** Pausas de claves de IA activas (server-side). [] si no está disponible. */
export async function listAiCooldowns(): Promise<AiCooldownRow[]> {
  const { ok, data, error } = await apiClient.get('/api/admin/list-ai-cooldowns');
  if (!ok) {
    console.warn('[adminService] list-ai-cooldowns API no disponible:', error);
    return [];
  }
  return (data?.cooldowns || []) as AiCooldownRow[];
}

export interface AdminUserPassRow {
  id: string;
  pass_id: string;
  doc_type: string;
  is_permanent: boolean;
  expires_at: string | null;
  source: string;
  revoked_at: string | null;
  revoke_reason: string | null;
  created_at: string;
}

export async function listUserAppPasses(userId: string): Promise<AdminUserPassRow[]> {
  const { ok, data, error } = await apiClient.get(`/api/admin/list-user-passes?userId=${encodeURIComponent(userId)}`);
  if (!ok) {
    console.warn('[adminService] list-user-passes no disponible:', error);
    return [];
  }
  return (data?.passes || []) as AdminUserPassRow[];
}

export async function grantUserAppPass(
  userId: string,
  passId: 'pass_30d' | 'pass_editorlee' | 'pass_facturlee' | 'pass_editorial_team_30d',
  reason?: string,
  days?: number | null
): Promise<void> {
  const { ok, error } = await apiClient.post('/api/admin/grant-app-pass', {
    userId,
    passId,
    ...(reason ? { reason } : {}),
    ...(typeof days === 'number' ? { days } : {}),
  });
  if (!ok) throw new Error(error || 'No se pudo asignar el pase al usuario');
}

export async function revokeUserAppPass(
  userId: string,
  passId: 'pass_30d' | 'pass_editorlee' | 'pass_facturlee' | 'pass_editorial_team_30d',
  reason: string
): Promise<void> {
  const { ok, error } = await apiClient.post('/api/admin/revoke-app-pass', {
    userId,
    passId,
    reason,
  });
  if (!ok) throw new Error(error || 'No se pudo revocar el pase');
}

export interface FunnelMetricsSummary {
  eventsByKey: Record<string, number>;
  activePassesById: Record<string, number>;
  editorialTeamsCount: number;
  since: string;
}

export async function getFunnelMetrics(): Promise<FunnelMetricsSummary | null> {
  const { ok, data, error } = await apiClient.get('/api/admin/funnel-metrics');
  if (!ok) {
    console.warn('[adminService] funnel-metrics no disponible:', error);
    return null;
  }
  return (data as FunnelMetricsSummary) || null;
}

export async function sendTestTelegramAlert(): Promise<void> {
  const { ok, error } = await apiClient.post('/api/admin/test-telegram-alert', {});
  if (!ok) throw new Error(error || 'No se pudo enviar la prueba de Telegram');
}
