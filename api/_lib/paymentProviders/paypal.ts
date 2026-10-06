import type { PaymentProvider, ProviderStatus, WebhookVerifyContext } from './types.js';
import type { PaymentDetails, PlanType } from '../applyPayment.js';
import { parsePlanReference } from './planReference.js';
import { env as configEnv } from '../config/env.js';

function getPaypalApiUrl(): string {
  const envVar = configEnv.PAYPAL_ENV.toLowerCase();
  return envVar === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
}

async function getPaypalAccessToken(): Promise<string> {
  const baseUrl = getPaypalApiUrl();
  const auth = Buffer.from(`${configEnv.PAYPAL_CLIENT_ID}:${configEnv.PAYPAL_CLIENT_SECRET}`).toString('base64');
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
    if (!configEnv.PAYPAL_CLIENT_ID) missing.push('PAYPAL_CLIENT_ID');
    if (!configEnv.PAYPAL_CLIENT_SECRET) missing.push('PAYPAL_CLIENT_SECRET');
    if (!configEnv.PAYPAL_WEBHOOK_ID) missing.push('PAYPAL_WEBHOOK_ID');

    if (missing.length > 0) {
      return { status: 'missing_vars', label: `Faltan variables: ${missing.join(', ')}`, missingVars: missing };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const accessToken = await getPaypalAccessToken();
      const baseUrl = getPaypalApiUrl();
      const webhookId = configEnv.PAYPAL_WEBHOOK_ID;

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
        webhook_id: configEnv.PAYPAL_WEBHOOK_ID,
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
    const resource = event?.resource || {};

    if (eventType === 'BILLING.SUBSCRIPTION.CANCELLED') {
      const { serverDal } = await import('../serverDal.js');
      await serverDal.profiles.downgradeSubscription({ paypal_subscription_id: String(resource.id) });
      console.log(`[PayPal] Suscripción ${resource.id} cancelada, downgrade a free.`);
      return null;
    }

    if (eventType !== 'PAYMENT.CAPTURE.COMPLETED' && eventType !== 'BILLING.SUBSCRIPTION.PAYMENT.COMPLETED') {
      return null;
    }


    const customId = resource.custom_id || resource.subscriber?.custom_id || '';
    const payerEmail = resource.payer?.email_address || resource.subscriber?.email_address;
    
    // In some cases (e.g. PAYMENT.CAPTURE.COMPLETED), payer email is nested in another object or missing if guest checkout
    const emailToUse = payerEmail || undefined;

    const parsedRef = await parsePlanReference(customId, 'paypal', String(resource.id));
    if (!parsedRef) {
      return null;
    }

    if (!parsedRef.exportToken && !emailToUse && !parsedRef.userId) return null;

    let amount = resource.amount?.value;
    let currency = resource.amount?.currency_code || 'USD';
    
    // If it's a billing subscription payment, the amount structure might be different
    if (eventType === 'BILLING.SUBSCRIPTION.PAYMENT.COMPLETED' && resource.amount) {
      amount = resource.amount.total?.value || resource.amount.value;
      currency = resource.amount.total?.currency_code || resource.amount.currency_code || 'USD';
    }

    return {
      exportToken: parsedRef.exportToken,
      email: emailToUse,
      userId: parsedRef.userId,
      plan: parsedRef.plan as PlanType,
      metodoPago: 'paypal',
      externalId: String(resource.id),
      amount: amount,
      currency: currency,
      subscriptionId: resource.billing_agreement_id || null,
      details: event,
    };
  },
};
