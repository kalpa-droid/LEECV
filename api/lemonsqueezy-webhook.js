// api/lemonsqueezy-webhook.js
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = { api: { bodyParser: false } };

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);

  const signature = req.headers['x-signature'];
  const hmac = crypto.createHmac('sha256', process.env.LEMONSQUEEZY_WEBHOOK_SECRET);
  const digest = hmac.update(rawBody).digest('hex');
  if (signature !== digest) return res.status(401).json({ error: 'Firma inválida' });

  const event = JSON.parse(rawBody);
  const eventName = event.meta?.event_name;
  const email = event.data?.attributes?.user_email || event.data?.attributes?.customer_email;
  const userId = event.meta?.custom_data?.user_id;
  const plan = event.meta?.custom_data?.plan || 'pro';

  if (
    (eventName === 'order_created' || eventName === 'subscription_payment_success') &&
    (userId || email)
  ) {
    if (plan === 'single_pdf') {
      if (userId) {
        const { data: existing } = await supabaseAdmin
          .from('pdf_export_credits')
          .select('credits')
          .eq('user_id', userId)
          .single();

        const newCredits = (existing?.credits || 0) + 1;
        await supabaseAdmin
          .from('pdf_export_credits')
          .upsert({ user_id: userId, credits: newCredits, updated_at: new Date().toISOString() });
      }
    } else {
      const vence = new Date();
      vence.setMonth(vence.getMonth() + 1);

      const query = supabaseAdmin
        .from('profiles')
        .update({ 
          plan: plan, 
          plan_vence: vence.toISOString(), 
          premium_activo: true, 
          premium_vence: vence.toISOString(), 
          metodo_pago: 'lemonsqueezy' 
        });

      const { error } = userId ? await query.eq('id', userId) : await query.eq('email', email);
      if (error) console.error('Error activando plan (Lemon Squeezy):', error);
    }
  }

  return res.status(200).end();
}
