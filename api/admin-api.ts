import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from './_lib/authMiddleware.js';
import { requireRateLimit } from './_lib/rateLimiter.js';
import { errorResponse, successResponse } from './_lib/apiResponse.js';
import { diagnoseAllProviders } from './_lib/paymentProviders/registry.js';
import { AI_PROVIDERS } from './_lib/aiProviders/registry.js';
import * as keyRotation from './_lib/aiProviders/keyRotation.js';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { validateBody } from './_lib/validateBody.js';
import { serverDal } from './_lib/serverDal.js';
import { applyPayment } from './_lib/applyPayment.js';
import { captureBackendException } from './_lib/sentryBackend.js';
import { reconcilePendingPayments } from './_lib/paymentReconciler.js';
import { sendUnclaimedCreditsReminder } from './_lib/emails/sendUnclaimedCreditsReminder.js';
import { sendPassActivatedEmail } from './_lib/emails/lifecycleEmails.js';
import { getTelegramStatus, sendTelegramAdminAlert } from './_lib/telegramAlert.js';
import { getResendStatus } from './_lib/adminNotifier.js';
import { BILLING_CONFIG } from './_lib/config/limits.js';

let cachedStatus: { data: Record<string, unknown>; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;
// Cache del diagnóstico IA: cada poll del panel no debe re-pegar a Groq/Gemini
// más de una vez cada 5 minutos (ahorra cuota real de las keys rotadas).
let cachedAiStatus: { data: Record<string, unknown>; timestamp: number } | null = null;

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

    const gatewayData = await diagnoseAllProviders(forcePing);
    const resultData: Record<string, unknown> = {
      ...gatewayData,
      telegram: getTelegramStatus(),
      resend: getResendStatus(),
    };
    cachedStatus = { data: resultData, timestamp: now };

    return successResponse(res, {
      ...resultData,
      lastCheckedAt: new Date(now).toISOString(),
      cached: false,
    });
  }

  if (action === 'ai-providers-status') {
    if (req.method !== 'GET') return errorResponse(res, 405, 'Método HTTP no permitido');

    const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:ai-providers-status`, {
      maxRequests: 20,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    const forcePing = req.query.forcePing === 'true';
    const now = Date.now();
    if (!forcePing && cachedAiStatus && (now - cachedAiStatus.timestamp < CACHE_TTL_MS)) {
      return successResponse(res, {
        ...cachedAiStatus.data,
        lastCheckedAt: new Date(cachedAiStatus.timestamp).toISOString(),
        cached: true,
      });
    }

    const providers = Object.values(AI_PROVIDERS);

    // Diagnóstico REAL server-side de los motores de IA (antes el panel leía
    // VITE_*_API_KEY en el navegador, que nunca existe → falso missing_vars).
    // El ping y el resumen de cooldowns pueden fallar por proveedor sin tumbar
    // el resto (fail-safe; getAiKeyCooldownSummary y el catch no lanzan).
    const results = await Promise.allSettled(
      providers.map(async (provider) => {
        const pingResult = await provider.ping().catch(() => ({
          status: 'error' as const,
          label: `Sin respuesta de ${provider.displayName}`,
          model: provider.defaultModel,
        }));
        const cooldown = await keyRotation.getAiKeyCooldownSummary(provider.id);
        return { id: provider.id, ...pingResult, ...cooldown };
      })
    );

    const out: Record<string, unknown> = {};
    results.forEach((r, i) => {
      const id = providers[i].id;
      if (r.status === 'fulfilled') {
        out[id] = r.value;
      } else {
        out[id] = {
          id,
          status: 'error',
          label: `Sin respuesta del diagnóstico de ${id}`,
          model: providers[i].defaultModel,
          configuredKeys: 0,
          pausedKeys: 0,
          source: 'database-unavailable',
        };
      }
    });

    // 4to pool: Gemini Pro separado (gemini_pro) + diagnóstico de separación de claves
    try {
      const geminiProCooldown = await keyRotation.getAiKeyCooldownSummary('gemini_pro');
      const geminiBase = (out.gemini as Record<string, unknown>) || {};
      const proConfigured = Number(geminiProCooldown?.configuredKeys ?? 0);
      out.gemini_pro = {
        id: 'gemini_pro',
        status: proConfigured > 0 ? (geminiBase.status || 'active') : 'missing_vars',
        label:
          proConfigured > 0
            ? `Pool Pro exclusivo (${proConfigured} clave(s))`
            : 'Sin GEMINI_PRO_API_KEYS dedicado (usa respaldo ágil)',
        model: 'gemini-2.5-pro / flash',
        ...geminiProCooldown,
      };
    } catch {
      // Fail-safe si un test unitario no contempla gemini_pro
    }

    try {
      const diagFn = (keyRotation as Record<string, unknown>).getGeminiKeyPoolDiagnostics;
      if (typeof diagFn === 'function') {
        out.poolDiagnostics = diagFn();
      }
    } catch {
      // Ignorar en mocks parciales de Vitest
    }

    cachedAiStatus = { data: out, timestamp: now };

    return successResponse(res, {
      ...out,
      lastCheckedAt: new Date(now).toISOString(),
      cached: false,
    });
  }

  if (action === 'clear-ai-cooldowns') {
    if (req.method !== 'POST') return errorResponse(res, 405, 'Método no permitido');

    const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:clear-ai-cooldowns`, {
      maxRequests: 5,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    try {
      // Solo borra pausas YA EXPIRADAS (filas que el cron diario todavía no
      // limpió): una pausa activa de rate-limit real NO se cancela desde el
      // panel, porque eso re-forzaría una key que sigue en 429 en el proveedor.
      const cleared = await keyRotation.clearExpiredCooldowns();
      if (!cleared) {
        return errorResponse(res, 503, 'La base de datos no respondió; las pausas quedaron sin cambios');
      }
      return successResponse(res, { success: true });
    } catch (err: any) {
      console.error('[CRITICAL ADMIN API ERROR - clear-ai-cooldowns]:', err?.message || err, err?.stack);
      await captureBackendException(err, 'admin-api:clear-ai-cooldowns');
      return errorResponse(res, 500, 'Error al limpiar las pausas de claves');
    }
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

  if (action === 'set-plan') {
    if (req.method !== 'POST') return errorResponse(res, 405, 'Método HTTP no permitido');

    const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:set-plan`, {
      maxRequests: 20,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    const body = validateBody<{
      userId: string;
      plan: string;
      vence?: string | null;
    }>(req, res, ['userId', 'plan']);
    if (!body) return;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.userId)) {
      return errorResponse(res, 400, 'Identificador de usuario no válido');
    }
    if (!['free', 'pro', 'pass_30d'].includes(body.plan)) {
      return errorResponse(res, 400, 'Plan no válido');
    }

    let venceValue: string | null = null;
    if (body.plan !== 'free' && body.vence) {
      const venceDate = new Date(body.vence);
      if (Number.isNaN(venceDate.getTime())) {
        return errorResponse(res, 400, 'Fecha de vencimiento no válida');
      }
      venceValue = venceDate.toISOString();
    }

    try {
      const patch: Record<string, unknown> = {
        plan: body.plan,
        plan_vence: venceValue,
        premium_activo: body.plan !== 'free',
      };
      const updated = await serverDal.profiles.updateSubscription({ id: body.userId }, patch);
      if (!updated) return errorResponse(res, 404, 'Usuario no encontrado');

      await serverDal.adminAuditLogs.log(admin.user.id, 'set_user_plan', body.userId, {
        plan: body.plan,
        vence: venceValue,
      });

      return successResponse(res, {
        success: true,
        userId: body.userId,
        plan: body.plan,
        vence: venceValue,
      });
    } catch (err: any) {
      console.error('[CRITICAL ADMIN API ERROR - set-plan]:', err?.message || err, err?.stack);
      await captureBackendException(err, 'admin-api:set-plan');
      return errorResponse(res, 500, 'Error al actualizar el plan del usuario');
    }
  }

  if (action === 'grant-export-tokens') {
    if (req.method !== 'POST') return errorResponse(res, 405, 'Método HTTP no permitido');

    const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:grant-export-tokens`, {
      maxRequests: 20,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    const body = validateBody<{
      userId: string;
      amount: number;
      reason?: string;
    }>(req, res, ['userId', 'amount']);
    if (!body) return;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.userId)) {
      return errorResponse(res, 400, 'Identificador de usuario no válido');
    }
    const amount = Number(body.amount);
    if (!Number.isInteger(amount) || amount < 1 || amount > 1000) {
      return errorResponse(res, 400, 'La cantidad debe ser un entero entre 1 y 1000');
    }
    const reason = (typeof body.reason === 'string' ? body.reason : '').trim().slice(0, 500) || 'Acreditación manual desde el panel';

    try {
      const profile = await serverDal.profiles.getById(body.userId);
      if (!profile) return errorResponse(res, 404, 'Usuario no encontrado');

      const paymentId = `admin:manual:${admin.user.id}:${body.userId}:${Date.now()}`;
      const { error } = await supabaseAdmin.rpc('grant_export_tokens', {
        p_payment_id: paymentId,
        p_user_id: body.userId,
        p_amount: amount,
        p_email: profile.email || '',
      });
      if (error) throw error;

      await serverDal.adminAuditLogs.log(admin.user.id, 'grant_export_tokens', body.userId, {
        amount,
        reason,
        payment_id: paymentId,
      });

      return successResponse(res, { success: true, userId: body.userId, amount });
    } catch (err: any) {
      console.error('[CRITICAL ADMIN API ERROR - grant-export-tokens]:', err?.message || err, err?.stack);
      await captureBackendException(err, 'admin-api:grant-export-tokens');
      return errorResponse(res, 500, 'Error al asignar los créditos de exportación');
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
        targetEmail = (body.targetEmail || payerEmail || '').trim().toLowerCase();
        if (!payerEmail || targetEmail !== payerEmail) {
          return errorResponse(res, 400, 'La cuenta de destino debe coincidir con el email registrado en el pago');
        }

        const profile = await serverDal.profiles.getByEmail(targetEmail);
        // Si el comprador todavía no creó cuenta, profileId queda null para que
        // applyPayment acredite en unclaimed_email_credits y se reclame al ingresar.
        profileId = profile?.id || null;
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

  if (action === 'reconcile-payments') {
    if (req.method !== 'POST') return errorResponse(res, 405, 'Método HTTP no permitido');

    const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:reconcile-payments`, {
      maxRequests: 10,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    try {
      const summary = await reconcilePendingPayments();
      await serverDal.adminAuditLogs.log(admin.user.id, 'reconcile_payments', null, { ...summary });
      return successResponse(res, { success: true, summary });
    } catch (err: any) {
      console.error('[CRITICAL ADMIN API ERROR - reconcile-payments]:', err?.message || err, err?.stack);
      await captureBackendException(err, 'admin-api:reconcile-payments');
      return errorResponse(res, 500, 'Error al reconciliar pagos');
    }
  }

  if (action === 'list-unclaimed-credits') {
    if (req.method !== 'GET') return errorResponse(res, 405, 'Método HTTP no permitido');

    const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:list-unclaimed-credits`, {
      maxRequests: 30,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    const page = Math.max(0, parseInt((req.query.page as string) || '0', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));

    try {
      const { credits, totalCount } = await serverDal.unclaimedCredits.listPending(limit, page * limit);
      return successResponse(res, { credits, totalCount, page, pageSize: limit });
    } catch (err: any) {
      console.error('[CRITICAL ADMIN API ERROR - list-unclaimed-credits]:', err?.message || err, err?.stack);
      await captureBackendException(err, 'admin-api:list-unclaimed-credits');
      return errorResponse(res, 500, 'Error al consultar créditos sin reclamar');
    }
  }

  if (action === 'resend-unclaimed-reminder') {
    if (req.method !== 'POST') return errorResponse(res, 405, 'Método HTTP no permitido');

    const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:resend-unclaimed-reminder`, {
      maxRequests: 10,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    const body = validateBody<{ id: string }>(req, res, ['id']);
    if (!body) return;

    if (typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id.trim())) {
      return errorResponse(res, 400, 'ID de crédito sin reclamar no válido');
    }
    const id = body.id.trim();

    try {
      const row = await serverDal.unclaimedCredits.getById(id);
      if (!row) return errorResponse(res, 404, 'Crédito sin reclamar no encontrado o ya reclamado');
      if (row.expired_at) {
        return errorResponse(res, 400, 'Este crédito ya expiró; no se puede reenviar el recordatorio');
      }

      const ok = await sendUnclaimedCreditsReminder(row.email, row.credits);
      if (!ok) {
        return errorResponse(res, 502, 'No se pudo enviar el recordatorio; revisá la configuración del email');
      }

      await serverDal.unclaimedCredits.markReminded(row.id);
      await serverDal.adminAuditLogs.log(admin.user.id, 'resend_unclaimed_reminder', null, {
        unclaimedId: row.id,
        credits: row.credits,
        provider: row.provider,
      });
      return successResponse(res, { success: true });
    } catch (err: any) {
      console.error('[CRITICAL ADMIN API ERROR - resend-unclaimed-reminder]:', err?.message || err, err?.stack);
      await captureBackendException(err, 'admin-api:resend-unclaimed-reminder');
      return errorResponse(res, 500, 'Error al reenviar el recordatorio');
    }
  }

  if (action === 'metrics-by-product') {
    if (req.method !== 'GET') return errorResponse(res, 405, 'Método HTTP no permitido');

    const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:metrics-by-product`, {
      maxRequests: 30,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    try {
      const [documentsByType, paidExportsByDocType, revenueByPlanCurrency] = await Promise.all([
        serverDal.cvs.countByDocType(),
        serverDal.exportTokens.countPaidByDocType(),
        serverDal.processedPayments.revenueByPlanCurrency(),
      ]);
      return successResponse(res, {
        documentsByType,
        paidExportsByDocType,
        revenueByPlanCurrency,
        generatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('[CRITICAL ADMIN API ERROR - metrics-by-product]:', err?.message || err, err?.stack);
      await captureBackendException(err, 'admin-api:metrics-by-product');
      return errorResponse(res, 500, 'Error al calcular las métricas por producto');
    }
  }

  if (action === 'list-published-cvs') {
    if (req.method !== 'GET') return errorResponse(res, 405, 'Método HTTP no permitido');

    const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:list-published-cvs`, {
      maxRequests: 30,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    const page = Math.max(0, parseInt((req.query.page as string) || '0', 10));
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
    const q = ((req.query.q as string) || '').trim().slice(0, 120);

    try {
      const { items, totalCount } = await serverDal.publishedCvs.listForModeration({ search: q, page, limit });
      return successResponse(res, { items, totalCount, page, pageSize: limit });
    } catch (err: any) {
      console.error('[CRITICAL ADMIN API ERROR - list-published-cvs]:', err?.message || err, err?.stack);
      await captureBackendException(err, 'admin-api:list-published-cvs');
      return errorResponse(res, 500, 'Error al listar los CVs publicados');
    }
  }

  if (action === 'set-published-cv-active') {
    if (req.method !== 'POST') return errorResponse(res, 405, 'Método no permitido');

    const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:set-published-cv-active`, {
      maxRequests: 10,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    const body = validateBody<{ id: string; isActive: boolean; reason?: string }>(req, res, ['id', 'isActive']);
    if (!body) return;

    if (typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id.trim())) {
      return errorResponse(res, 400, 'ID de publicación no válido');
    }
    if (typeof body.isActive !== 'boolean') {
      return errorResponse(res, 400, 'isActive debe ser booleano');
    }
    const reason = typeof body.reason === 'string' && body.reason.trim()
      ? body.reason.trim().slice(0, 500)
      : undefined;

    try {
      const updated = await serverDal.publishedCvs.setActive(body.id.trim(), body.isActive);
      if (!updated) return errorResponse(res, 404, 'Publicación no encontrada');

      // Moderación = cambiar is_active, nunca borrar el CV ni el archivo de Drive.
      await serverDal.adminAuditLogs.log(admin.user.id, 'set_published_cv_active', updated.user_id, {
        publishedCvId: updated.id,
        slug: updated.slug,
        isActive: updated.is_active,
        ...(reason ? { reason } : {}),
      });
      return successResponse(res, { success: true, isActive: updated.is_active });
    } catch (err: any) {
      console.error('[CRITICAL ADMIN API ERROR - set-published-cv-active]:', err?.message || err, err?.stack);
      await captureBackendException(err, 'admin-api:set-published-cv-active');
      return errorResponse(res, 500, 'Error al cambiar el estado de la publicación');
    }
  }

  if (action === 'list-ai-cooldowns') {
    if (req.method !== 'GET') return errorResponse(res, 405, 'Método HTTP no permitido');

    const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:list-ai-cooldowns`, {
      maxRequests: 30,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    try {
      const cooldowns = await serverDal.aiKeyCooldowns.listActive();
      return successResponse(res, { cooldowns });
    } catch (err: any) {
      console.error('[CRITICAL ADMIN API ERROR - list-ai-cooldowns]:', err?.message || err, err?.stack);
      await captureBackendException(err, 'admin-api:list-ai-cooldowns');
      return errorResponse(res, 500, 'Error al consultar las pausas de claves de IA');
    }
  }

  if (action === 'grant-app-pass') {
    if (req.method !== 'POST') return errorResponse(res, 405, 'Método HTTP no permitido');

    const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:grant-app-pass`, {
      maxRequests: 20,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    const body = validateBody<{
      userId: string;
      passId: string;
      days?: number | null;
      reason?: string;
    }>(req, res, ['userId', 'passId']);
    if (!body) return;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(body.userId)) {
      return errorResponse(res, 400, 'Identificador de usuario no válido');
    }
    if (!['pass_30d', 'pass_editorlee', 'pass_facturlee', 'pass_editorial_team_30d'].includes(body.passId)) {
      return errorResponse(res, 400, 'Pase no válido');
    }
    const reason = (typeof body.reason === 'string' ? body.reason : '').trim().slice(0, 500) || 'Habilitado manualmente desde Admin';
    const requestedDays =
      typeof body.days === 'number' && Number.isInteger(body.days) && body.days >= 1 && body.days <= 3650
        ? body.days
        : null;

    try {
      const profile = await serverDal.profiles.getById(body.userId);
      if (!profile) return errorResponse(res, 404, 'Usuario no encontrado');

      const paymentId = `admin:pass:${admin.user.id}:${body.userId}:${body.passId}:${Date.now()}`;
      if (body.passId === 'pass_30d') {
        const { error: proErr } = await supabaseAdmin.rpc('grant_pro_subscription', {
          p_payment_id: paymentId,
          p_user_id: body.userId,
          p_days: requestedDays || BILLING_CONFIG.PRO_PLAN_DAYS,
        });
        if (proErr) throw proErr;
        await supabaseAdmin.from('profiles').update({ plan: 'pass_30d' }).eq('id', body.userId);
      } else {
        const defaultDays = body.passId === 'pass_editorial_team_30d' ? 30 : null;
        const { error: passErr } = await supabaseAdmin.rpc('grant_app_pass', {
          p_payment_id: paymentId,
          p_user_id: body.userId,
          p_pass_id: body.passId,
          p_days: requestedDays ?? defaultDays,
          p_source: 'admin_manual',
        });
        if (passErr) throw passErr;
      }

      if (profile.email) {
        sendPassActivatedEmail(profile.email, body.passId, reason).catch(() => {});
      }

      await serverDal.adminAuditLogs.log(admin.user.id, 'grant_app_pass', body.userId, {
        passId: body.passId,
        days: requestedDays,
        reason,
        payment_id: paymentId,
      });

      return successResponse(res, { success: true, userId: body.userId, passId: body.passId });
    } catch (err: any) {
      console.error('[CRITICAL ADMIN API ERROR - grant-app-pass]:', err?.message || err, err?.stack);
      await captureBackendException(err, 'admin-api:grant-app-pass');
      return errorResponse(res, 500, 'Error al asignar el pase al usuario');
    }
  }

  if (action === 'revoke-app-pass') {
    if (req.method !== 'POST') return errorResponse(res, 405, 'Método HTTP no permitido');

    const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:revoke-app-pass`, {
      maxRequests: 20,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    const body = validateBody<{
      userId: string;
      passId: string;
      reason: string;
    }>(req, res, ['userId', 'passId', 'reason']);
    if (!body) return;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(body.userId)) {
      return errorResponse(res, 400, 'Identificador de usuario no válido');
    }
    if (!['pass_30d', 'pass_editorlee', 'pass_facturlee', 'pass_editorial_team_30d'].includes(body.passId)) {
      return errorResponse(res, 400, 'Pase no válido');
    }
    const reason = body.reason.trim();
    if (reason.length < 5 || reason.length > 500) {
      return errorResponse(res, 400, 'El motivo debe tener entre 5 y 500 caracteres');
    }

    try {
      if (body.passId === 'pass_30d') {
        await serverDal.profiles.updateSubscription({ id: body.userId }, {
          plan: 'free',
          plan_vence: null,
          premium_activo: false,
        });
      } else {
        const { error: revErr } = await supabaseAdmin
          .from('user_app_passes')
          .update({
            revoked_at: new Date().toISOString(),
            revoke_reason: reason,
          })
          .eq('user_id', body.userId)
          .eq('pass_id', body.passId)
          .is('revoked_at', null);
        if (revErr) throw revErr;
      }

      await serverDal.adminAuditLogs.log(admin.user.id, 'revoke_app_pass', body.userId, {
        passId: body.passId,
        reason,
      });

      return successResponse(res, { success: true, userId: body.userId, passId: body.passId });
    } catch (err: any) {
      console.error('[CRITICAL ADMIN API ERROR - revoke-app-pass]:', err?.message || err, err?.stack);
      await captureBackendException(err, 'admin-api:revoke-app-pass');
      return errorResponse(res, 500, 'Error al revocar el pase del usuario');
    }
  }

  if (action === 'list-user-passes') {
    if (req.method !== 'GET') return errorResponse(res, 405, 'Método HTTP no permitido');

    const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:list-user-passes`, {
      maxRequests: 30,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    const userId = String(req.query.userId || '').trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
      return errorResponse(res, 400, 'Identificador de usuario no válido');
    }

    try {
      const { data: passes, error } = await supabaseAdmin
        .from('user_app_passes')
        .select('id, pass_id, doc_type, is_permanent, expires_at, source, revoked_at, revoke_reason, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return successResponse(res, { passes: passes || [] });
    } catch (err: any) {
      console.error('[CRITICAL ADMIN API ERROR - list-user-passes]:', err?.message || err, err?.stack);
      await captureBackendException(err, 'admin-api:list-user-passes');
      return errorResponse(res, 500, 'Error al consultar los pases del usuario');
    }
  }

  if (action === 'funnel-metrics') {
    if (req.method !== 'GET') return errorResponse(res, 405, 'Método HTTP no permitido');

    const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:funnel-metrics`, {
      maxRequests: 30,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const eventsByKey: Record<string, number> = {};
      const activePassesById: Record<string, number> = {};
      let editorialTeamsCount = 0;

      try {
        const { data: funnelRows } = await supabaseAdmin
          .from('funnel_daily_counters')
          .select('event_key, doc_type, count')
          .gte('day', since);
        for (const r of (funnelRows || []) as any[]) {
          const key = String(r.event_key || 'other');
          eventsByKey[key] = (eventsByKey[key] || 0) + Number(r.count || 0);
        }
      } catch {
        // Tolerante si la migración aún no se aplicó en desarrollo
      }

      try {
        const nowIso = new Date().toISOString();
        const { data: passRows } = await supabaseAdmin
          .from('user_app_passes')
          .select('pass_id, is_permanent, expires_at')
          .is('revoked_at', null);
        for (const r of (passRows || []) as any[]) {
          const isAlive = r.is_permanent || !r.expires_at || String(r.expires_at) > nowIso;
          if (!isAlive) continue;
          const pid = String(r.pass_id || 'other');
          activePassesById[pid] = (activePassesById[pid] || 0) + 1;
        }
      } catch {
        // Tolerante en dev
      }

      try {
        const { count } = await supabaseAdmin
          .from('editorial_team_projects')
          .select('id', { count: 'exact', head: true });
        editorialTeamsCount = Number(count || 0);
      } catch {
        // Tolerante en dev
      }

      return successResponse(res, {
        eventsByKey,
        activePassesById,
        editorialTeamsCount,
        since,
      });
    } catch (err: any) {
      console.error('[CRITICAL ADMIN API ERROR - funnel-metrics]:', err?.message || err, err?.stack);
      await captureBackendException(err, 'admin-api:funnel-metrics');
      return errorResponse(res, 500, 'Error al consultar métricas de embudo y pases');
    }
  }

  if (action === 'test-telegram-alert') {
    if (req.method !== 'POST') return errorResponse(res, 405, 'Método HTTP no permitido');

    const rateOk = await requireRateLimit(req, res, `admin:${admin.user.id}:test-telegram-alert`, {
      maxRequests: 5,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    try {
      const result = await sendTelegramAdminAlert('Prueba manual desde el Panel Admin de LEECV', {
        adminId: admin.user.id,
        at: new Date().toISOString(),
      });
      await serverDal.adminAuditLogs.log(admin.user.id, 'test_telegram_alert', null, {
        sent: result.sent,
        reason: result.reason || null,
      });
      if (!result.sent) {
        const msg =
          result.reason === 'missing_env'
            ? 'Configurá TELEGRAM_BOT_TOKEN y TELEGRAM_ADMIN_CHAT_ID en las variables de Vercel.'
            : `No se pudo enviar el mensaje a Telegram (${result.reason || 'error'}).`;
        return errorResponse(res, result.reason === 'missing_env' ? 400 : 502, msg);
      }
      return successResponse(res, { success: true, sent: true });
    } catch (err: any) {
      console.error('[CRITICAL ADMIN API ERROR - test-telegram-alert]:', err?.message || err, err?.stack);
      await captureBackendException(err, 'admin-api:test-telegram-alert');
      return errorResponse(res, 500, 'Error al probar el Bot de Telegram');
    }
  }

  return errorResponse(res, 400, 'Acción no válida');
}
