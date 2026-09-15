import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from './_lib/authMiddleware.js';
import { successResponse, errorResponse } from './_lib/apiResponse.js';
import { serverDal } from './_lib/serverDal.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const userId = auth.user.id;

  if (req.method === 'GET') {
    const aiCredits = await serverDal.aiCredits.getByUserId(userId);
    return successResponse(res, { aiCredits: aiCredits.credits });
  }

  return errorResponse(res, 405, 'Método no permitido');
}
