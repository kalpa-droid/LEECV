// api/mercadopago-webhook.js
import { createClient } from '@supabase/supabase-js';

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

      if (plan === 'single_pdf') {
        // Otorgar 1 crédito de exportación PDF A4
        const { data: existing } = await supabaseAdmin
          .from('pdf_export_credits')
          .select('credits')
          .eq('user_id', userId)
          .single();

        const newCredits = (existing?.credits || 0) + 1;
        await supabaseAdmin
          .from('pdf_export_credits')
          .upsert({ user_id: userId, credits: newCredits, updated_at: new Date().toISOString() });
      } else {
        // Activar suscripción Pro o Enterprise por 30 días
        const vence = new Date();
        vence.setMonth(vence.getMonth() + 1);

        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ 
            plan: plan, 
            plan_vence: vence.toISOString(), 
            premium_activo: true, 
            premium_vence: vence.toISOString(), 
            metodo_pago: 'mercadopago' 
          })
          .eq('id', userId);

        if (error) console.error('Error activando plan en webhook MP:', error);
      }
    }

    return res.status(200).end();
  } catch (err) {
    console.error('Error en webhook MP:', err);
    return res.status(500).end();
  }
}
