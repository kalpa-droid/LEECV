import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireAuth } from '../_lib/authMiddleware.js';
import { errorResponse, successResponse } from '../_lib/apiResponse.js';
import { requireRateLimit } from '../_lib/rateLimiter.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return errorResponse(res, 405, 'Método no permitido');

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const rateOk = await requireRateLimit(req, res, `user:${auth.user.id}:drive-connect`, {
    maxRequests: 15,
    windowSeconds: 60
  });
  if (!rateOk) return;

  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return errorResponse(res, 400, 'Falta refreshToken');

    const { error: tokenError } = await supabaseAdmin
      .from('google_drive_tokens')
      .upsert({
        user_id: auth.user.id,
        refresh_token: refreshToken,
        updated_at: new Date().toISOString(),
      });
    if (tokenError) throw tokenError;

    await supabaseAdmin
      .from('profiles')
      .update({ drive_connected: true })
      .eq('id', auth.user.id);

    return successResponse(res, { success: true });
  } catch (err: any) {
    console.error('Error conectando Google Drive:', err);
    return errorResponse(res, 500, 'No se pudo guardar la conexión con Drive');
  }
}
