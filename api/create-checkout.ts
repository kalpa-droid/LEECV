import type { VercelRequest, VercelResponse } from '@vercel/node';
import { errorResponse, successResponse } from './_lib/apiResponse.js';
import { requireRateLimit } from './_lib/rateLimiter.js';
import { createCheckoutForProvider } from './_lib/paymentProviders/checkoutInitiators.js';
import { captureBackendException } from './_lib/sentryBackend.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return errorResponse(res, 405, 'Method not allowed');

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  
  const rateOk = await requireRateLimit(req, res, `guest:${ip}:create-checkout`, {
    maxRequests: 15,
    windowSeconds: 60,
  });
  if (!rateOk) return;

  const { providerId, plan = 'single_pdf', email, exportToken, userId } = req.body || {};

  if (!providerId || !email) {
    return errorResponse(res, 400, 'Faltan campos obligatorios: providerId, email');
  }
  if (providerId !== 'mercadopago' && providerId !== 'paypal') {
    return errorResponse(res, 400, 'Proveedor de pago no válido');
  }

  try {
    const result = await createCheckoutForProvider(providerId, plan, exportToken || '', email, userId);
    return successResponse(res, { checkoutUrl: result.checkoutUrl });
  } catch (err: any) {
    console.error(`Error creando checkout [${providerId}]:`, err);
    await captureBackendException(err, 'create-checkout', { providerId, plan, exportToken });
    return errorResponse(res, 500, err?.message || 'No se pudo crear el checkout');
  }
}
