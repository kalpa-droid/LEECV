// api/mercadopago-webhook.js
// Recibe la notificación de Mercado Pago y activa premium en Supabase.
// Requiere env vars: MP_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// OJO: acá usamos la SERVICE ROLE KEY (nunca la anon key), y esta función corre
// SOLO en el servidor — nunca expongas la service role key al frontend.

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).end(); // MP a veces hace pings GET

  try {
    const { type, data } = req.body || {};
    if (type !== 'payment') return res.status(200).end();

    // Confirmar el pago contra la API de MP (nunca confiar ciegamente en el body del webhook)
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    const payment = await paymentRes.json();

    if (payment.status === 'approved') {
      const userId = payment.external_reference;
      const vence = new Date();
      vence.setMonth(vence.getMonth() + 1); // suscripción mensual

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ premium_activo: true, premium_vence: vence.toISOString(), metodo_pago: 'mercadopago' })
        .eq('id', userId);

      if (error) console.error('Error activando premium:', error);
    }

    return res.status(200).end();
  } catch (err) {
    console.error('Error en webhook MP:', err);
    return res.status(500).end();
  }
}
