import type { VercelRequest, VercelResponse } from '@vercel/node';
import { errorResponse, successResponse } from './_lib/apiResponse.js';
import { requireRateLimit } from './_lib/rateLimiter.js';
import { createCheckoutForProvider } from './_lib/paymentProviders/checkoutInitiators.js';
import { captureBackendException } from './_lib/sentryBackend.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return errorResponse(res, 405, 'Method not allowed');

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  
  const rateOk = await requireRateLimit(req, res, `guest:${ip}:mp-preference`, {
    maxRequests: 10,
    windowSeconds: 60,
  });
  if (!rateOk) return;

  const { plan = 'single_pdf', email, exportToken, userId } = req.body || {};

  if (!email || !exportToken) {
    return errorResponse(res, 400, 'Faltan campos obligatorios: email y exportToken');
  }

  try {
    const result = await createCheckoutForProvider('mercadopago', plan, exportToken, email, userId);
    return successResponse(res, { checkoutUrl: result.checkoutUrl });
  } catch (err: any) {
    console.error('Error creando preferencia MP:', err);
    await captureBackendException(err, 'create-mp-preference', { plan, exportToken });
    return errorResponse(res, 500, err?.message || 'No se pudo crear la preferencia de pago');
  }
}
