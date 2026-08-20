// api/mercadopago-webhook.js
import { createClient } from '@supabase/supabase-js';
import { applyPayment } from './_lib/applyPayment.js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).end();

  try {
    const { type, data } = req.body || {};
    if (type !== 'payment') return res.status(200).end();

    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    const payment = await paymentRes.json();

    if (payment.status === 'approved') {
      let userId = payment.external_reference;
      let plan = 'pro';

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
        externalId: payment.id,
        amount: payment.transaction_amount,
        currency: payment.currency_id,
      });
    }

    return res.status(200).end();
  } catch (err) {
    console.error('Error en webhook MP:', err);
    return res.status(500).end();
  }
}
