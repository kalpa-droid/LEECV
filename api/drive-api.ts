import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, isAdmin } from './_lib/authMiddleware.js';
import { errorResponse, successResponse } from './_lib/apiResponse.js';
import { requireRateLimit } from './_lib/rateLimiter.js';
import { serverDal } from './_lib/serverDal.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return errorResponse(res, 405, 'Método no permitido');

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const action = (req.query.action as string) || req.body?.action || 'connect';

  if (action === 'connect') {
    const rateOk = await requireRateLimit(req, res, `user:${auth.user.id}:drive-connect`, {
      maxRequests: 15,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    try {
      const { refreshToken } = req.body || {};
      if (!refreshToken) return errorResponse(res, 400, 'Falta refreshToken');

      await serverDal.driveTokens.upsertToken(auth.user.id, refreshToken);
      await serverDal.profiles.updateDriveStatus(auth.user.id, { drive_connected: true });

      return successResponse(res, { success: true });
    } catch (err: any) {
      console.error('Error conectando Google Drive:', err);
      return errorResponse(res, 500, 'No se pudo guardar la conexión con Drive');
    }
  }

  if (action === 'disconnect') {
    const rateOk = await requireRateLimit(req, res, `user:${auth.user.id}:drive-disconnect`, {
      maxRequests: 15,
      windowSeconds: 60,
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
          .catch((err) => console.warn('No se pudo revocar el token en Google:', err));
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

  if (action === 'get-access-token') {
    const rateOk = await requireRateLimit(req, res, `user:${auth.user.id}:drive-token`, {
      maxRequests: 15,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    try {
      const tokenRow = await serverDal.driveTokens.getByUserId(auth.user.id);

      if (!tokenRow || !tokenRow.refresh_token) {
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
          await serverDal.profiles.updateDriveStatus(auth.user.id, { drive_connected: false });
          await serverDal.driveTokens.deleteByUserId(auth.user.id);
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

  return errorResponse(res, 400, 'Acción no válida');
}
