import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from './_lib/authMiddleware.js';
import { errorResponse, successResponse } from './_lib/apiResponse.js';
import { requireRateLimit } from './_lib/rateLimiter.js';
import { createCheckoutForProvider } from './_lib/paymentProviders/checkoutInitiators.js';
import { captureBackendException } from './_lib/sentryBackend.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return errorResponse(res, 405, 'Method not allowed');

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const rateOk = await requireRateLimit(req, res, `user:${auth.user.id}:mp-preference`, {
    maxRequests: 10,
    windowSeconds: 60,
  });
  if (!rateOk) return;

  const userId = auth.user.id;
  const email = auth.user.email || '';
  const { plan = 'single_pdf' } = req.body || {};

  try {
    const result = await createCheckoutForProvider('mercadopago', plan, userId, email);
    return successResponse(res, { checkoutUrl: result.checkoutUrl });
  } catch (err: any) {
    console.error('Error creando preferencia MP:', err);
    await captureBackendException(err, 'create-mp-preference', { userId, plan });
    return errorResponse(res, 500, err?.message || 'No se pudo crear la preferencia de pago');
  }
}
