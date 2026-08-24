import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireAdmin } from './_lib/authMiddleware.js';
import { applyPayment } from './_lib/applyPayment.js';
import { errorResponse, successResponse } from './_lib/apiResponse.js';
import { requireRateLimit } from './_lib/rateLimiter.js';
import { validateBody } from './_lib/validateBody.js';
import { serverDal } from './_lib/serverDal.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return errorResponse(res, 405, 'Método no permitido');

  const auth = await requireAdmin(req, res);
  if (!auth) return;

  const rateOk = await requireRateLimit(req, res, `admin:${auth.user.id}:approve-claim`, {
    maxRequests: 20,
    windowSeconds: 60
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
        userId: claim.user_id,
        email: claim.user_email,
        plan: claim.plan,
        metodoPago: claim.method === 'payoneer' ? 'manual' : 'manual',
        externalId: claim.id,
        amount: claim.amount,
        currency: claim.currency,
      });
    }

    await serverDal.manualClaims.updateStatus(claimId, approve ? 'aprobado' : 'rechazado', auth.user.id);

    return successResponse(res, { success: true });
  } catch (err: any) {
    console.error('Error aprobando comprobante manual:', err);
    return errorResponse(res, 500, 'Error interno');
  }
}
