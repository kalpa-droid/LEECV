import crypto from 'crypto';
import type { PaymentProvider, ProviderStatus, WebhookVerifyContext } from './types.js';
import type { PaymentDetails, PlanType } from '../applyPayment.js';
import { captureBackendException } from '../sentryBackend.js';

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

    if (!userId && !email) return null;

    // Mapa de variantes numéricas de Lemon Squeezy a PlanType de LEECV
    const variantIdMap: Record<string, PlanType> = {};
    if (process.env.LS_VARIANT_SINGLE_PDF) variantIdMap[process.env.LS_VARIANT_SINGLE_PDF] = 'single_pdf';
    if (process.env.LS_VARIANT_PACK5) variantIdMap[process.env.LS_VARIANT_PACK5] = 'credits_pack_5';
    if (process.env.LS_VARIANT_PACK10) variantIdMap[process.env.LS_VARIANT_PACK10] = 'credits_pack_10';
    if (process.env.LS_VARIANT_PRO) variantIdMap[process.env.LS_VARIANT_PRO] = 'pro';
    if (process.env.LS_VARIANT_ENTERPRISE) variantIdMap[process.env.LS_VARIANT_ENTERPRISE] = 'enterprise';

    // order_created trae la variante en first_order_item; suscripciones en attributes.variant_id
    const rawVariantId = String(
      event.data?.attributes?.first_order_item?.variant_id ??
      event.data?.attributes?.variant_id ??
      ''
    );

    const validPlans: PlanType[] = ['single_pdf', 'credits_pack_5', 'credits_pack_10', 'pro', 'enterprise'];
    const customPlan = event.meta?.custom_data?.plan;

    // 1. Prioridad a la variante real recibida de Lemon Squeezy
    // 2. Fallback a custom_data.plan si es un plan válido
    // 3. Si ninguno se reconoce, NO asignar 'pro' por defecto -> retornar null para evitar regalar suscripciones por error
    const plan: PlanType | undefined =
      variantIdMap[rawVariantId] ||
      (validPlans.includes(customPlan as any) ? (customPlan as PlanType) : undefined);

    if (!plan) {
      console.warn(`[LEMON SQUEEZY WEBHOOK] Variante o plan no reconocido (variant_id: ${rawVariantId}, custom_plan: ${customPlan}). Evento omitido.`);
      await captureBackendException(
        new Error(`Lemon Squeezy: pago recibido con variant_id "${rawVariantId}" no mapeado a ningún plan`),
        'lemonsqueezy_unrecognized_variant',
        { rawVariantId, customPlan, orderId: event.data?.id, email }
      );
      return null;
    }

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
