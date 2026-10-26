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

  if (action === 'list-customers') {
    if (req.method !== 'GET') return errorResponse(res, 405, 'Método HTTP no permitido');

    const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:list-customers`, {
      maxRequests: 30,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    const page = Math.max(0, parseInt((req.query.page as string) || '0', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '50', 10)));
    const q = ((req.query.q as string) || '').trim();
    
    try {
      const { customers, totalCount } = await serverDal.profiles.listCustomers(limit, page * limit, q);

      // Map DB response to expected UI shape
      const mapped = customers.map((c: any) => ({
        id: c.id,
        email: c.email,
        plan: c.plan,
        role: c.role,
        createdAt: c.created_at,
        pdfExportTokens: c.pdf_export_tokens || 0,
        pdfExportAccessMode: c.pdf_export_access_mode || 'automatic',
        aiCredits: Array.isArray(c.user_credits) && c.user_credits.length > 0 
          ? c.user_credits[0].ai_credits 
          : (c.user_credits?.ai_credits || 0)
      }));

      return successResponse(res, {
        customers: mapped,
        totalCount,
        page,
        pageSize: limit,
      });
    } catch (err: any) {
      console.error('[CRITICAL ADMIN API ERROR - list-customers]:', err?.message || err, err?.stack);
      await captureBackendException(err, 'admin-api:list-customers');
      return errorResponse(res, 500, 'Error al consultar la lista de clientes');
    }
  }

  if (action === 'set-pdf-export-access') {
    if (req.method !== 'POST') return errorResponse(res, 405, 'Método HTTP no permitido');

    const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:set-pdf-export-access`, {
      maxRequests: 20,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    const body = validateBody<{
      userId: string;
      accessMode: string;
      reason: string;
    }>(req, res, ['userId', 'accessMode', 'reason']);
    if (!body) return;

    if (!['automatic', 'enabled', 'disabled'].includes(body.accessMode)) {
      return errorResponse(res, 400, 'Modo de acceso PDF no válido');
    }
    if (body.reason.trim().length < 5 || body.reason.trim().length > 500) {
      return errorResponse(res, 400, 'El motivo debe tener entre 5 y 500 caracteres');
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.userId)) {
      return errorResponse(res, 400, 'Identificador de usuario no válido');
    }

    try {
      const { data, error } = await supabaseAdmin.rpc('admin_set_pdf_export_access', {
        p_target_user_id: body.userId,
        p_access_mode: body.accessMode,
        p_reason: body.reason.trim(),
        p_admin_user_id: admin.user.id,
      });
      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      if (!result) return errorResponse(res, 404, 'Perfil de usuario no encontrado');

      return successResponse(res, {
        success: true,
        previousMode: result.previous_mode,
        currentMode: result.current_mode,
      });
    } catch (err: any) {
      console.error('[CRITICAL ADMIN API ERROR - set-pdf-export-access]:', err?.message || err, err?.stack);
      await captureBackendException(err, 'admin-api:set-pdf-export-access');
      return errorResponse(res, 500, 'Error al modificar el acceso a exportación PDF');
    }
  }

  if (action === 'list-pending-grants') {
    if (req.method !== 'GET') return errorResponse(res, 405, 'Método HTTP no permitido');

    const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:list-pending-grants`, {
      maxRequests: 30,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    const page = Math.max(0, parseInt((req.query.page as string) || '0', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));

    try {
      const { grants, totalCount } = await serverDal.pendingGrants.listUnresolved(limit, page * limit);
      return successResponse(res, { grants, totalCount, page, pageSize: limit });
    } catch (err: any) {
      console.error('[CRITICAL ADMIN API ERROR - list-pending-grants]:', err?.message || err, err?.stack);
      await captureBackendException(err, 'admin-api:list-pending-grants');
      return errorResponse(res, 500, 'Error al consultar pagos retenidos');
    }
  }

  if (action === 'resolve-pending-grant') {
    if (req.method !== 'POST') return errorResponse(res, 405, 'Método HTTP no permitido');

    const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:resolve-pending-grant`, {
      maxRequests: 10,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    const body = validateBody<{
      grantId: string;
      targetEmail?: string;
      reason: string;
      approveAmountMismatch: boolean;
    }>(req, res, ['grantId', 'reason']);
    if (!body) return;

    if (typeof body.approveAmountMismatch !== 'boolean') {
      return errorResponse(res, 400, 'Debe indicar si autoriza una diferencia de importe o moneda');
    }
    if (body.reason.trim().length < 5 || body.reason.trim().length > 500) {
      return errorResponse(res, 400, 'El motivo debe tener entre 5 y 500 caracteres');
    }

    try {
      const grant = await serverDal.pendingGrants.getUnresolvedById(body.grantId);
      if (!grant) return errorResponse(res, 404, 'Pago retenido no encontrado o ya resuelto');
      if (!['mercadopago', 'paypal'].includes(grant.provider)) {
        return errorResponse(res, 400, 'El proveedor de este pago retenido no admite resolución automática');
      }

      const payerEmail = (grant.email || '').trim().toLowerCase();
      let targetEmail = '';
      let profileId: string | null = null;
      let exportToken: string | null = null;

      if (grant.plan === 'single_pdf') {
        // Venta individual sin cuenta: se acredita con el token de exportación
        // que quedó guardado al momento de retener el pago.
        exportToken = grant.export_token || null;
        if (!exportToken) {
          return errorResponse(res, 400, 'La venta individual no tiene un token de exportación asociado');
        }
      } else {
        targetEmail = (body.targetEmail || '').trim().toLowerCase();
        if (!payerEmail || targetEmail !== payerEmail) {
          return errorResponse(res, 400, 'La cuenta de destino debe coincidir con el email registrado en el pago');
        }

        const profile = await serverDal.profiles.getByEmail(targetEmail);
        if (!profile) return errorResponse(res, 404, 'No hay una cuenta registrada con el email del pago');
        profileId = profile.id;
      }

      const result = await applyPayment(supabaseAdmin, {
        email: grant.plan === 'single_pdf' ? grant.email || undefined : targetEmail,
        userId: profileId || undefined,
        exportToken,
        plan: grant.plan,
        metodoPago: grant.provider,
        externalId: grant.external_id,
        amount: grant.amount,
        currency: grant.currency,
        adminApprovedAmountMismatch: body.approveAmountMismatch,
      });

      if (result.type === 'held_for_review' || result.type === 'pending_grant') {
        return errorResponse(res, 409, 'El pago sigue retenido; no se acreditó ningún beneficio');
      }

      const resolved = await serverDal.pendingGrants.markResolved(
        grant.id,
        profileId,
        admin.user.id,
        body.reason.trim()
      );

      if (!resolved) {
        return errorResponse(res, 409, 'El pago ya fue resuelto por otra operación');
      }

      return successResponse(res, { success: true, result });
    } catch (err: any) {
      console.error('[CRITICAL ADMIN API ERROR - resolve-pending-grant]:', err?.message || err, err?.stack);
      await captureBackendException(err, 'admin-api:resolve-pending-grant');
      return errorResponse(res, 500, 'Error al resolver el pago retenido');
    }
  }

  return errorResponse(res, 400, 'Acción no válida');
}
