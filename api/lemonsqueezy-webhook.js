// api/lemonsqueezy-webhook.js
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { applyPayment } from './_lib/applyPayment.js';

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
    try {
      await applyPayment(supabaseAdmin, {
        userId,
        email,
        plan,
        metodoPago: 'lemonsqueezy',
        externalId: event.data?.id,
        amount: event.data?.attributes?.total_formatted,
      });
    } catch (err) {
      console.error('Error activando plan (Lemon Squeezy):', err);
    }
  }

  return res.status(200).end();
}
