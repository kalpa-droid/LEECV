import type { VercelRequest } from '@vercel/node';
import { createWebhookHandler } from './_lib/webhookHandler.js';

export default createWebhookHandler({
  provider: 'mercadopago',
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
