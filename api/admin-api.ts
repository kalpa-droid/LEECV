import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from './_lib/authMiddleware.js';
import { requireRateLimit } from './_lib/rateLimiter.js';
import { errorResponse, successResponse } from './_lib/apiResponse.js';
import { diagnoseAllProviders } from './_lib/paymentProviders/registry.js';
import type { ProviderStatus } from './_lib/paymentProviders/types.js';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { validateBody } from './_lib/validateBody.js';
import { serverDal } from './_lib/serverDal.js';
import { applyPayment } from './_lib/applyPayment.js';
import { captureBackendException } from './_lib/sentryBackend.js';

let cachedStatus: { data: Record<string, ProviderStatus>; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const action = (req.query.action as string) || req.body?.action || 'integrations-status';

  if (action === 'integrations-status') {
    if (req.method !== 'GET') return errorResponse(res, 405, 'Método HTTP no permitido');

    const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:integrations-status`, {
      maxRequests: 20,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    const forcePing = req.query.forcePing === 'true';
    const now = Date.now();

    if (!forcePing && cachedStatus && (now - cachedStatus.timestamp < CACHE_TTL_MS)) {
      return successResponse(res, {
        ...cachedStatus.data,
        lastCheckedAt: new Date(cachedStatus.timestamp).toISOString(),
        cached: true,
      });
    }

    const resultData = await diagnoseAllProviders(forcePing);
    cachedStatus = { data: resultData, timestamp: now };

    return successResponse(res, {
      ...resultData,
      lastCheckedAt: new Date(now).toISOString(),
      cached: false,
    });
  }

  if (action === 'list-processed-payments') {
    if (req.method !== 'GET') return errorResponse(res, 405, 'Método HTTP no permitido');

    const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:list-processed-payments`, {
      maxRequests: 30,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    const page = Math.max(0, parseInt((req.query.page as string) || '0', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '50', 10)));
    const provider = ((req.query.provider as string) || 'all').trim();
    const q = ((req.query.q as string) || '').trim();

    try {
      let query = supabaseAdmin
        .from('processed_payments')
        .select('*', { count: 'exact' });

      if (provider && provider !== 'all') {
        query = query.eq('provider', provider);
      }

      if (q) {
        query = query.or(`user_email.ilike.%${q}%,external_id.ilike.%${q}%`);
      }

      const fromIndex = page * limit;
      const toIndex = fromIndex + limit - 1;

      const { data: payments, count, error } = await query
        .order('created_at', { ascending: false })
        .range(fromIndex, toIndex);

      if (error) throw error;

      return successResponse(res, {
        payments: payments || [],
        totalCount: count || 0,
        page,
        pageSize: limit,
      });
    } catch (err: any) {
      console.error('[CRITICAL ADMIN API ERROR - list-processed-payments]:', err?.message || err, err?.stack);
      await captureBackendException(err, 'admin-api:list-processed-payments');
      return errorResponse(res, 500, 'Error al consultar el historial de pagos');
    }
  }

  if (action === 'approve-manual-claim') {
    if (req.method !== 'POST') return errorResponse(res, 405, 'Método no permitido');

    const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:approve-claim`, {
      maxRequests: 20,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    const body = validateBody<{ claimId: string; approve: boolean }>(req, res, ['claimId']);
    if (!body) return;
    const { claimId, approve } = body;

    try {
      const claim = await serverDal.manualClaims.getById(claimId);
      if (!claim) return errorResponse(res, 404, 'Comprobante no encontrado');
      if (claim.status !== 'pendiente') return errorResponse(res, 400, 'Este comprobante ya fue revisado');

      if (approve) {
        await applyPayment(supabaseAdmin, {
          userId: claim.user_id,
          email: claim.user_email,
          plan: claim.plan,
          metodoPago: 'manual',
          externalId: claim.id,
          amount: claim.amount,
          currency: claim.currency,
        });
      }

      await serverDal.manualClaims.updateStatus(claimId, approve ? 'aprobado' : 'rechazado', admin.user.id);

      return successResponse(res, { success: true });
    } catch (err: any) {
      console.error('[CRITICAL ADMIN API ERROR - approve-manual-claim]:', err?.message || err, err?.stack);
      await captureBackendException(err, 'admin-api:approve-manual-claim');
      return errorResponse(res, 500, 'Error interno');
    }
  }

  return errorResponse(res, 400, 'Acción no válida');
}
