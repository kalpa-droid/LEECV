import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, isAdmin } from '../_lib/authMiddleware.js';
import { errorResponse, successResponse } from '../_lib/apiResponse.js';
import { requireRateLimit } from '../_lib/rateLimiter.js';
import { serverDal } from '../_lib/serverDal.js';

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

    const tokenRow = await serverDal.driveTokens.getByUserId(targetUserId);

    if (tokenRow?.refresh_token) {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${tokenRow.refresh_token}`, { method: 'POST' })
        .catch(err => console.warn('No se pudo revocar el token en Google:', err));
    }

    await serverDal.driveTokens.deleteByUserId(targetUserId);
    await serverDal.profiles.updateDriveStatus(targetUserId, {
      drive_connected: false,
      drive_quota_percent: null,
    });

    return successResponse(res, { success: true });
  } catch (err: any) {
    console.error('Error desconectando Drive:', err);
    return errorResponse(res, 500, 'No se pudo desconectar Drive');
  }
}
