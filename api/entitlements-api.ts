import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { successResponse, errorResponse } from './_lib/apiResponse.js';
import { requireRateLimit } from './_lib/rateLimiter.js';
import { notifyAdminEvent } from './_lib/adminNotifier.js';
import { sendPassActivatedEmail } from './_lib/emails/lifecycleEmails.js';

const REDEEMABLE_PASSES = new Set([
  'pass_30d',
  'pass_editorlee',
  'pass_facturlee',
  'pass_editorial_team_30d',
]);

const ALLOWED_FUNNEL_EVENTS = new Set([
  'landing_app_selected',
  'studio_opened',
  'free_proof_used',
  'checkout_opened',
  'checkout_started',
  'pass_redeemed',
  'drive_saved',
  'team_created',
]);

const ALLOWED_DOC_TYPES = new Set([
  'all',
  'cv',
  'cover_letter',
  'business_card',
  'editorial',
  'book',
  'invoice',
  'planner',
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = (req.query?.action as string) || req.body?.action || '';

  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Método no permitido');
  }

  if (action === 'funnel-track') {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
    const rateOk = await requireRateLimit(req, res, `funnel:${ip}`, {
      maxRequests: 120,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    const eventKey = typeof req.body?.eventKey === 'string' ? req.body.eventKey.trim() : '';
    const docTypeRaw = typeof req.body?.docType === 'string' ? req.body.docType.trim() : 'all';

    if (!ALLOWED_FUNNEL_EVENTS.has(eventKey)) {
      return errorResponse(res, 400, 'Evento de embudo no permitido');
    }

    const docType = ALLOWED_DOC_TYPES.has(docTypeRaw) ? docTypeRaw : 'all';

    try {
      await supabaseAdmin.rpc('increment_funnel_counter', {
        p_event_key: eventKey,
        p_doc_type: docType,
      });
    } catch (err: any) {
      console.warn('[entitlements-api] No bloqueante increment_funnel_counter:', err?.message || err);
    }

    return successResponse(res, { tracked: true });
  }

  if (action === 'redeem-pass') {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 401, 'Iniciá sesión para canjear tus créditos por un pase');
    }

    const token = authHeader.slice(7).trim();
    const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !authData?.user) {
      return errorResponse(res, 401, 'Sesión inválida o expirada');
    }

    const userId = authData.user.id;
    const rateOk = await requireRateLimit(req, res, `user:${userId}:redeem-pass`, {
      maxRequests: 10,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    const targetPass = typeof req.body?.passId === 'string' ? req.body.passId.trim() : '';
    if (!REDEEMABLE_PASSES.has(targetPass)) {
      return errorResponse(res, 400, 'Pase no válido para canje');
    }

    const { data, error } = await supabaseAdmin.rpc('redeem_credits_for_pass', {
      p_user_id: userId,
      p_target_pass: targetPass,
    });

    if (error) {
      if (String(error.message).includes('INSUFFICIENT_CREDITS')) {
        return errorResponse(res, 400, 'No tenés suficientes créditos disponibles para este canje');
      }
      console.error('[entitlements-api] Error canjeando pase:', error.message);
      return errorResponse(res, 500, 'No se pudo completar el canje');
    }

    const creditsSpent = Number((data as any)?.credits_spent || 0);
    if (authData.user.email) {
      sendPassActivatedEmail(
        authData.user.email,
        targetPass,
        `Canjeaste ${creditsSpent} crédito(s) desde tu billetera sin pagar un peso extra.`
      ).catch(() => {});
    }

    await notifyAdminEvent({
      type: 'pass_redeemed',
      title: `Canje de Pase: ${targetPass}`,
      message: `${authData.user.email || userId} canjeó ${creditsSpent} créditos por ${targetPass}`,
      metadata: { userId, passId: targetPass, creditsSpent },
    }).catch(() => {});

    return successResponse(res, data || { success: true, pass_id: targetPass });
  }

  return errorResponse(res, 400, 'Acción no reconocida en entitlements-api');
}
