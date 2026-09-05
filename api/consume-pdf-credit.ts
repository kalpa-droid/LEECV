import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireAuth } from './_lib/authMiddleware.js';
import { errorResponse, successResponse } from './_lib/apiResponse.js';
import { requireRateLimit } from './_lib/rateLimiter.js';
import { captureBackendException } from './_lib/sentryBackend.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return errorResponse(res, 405, 'Method not allowed');

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const rateOk = await requireRateLimit(req, res, `user:${auth.user.id}:consume-credit`, {
    maxRequests: 10,
    windowSeconds: 60
  });
  if (!rateOk) return;

  try {
    const { data: allowed, error } = await supabaseAdmin.rpc('consume_pdf_credit', {
      p_user_id: auth.user.id
    });

    if (error) throw error;
    return successResponse(res, { success: Boolean(allowed) });
  } catch (err: any) {
    console.error('Error consumiendo crédito PDF:', err);
    await captureBackendException(err, 'consume-pdf-credit', { userId: auth.user.id });
    return errorResponse(res, 500, 'Error al verificar créditos');
  }
}
