import crypto from 'crypto';
import type { PaymentProvider, ProviderStatus, WebhookVerifyContext } from './types.js';
import type { PaymentDetails, PlanType } from '../applyPayment.js';

export const lemonSqueezyProvider: PaymentProvider = {
  id: 'lemonsqueezy',
  requiresRawBody: true,

  diagnose: async (_forcePing: boolean): Promise<ProviderStatus> => {
    const missing: string[] = [];
    if (!process.env.LEMONSQUEEZY_API_KEY) missing.push('LEMONSQUEEZY_API_KEY');
    if (!process.env.LEMONSQUEEZY_WEBHOOK_SECRET) missing.push('LEMONSQUEEZY_WEBHOOK_SECRET');

    if (missing.length > 0) {
      return { status: 'missing_vars', label: `Faltan variables: ${missing.join(', ')}`, missingVars: missing };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch('https://api.lemonsqueezy.com/v1/stores', {
        headers: { Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}` },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return { status: 'active', label: 'API Key Lemon Squeezy verificada', missingVars: [] };
      }
      if (response.status === 401 || response.status === 403) {
        return { status: 'invalid_credentials', label: 'API Key de Lemon Squeezy inválida (401)', missingVars: [] };
      }
      return { status: 'error', label: `Respuesta inesperada de Lemon Squeezy (${response.status})`, missingVars: [] };
    } catch (err: any) {
      clearTimeout(timeoutId);
      return {
        status: 'error',
        label: err.name === 'AbortError' ? 'Timeout conectando a Lemon Squeezy (5s)' : 'Error de red con Lemon Squeezy',
        missingVars: [],
      };
    }
  },

  verifyWebhook: async ({ rawBody, req }: WebhookVerifyContext): Promise<boolean> => {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!secret) return false;

    const signature = req.headers['x-signature'] as string | undefined;
    if (!signature) return false;

    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(rawBody || '').digest('hex');

    const sigBuffer = Buffer.from(signature, 'hex');
    const digestBuffer = Buffer.from(digest, 'hex');

    return (
      sigBuffer.length === digestBuffer.length &&
      crypto.timingSafeEqual(sigBuffer, digestBuffer)
    );
  },

  extractPaymentData: async ({ parsedBody: event }: WebhookVerifyContext): Promise<PaymentDetails | null> => {
    const eventName = event?.meta?.event_name;
    if (eventName !== 'order_created' && eventName !== 'subscription_payment_success') {
      return null;
    }

    const email = event.data?.attributes?.user_email || event.data?.attributes?.customer_email;
    const userId = event.meta?.custom_data?.user_id;
    const rawPlan = event.meta?.custom_data?.plan || 'pro';

    if (!userId && !email) return null;

    const validPlans: PlanType[] = ['single_pdf', 'credits_pack_5', 'credits_pack_10', 'pro', 'enterprise'];
    const plan: PlanType = validPlans.includes(rawPlan as any) ? (rawPlan as PlanType) : 'pro';

    // Lemon Squeezy expresa el monto total en centavos (ej: 22800 = $228.00)
    const rawTotal = event.data?.attributes?.total;
    const amount = typeof rawTotal === 'number' ? rawTotal / 100 : rawTotal;

    return {
      userId: userId || undefined,
      email,
      plan,
      metodoPago: 'lemonsqueezy',
      externalId: String(event.data?.id),
      amount,
      currency: event.data?.attributes?.currency || 'USD',
      details: event,
    };
  },
};
