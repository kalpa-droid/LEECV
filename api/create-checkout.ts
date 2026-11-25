import type { VercelRequest, VercelResponse } from '@vercel/node';
import { errorResponse, successResponse } from './_lib/apiResponse.js';
import { requireRateLimit } from './_lib/rateLimiter.js';
import { createCheckoutForProvider } from './_lib/paymentProviders/checkoutInitiators.js';
import { captureBackendException } from './_lib/sentryBackend.js';
import { resolveCheckoutIdentity } from './_lib/checkoutIdentity.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return errorResponse(res, 405, 'Method not allowed');

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  const rateOk = await requireRateLimit(req, res, `guest:${ip}:create-checkout`, {
    maxRequests: 15,
    windowSeconds: 60,
  });
  if (!rateOk) return;

  const identity = await resolveCheckoutIdentity(req, res);
  if (!identity) return; // la respuesta de error ya fue enviada

  const { providerId, plan, emailToUse, exportToken, userId, returnPath } = identity;

  try {
    const result = returnPath
      ? await createCheckoutForProvider(providerId, plan, exportToken, emailToUse, userId, returnPath)
      : await createCheckoutForProvider(providerId, plan, exportToken, emailToUse, userId);
    return successResponse(res, { checkoutUrl: result.checkoutUrl });
  } catch (err: any) {
    console.error(`Error creando checkout [${providerId}]:`, err);
    await captureBackendException(err, 'create-checkout', { providerId, plan });
    return errorResponse(res, 500, 'No se pudo crear el checkout');
  }
}
