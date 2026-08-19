// api/lemonsqueezy-webhook.js
// Requiere env vars: LEMONSQUEEZY_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Configurá este webhook en Lemon Squeezy > Settings > Webhooks, eventos:
// order_created (pago único) y/o subscription_payment_success (suscripción)

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Vercel necesita el body crudo para verificar la firma
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

  // Verificar firma HMAC para confirmar que el webhook viene realmente de Lemon Squeezy
  const signature = req.headers['x-signature'];
  const hmac = crypto.createHmac('sha256', process.env.LEMONSQUEEZY_WEBHOOK_SECRET);
  const digest = hmac.update(rawBody).digest('hex');
  if (signature !== digest) return res.status(401).json({ error: 'Firma inválida' });

  const event = JSON.parse(rawBody);
  const eventName = event.meta?.event_name;
  const email = event.data?.attributes?.user_email || event.data?.attributes?.customer_email;
  // custom_data.user_id se manda al crear el checkout (ver paymentService.js)
  const userId = event.meta?.custom_data?.user_id;

  if (
    (eventName === 'order_created' || eventName === 'subscription_payment_success') &&
    (userId || email)
  ) {
    const vence = new Date();
    vence.setMonth(vence.getMonth() + 1);

    const query = supabaseAdmin
      .from('profiles')
      .update({ premium_activo: true, premium_vence: vence.toISOString(), metodo_pago: 'lemonsqueezy' });

    const { error } = userId ? await query.eq('id', userId) : await query.eq('email', email);
    if (error) console.error('Error activando premium (Lemon Squeezy):', error);
  }

  return res.status(200).end();
}
