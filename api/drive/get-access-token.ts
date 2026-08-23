import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireAuth } from '../_lib/authMiddleware.js';
import { errorResponse, successResponse } from '../_lib/apiResponse.js';
import { requireRateLimit } from '../_lib/rateLimiter.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return errorResponse(res, 405, 'Método no permitido');

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const rateOk = await requireRateLimit(req, res, `user:${auth.user.id}:drive-token`, {
    maxRequests: 15,
    windowSeconds: 60
  });
  if (!rateOk) return;

  try {
    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from('google_drive_tokens')
      .select('refresh_token')
      .eq('user_id', auth.user.id)
      .single();

    if (tokenError || !tokenRow) {
      return errorResponse(res, 404, 'El usuario no conectó Google Drive', { code: 'not_connected' });
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: tokenRow.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const data: any = await response.json();

    if (!response.ok) {
      if (data.error === 'invalid_grant') {
        await supabaseAdmin.from('profiles').update({ drive_connected: false }).eq('id', auth.user.id);
        await supabaseAdmin.from('google_drive_tokens').delete().eq('user_id', auth.user.id);
        return errorResponse(res, 409, 'La conexión con Drive fue revocada, hay que reconectar', { code: 'revoked' });
      }
      throw new Error(JSON.stringify(data));
    }

    return successResponse(res, { accessToken: data.access_token, expiresIn: data.expires_in });
  } catch (err: any) {
    console.error('Error refrescando token de Drive:', err);
    return errorResponse(res, 500, 'No se pudo obtener un token de Drive');
  }
}
