import type { PaymentProvider, ProviderStatus, WebhookVerifyContext } from './types.js';
import type { PaymentDetails, PlanType } from '../applyPayment.js';

function getPaypalApiUrl(): string {
  const env = (process.env.PAYPAL_ENV || 'live').toLowerCase();
  return env === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
}

async function getPaypalAccessToken(): Promise<string> {
  const baseUrl = getPaypalApiUrl();
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data: any = await res.json();
  if (!res.ok) throw new Error(`PayPal OAuth failed: ${data.error_description || data.error || res.status}`);
  return data.access_token;
}

export const paypalProvider: PaymentProvider = {
  id: 'paypal',
  requiresRawBody: false,

  diagnose: async (_forcePing: boolean): Promise<ProviderStatus> => {
    const missing: string[] = [];
    if (!process.env.PAYPAL_CLIENT_ID) missing.push('PAYPAL_CLIENT_ID');
    if (!process.env.PAYPAL_CLIENT_SECRET) missing.push('PAYPAL_CLIENT_SECRET');
    if (!process.env.PAYPAL_WEBHOOK_ID) missing.push('PAYPAL_WEBHOOK_ID');

    if (missing.length > 0) {
      return { status: 'missing_vars', label: `Faltan variables: ${missing.join(', ')}`, missingVars: missing };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const accessToken = await getPaypalAccessToken();
      const baseUrl = getPaypalApiUrl();
      const webhookId = process.env.PAYPAL_WEBHOOK_ID;

      const webhookRes = await fetch(`${baseUrl}/v1/notifications/webhooks/${webhookId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (webhookRes.ok) {
        return { status: 'active', label: 'Credenciales & Webhook ID verificados', missingVars: [] };
      }
      if (webhookRes.status === 404) {
        return { status: 'webhook_not_found', label: 'Webhook ID no existe en PayPal (404)', missingVars: [] };
      }
      return { status: 'error', label: `Webhook PayPal no verificado (${webhookRes.status})`, missingVars: [] };
    } catch (err: any) {
      clearTimeout(timeoutId);
      return {
        status: 'error',
        label: err.name === 'AbortError' ? 'Timeout conectando a PayPal (5s)' : (err.message || 'Error de red con PayPal'),
        missingVars: [],
      };
    }
  },

  verifyWebhook: async ({ req, parsedBody }: WebhookVerifyContext): Promise<boolean> => {
    try {
      const accessToken = await getPaypalAccessToken();
      const baseUrl = getPaypalApiUrl();
      const body = {
        auth_algo: req.headers['paypal-auth-algo'],
        cert_url: req.headers['paypal-cert-url'],
        transmission_id: req.headers['paypal-transmission-id'],
        transmission_sig: req.headers['paypal-transmission-sig'],
        transmission_time: req.headers['paypal-transmission-time'],
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: parsedBody,
      };

      const res = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data: any = await res.json();
      return data.verification_status === 'SUCCESS';
    } catch (err) {
      console.error('[PayPal Verify Error]:', err);
      return false;
    }
  },

  extractPaymentData: async ({ parsedBody: event }: WebhookVerifyContext): Promise<PaymentDetails | null> => {
    const eventType = event?.event_type;
    if (eventType !== 'PAYMENT.CAPTURE.COMPLETED' && eventType !== 'BILLING.SUBSCRIPTION.PAYMENT.COMPLETED') {
      return null;
    }

    const resource = event.resource || {};
    const customId = resource.custom_id || resource.subscriber?.custom_id || '';
    const payerEmail = resource.payer?.email_address || resource.subscriber?.email_address;

    let userId: string | undefined = customId || undefined;
    let rawPlan = 'pro';

    try {
      const parsed = JSON.parse(customId);
      userId = parsed.userId || userId;
      rawPlan = parsed.plan || 'pro';
    } catch {
      userId = customId || undefined;
    }

    if (!userId && !payerEmail) return null;

    const validPlans: PlanType[] = ['single_pdf', 'credits_pack_5', 'credits_pack_10', 'pro', 'enterprise'];
    const plan: PlanType = validPlans.includes(rawPlan as any) ? (rawPlan as PlanType) : 'pro';

    return {
      userId,
      email: payerEmail,
      plan,
      metodoPago: 'paypal',
      externalId: String(resource.id),
      amount: resource.amount?.value,
      currency: resource.amount?.currency_code || 'USD',
      details: event,
    };
  },
};
