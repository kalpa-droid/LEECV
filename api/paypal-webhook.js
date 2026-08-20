// api/paypal-webhook.js
//
// PayPal manda el evento y hay que verificarlo contra su API antes de
// confiar en él (a diferencia del hmac de Lemon Squeezy, PayPal usa un
// endpoint de verificación de firma propio).
import { createClient } from '@supabase/supabase-js';
import { applyPayment } from './_lib/applyPayment.js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PAYPAL_API = process.env.PAYPAL_ENV === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

async function getPaypalAccessToken() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  return data.access_token;
}

async function verifyWebhookSignature(req, accessToken) {
  const body = {
    auth_algo: req.headers['paypal-auth-algo'],
    cert_url: req.headers['paypal-cert-url'],
    transmission_id: req.headers['paypal-transmission-id'],
    transmission_sig: req.headers['paypal-transmission-sig'],
    transmission_time: req.headers['paypal-transmission-time'],
    webhook_id: process.env.PAYPAL_WEBHOOK_ID,
    webhook_event: req.body,
  };

  const res = await fetch(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.verification_status === 'SUCCESS';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).end();

  try {
    const accessToken = await getPaypalAccessToken();
    const isValid = await verifyWebhookSignature(req, accessToken);
    if (!isValid) {
      console.warn('Firma de webhook PayPal inválida, evento ignorado.');
      return res.status(200).end();
    }

    const event = req.body;
    const eventType = event.event_type;

    // PAYMENT.CAPTURE.COMPLETED cubre tanto el pago único (créditos)
    // como la primera cuota de una suscripción.
    if (eventType === 'PAYMENT.CAPTURE.COMPLETED' || eventType === 'BILLING.SUBSCRIPTION.PAYMENT.COMPLETED') {
      const resource = event.resource || {};
      const customId = resource.custom_id || resource.subscriber?.custom_id || '';

      let userId, plan = 'pro';
      try {
        const parsed = JSON.parse(customId);
        userId = parsed.userId;
        plan = parsed.plan || 'pro';
      } catch {
        userId = customId; // fallback: custom_id era directamente el userId
      }

      if (userId) {
        await applyPayment(supabaseAdmin, {
          userId,
          plan,
          metodoPago: 'paypal',
          externalId: resource.id,
          amount: resource.amount?.value,
          currency: resource.amount?.currency_code,
        });
      }
    }

    return res.status(200).end();
  } catch (err) {
    console.error('Error en webhook PayPal:', err);
    return res.status(500).end();
  }
}
