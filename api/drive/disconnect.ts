import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireAuth, isAdmin } from '../_lib/authMiddleware.js';
import { errorResponse, successResponse } from '../_lib/apiResponse.js';
import { requireRateLimit } from '../_lib/rateLimiter.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return errorResponse(res, 405, 'Método no permitido');

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const rateOk = await requireRateLimit(req, res, `user:${auth.user.id}:drive-disconnect`, {
    maxRequests: 15,
    windowSeconds: 60
  });
  if (!rateOk) return;

  try {
    let targetUserId = auth.user.id;
    const { targetUserId: requestedTarget } = req.body || {};

    if (requestedTarget && requestedTarget !== auth.user.id) {
      const requesterIsAdmin = await isAdmin(auth.user.id);
      if (!requesterIsAdmin) {
        return errorResponse(res, 403, 'Solo un administrador puede desconectar la cuenta de otro usuario');
      }
      targetUserId = requestedTarget;
    }

    const { data: tokenRow } = await supabaseAdmin
      .from('google_drive_tokens')
      .select('refresh_token')
      .eq('user_id', targetUserId)
      .single();

    if (tokenRow?.refresh_token) {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${tokenRow.refresh_token}`, { method: 'POST' })
        .catch(err => console.warn('No se pudo revocar el token en Google:', err));
    }

    await supabaseAdmin.from('google_drive_tokens').delete().eq('user_id', targetUserId);
    await supabaseAdmin.from('profiles').update({
      drive_connected: false,
      drive_quota_percent: null,
    }).eq('id', targetUserId);

    return successResponse(res, { success: true });
  } catch (err: any) {
    console.error('Error desconectando Drive:', err);
    return errorResponse(res, 500, 'No se pudo desconectar Drive');
  }
}
