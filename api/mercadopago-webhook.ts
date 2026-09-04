import type { VercelRequest } from '@vercel/node';
import crypto from 'crypto';
import { createWebhookHandler } from './_lib/webhookHandler.js';

export default createWebhookHandler({
  provider: 'mercadopago',
  verifySignature: async (req: VercelRequest) => {
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) {
      console.warn('[MercadoPago Webhook]: MP_WEBHOOK_SECRET no está configurado');
      // En producción, exigir siempre el secreto
      if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
        return false;
      }
      return true;
    }

    const xSignature = req.headers['x-signature'] as string | undefined;
    const xRequestId = req.headers['x-request-id'] as string | undefined;
    if (!xSignature || !xRequestId) return false;

    const dataId = (req.query?.['data.id'] as string) || req.body?.data?.id;
    if (!dataId) return false;

    const parts = Object.fromEntries(
      xSignature.split(',').map((p) => {
        const [k, ...v] = p.trim().split('=');
        return [k.trim(), v.join('=').trim()];
      })
    );

    const ts = parts.ts;
    const receivedHash = parts.v1;
    if (!ts || !receivedHash) return false;

    const manifest = `id:${String(dataId).toLowerCase()};request-id:${xRequestId};ts:${ts};`;
    const computedHash = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');

    const receivedBuf = Buffer.from(receivedHash, 'hex');
    const computedBuf = Buffer.from(computedHash, 'hex');

    return (
      receivedBuf.length === computedBuf.length &&
      crypto.timingSafeEqual(receivedBuf, computedBuf)
    );
  },
  extractPaymentDetails: async (req: VercelRequest) => {
    const { type, data } = req.body || {};
    if (type !== 'payment' || !data?.id) return null;

    const mpToken = process.env.MP_ACCESS_TOKEN;
    if (!mpToken) return null;

    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });
    const payment: any = await paymentRes.json();

    if (payment.status !== 'approved') return null;

    let userId = payment.external_reference;
    let plan: any = 'pro';

    try {
      const parsedRef = JSON.parse(payment.external_reference);
      if (parsedRef?.userId) {
        userId = parsedRef.userId;
        plan = parsedRef.plan || 'pro';
      }
    } catch {}

    return {
      userId,
      plan,
      metodoPago: 'mercadopago',
      externalId: String(payment.id),
      amount: payment.transaction_amount,
      currency: payment.currency_id,
    };
  },
});
