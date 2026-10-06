import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createWebhookHandler } from './_lib/webhookHandler.js';
import { mercadoPagoProvider } from './_lib/paymentProviders/mercadopago.js';
import { paypalProvider } from './_lib/paymentProviders/paypal.js';
import { lemonSqueezyProvider } from './_lib/paymentProviders/lemonsqueezy.js';
import { errorResponse } from './_lib/apiResponse.js';
import { requireRateLimit } from './_lib/rateLimiter.js';

export const config = { api: { bodyParser: false } };

const mpHandler = createWebhookHandler({
  provider: 'mercadopago',
  rawBody: true,
  verifySignature: (ctx) => mercadoPagoProvider.verifyWebhook(ctx),
  extractPaymentDetails: (ctx) => mercadoPagoProvider.extractPaymentData(ctx),
});

const paypalHandler = createWebhookHandler({
  provider: 'paypal',
  rawBody: true,
  verifySignature: (ctx) => paypalProvider.verifyWebhook(ctx),
  extractPaymentDetails: (ctx) => paypalProvider.extractPaymentData(ctx),
});

const lsHandler = createWebhookHandler({
  provider: 'lemonsqueezy',
  rawBody: true,
  verifySignature: (ctx) => lemonSqueezyProvider.verifyWebhook(ctx),
  extractPaymentDetails: (ctx) => lemonSqueezyProvider.extractPaymentData(ctx),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Rate limiter based on IP
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const ok = await requireRateLimit(req, res, `webhook:ip:${ip}`, { maxRequests: 50, windowSeconds: 60 });
  if (!ok) return;

  const provider = (req.query.provider as string) || (req.query.gateway as string);

  if (provider === 'mercadopago') {
    return mpHandler(req, res);
  }
  if (provider === 'paypal') {
    return paypalHandler(req, res);
  }
  if (provider === 'lemonsqueezy') {
    return lsHandler(req, res);
  }

  return errorResponse(res, 400, 'Proveedor de webhook no válido o no especificado');
}
