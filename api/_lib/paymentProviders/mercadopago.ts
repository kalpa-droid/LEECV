import crypto from 'crypto';
import type { PaymentProvider, ProviderStatus, WebhookVerifyContext } from './types.js';
import type { PaymentDetails, PlanType } from '../applyPayment.js';

export const mercadoPagoProvider: PaymentProvider = {
  id: 'mercadopago',
  requiresRawBody: false,

  diagnose: async (_forcePing: boolean): Promise<ProviderStatus> => {
    const missing: string[] = [];
    if (!process.env.MP_ACCESS_TOKEN) missing.push('MP_ACCESS_TOKEN');
    if (!process.env.MP_WEBHOOK_SECRET) missing.push('MP_WEBHOOK_SECRET');

    if (missing.length > 0) {
      return { status: 'missing_vars', label: `Faltan variables: ${missing.join(', ')}`, missingVars: missing };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch('https://api.mercadopago.com/users/me', {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return { status: 'active', label: 'Token verificado (OAuth me OK)', missingVars: [] };
      }
      if (response.status === 401 || response.status === 403) {
        return { status: 'invalid_credentials', label: 'Token MP inválido o revocado (401/403)', missingVars: [] };
      }
      return { status: 'error', label: `Respuesta inesperada de MP (${response.status})`, missingVars: [] };
    } catch (err: any) {
      clearTimeout(timeoutId);
      return {
        status: 'error',
        label: err.name === 'AbortError' ? 'Timeout conectando a Mercado Pago (5s)' : 'Error de red con Mercado Pago',
        missingVars: [],
      };
    }
  },

  verifyWebhook: async ({ req, parsedBody }: WebhookVerifyContext): Promise<boolean> => {
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) {
      console.warn('[MercadoPago Webhook]: MP_WEBHOOK_SECRET no está configurado');
      if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
        return false;
      }
      return true;
    }

    const xSignature = req.headers['x-signature'] as string | undefined;
    const xRequestId = req.headers['x-request-id'] as string | undefined;
    if (!xSignature || !xRequestId) return false;

    const dataId = (req.query?.['data.id'] as string) || parsedBody?.data?.id || req.body?.data?.id;
    if (!dataId) return false;

    const parts = Object.fromEntries(
      xSignature.split(',').map((p) => {
        const [k, ...v] = p.trim().split('=');
        return [k.trim(), v.join('=').trim()];
      })
    );

    const ts = parts.ts;
    const receivedHash = parts.v1;
    if (!ts || !receivedHash) return false;

    const manifest = `id:${String(dataId).toLowerCase()};request-id:${xRequestId};ts:${ts};`;
    const computedHash = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');

    const receivedBuf = Buffer.from(receivedHash, 'hex');
    const computedBuf = Buffer.from(computedHash, 'hex');

    return (
      receivedBuf.length === computedBuf.length &&
      crypto.timingSafeEqual(receivedBuf, computedBuf)
    );
  },

  extractPaymentData: async ({ parsedBody }: WebhookVerifyContext): Promise<PaymentDetails | null> => {
    const { type, data } = parsedBody || {};
    if (type !== 'payment' || !data?.id) return null;

    const mpToken = process.env.MP_ACCESS_TOKEN;
    if (!mpToken) return null;

    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });
    const payment: any = await paymentRes.json();

    if (payment.status !== 'approved') return null;

    let userId: string | undefined;
    let rawPlan = 'pro';

    if (payment.external_reference) {
      try {
        const refObj = JSON.parse(payment.external_reference);
        userId = refObj.userId;
        rawPlan = refObj.plan || 'pro';
      } catch {
        userId = payment.external_reference;
      }
    }

    const payerEmail = payment.payer?.email;
    if (!userId && !payerEmail) return null;

    const validPlans: PlanType[] = ['single_pdf', 'credits_pack_5', 'credits_pack_10', 'pro', 'enterprise'];
    const plan: PlanType = validPlans.includes(rawPlan as any) ? (rawPlan as PlanType) : 'pro';

    return {
      userId,
      email: payerEmail,
      plan,
      metodoPago: 'mercadopago',
      externalId: String(payment.id),
      amount: payment.transaction_amount,
      currency: payment.currency_id || 'ARS',
      details: payment,
    };
  },
};
