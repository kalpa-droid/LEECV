import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { applyPayment } from './_lib/applyPayment.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(200).end();

  try {
    const { type, data } = req.body || {};
    if (type !== 'payment') return res.status(200).end();

    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    const payment: any = await paymentRes.json();

    if (payment.status === 'approved') {
      let userId = payment.external_reference;
      let plan: any = 'pro';

      try {
        const parsedRef = JSON.parse(payment.external_reference);
        if (parsedRef?.userId) {
          userId = parsedRef.userId;
          plan = parsedRef.plan || 'pro';
        }
      } catch {}

      await applyPayment(supabaseAdmin, {
        userId,
        plan,
        metodoPago: 'mercadopago',
        externalId: String(payment.id),
        amount: payment.transaction_amount,
        currency: payment.currency_id,
      });
    }

    return res.status(200).end();
  } catch (err: any) {
    console.error('Error en webhook MP:', err);
    return res.status(500).end();
  }
}
