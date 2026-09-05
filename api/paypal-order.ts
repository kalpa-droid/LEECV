import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from './_lib/authMiddleware.js';
import { errorResponse, successResponse } from './_lib/apiResponse.js';
import { requireRateLimit } from './_lib/rateLimiter.js';
import { createCheckoutForProvider } from './_lib/paymentProviders/checkoutInitiators.js';
import { captureBackendException } from './_lib/sentryBackend.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return errorResponse(res, 405, 'Método HTTP no permitido');

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const action = (req.query.action as string) || req.body?.action || 'create';

  if (action === 'create') {
    const rateOk = await requireRateLimit(req, res, `user:${auth.user.id}:paypal-order`, {
      maxRequests: 10,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    const userId = auth.user.id;
    const email = auth.user.email || '';
    const { plan = 'pro' } = req.body || {};

    try {
      const result = await createCheckoutForProvider('paypal', plan, userId, email);
      return successResponse(res, { checkoutUrl: result.checkoutUrl });
    } catch (err: any) {
      console.error('Error creando orden PayPal:', err);
      await captureBackendException(err, 'paypal-order:create', { userId, plan });
      return errorResponse(res, 500, err?.message || 'No se pudo crear la orden de pago con PayPal');
    }
  }

  if (action === 'capture') {
    const { orderId } = req.body || {};
    if (!orderId) return errorResponse(res, 400, 'Falta orderId');

    const env = (process.env.PAYPAL_ENV || 'live').toLowerCase();
    const baseUrl = env === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
    const auth64 = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');

    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth64}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return errorResponse(res, 500, `Error de autenticación con PayPal: ${errText}`);
    }

    const tokenData: any = await tokenRes.json();

    const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenData.access_token}`, 'Content-Type': 'application/json' },
    });
    const captureData: any = await captureRes.json();

    if (!captureRes.ok) {
      return errorResponse(res, 500, captureData.message || 'No se pudo capturar el pago de PayPal');
    }

    return successResponse(res, { status: captureData.status, details: captureData });
  }

  return errorResponse(res, 400, 'Acción no válida');
}
