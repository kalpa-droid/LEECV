import crypto from 'crypto';
import type { PaymentProvider, ProviderStatus, WebhookVerifyContext } from './types.js';
import type { PaymentDetails } from '../applyPayment.js';
import { parsePlanReference } from './planReference.js';
import { env } from '../config/env.js';

export const mercadoPagoProvider: PaymentProvider = {
  id: 'mercadopago',
  requiresRawBody: false,

  diagnose: async (_forcePing: boolean): Promise<ProviderStatus> => {
    const missing: string[] = [];
    if (!env.MP_ACCESS_TOKEN) missing.push('MP_ACCESS_TOKEN');
    if (!env.MP_WEBHOOK_SECRET) missing.push('MP_WEBHOOK_SECRET');

    if (missing.length > 0) {
      return { status: 'missing_vars', label: `Faltan variables: ${missing.join(', ')}`, missingVars: missing };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch('https://api.mercadopago.com/users/me', {
        headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` },
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
    const secret = env.MP_WEBHOOK_SECRET;
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

    // data.id del webhook nuevo (JSON body) o id del IPN legacy (?topic=payment&id=...).
    // El manifest HMAC se arma con el id del recurso en ambos casos.
    const dataId =
      (req.query?.['data.id'] as string) ||
      parsedBody?.data?.id ||
      req.body?.data?.id ||
      (req.query?.topic ? (req.query?.id as string) : undefined);
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

  extractPaymentData: async ({ parsedBody, req }: WebhookVerifyContext): Promise<PaymentDetails | null> => {
    // Webhook nuevo: JSON { type: 'payment', data: { id } }.
    // IPN legacy: query ?topic=payment&id=... (también se procesa para que una
    // configuración de notificaciones heredada no quede ignorada en silencio).
    const { type, data } = parsedBody || {};
    const topic = String(req?.query?.topic || req?.query?.type || '');
    const legacyId = (req?.query?.id as string) || (req?.query?.['data.id'] as string);
    const paymentId = (type === 'payment' ? data?.id : null) || (topic.includes('payment') ? legacyId : null);
    if (!paymentId) return null;

    const mpToken = env.MP_ACCESS_TOKEN;
    if (!mpToken) return null;

    // encodeURIComponent: el id llega de la URL/fuera de nuestro control.
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(paymentId))}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });
    if (!paymentRes.ok) return null;
    const payment: any = await paymentRes.json();

    // Estados que todavía no acreditan pero deben quedar en la bandeja de
    // retenidos para reintentar cuando la pasarela confirme el cobro.
    const pendingStatuses = new Set(['pending', 'in_process', 'authorized', 'in_mediation']);
    if (payment.status !== 'approved' && !pendingStatuses.has(payment.status)) return null;

    const parsedRef = await parsePlanReference(payment.external_reference, 'mercadopago', String(payment.id));

    // Dinero cobrado sin referencia utilizable: NO descartar en silencio.
    // El webhook responde 200 'ignored' y la pasarela NO reintenta: sin esto,
    // el pago quedaría cobrado sin ningún rastro local. providerStatus
    // 'pending' lo retiene en pending_grants + notificación + alerta admin.
    if (!parsedRef) {
      return {
        exportToken: null,
        email: payment.payer?.email ?? null,
        userId: null,
        plan: 'unknown',
        metodoPago: 'mercadopago',
        externalId: String(payment.id),
        amount: payment.transaction_amount,
        currency: payment.currency_id || 'ARS',
        details: payment,
        providerStatus: 'pending',
      };
    }

    const payerEmail = payment.payer?.email;
    if (!parsedRef.exportToken && !payerEmail && !parsedRef.userId) {
      return {
        exportToken: null,
        email: payerEmail ?? null,
        userId: parsedRef.userId ?? null,
        plan: parsedRef.plan,
        metodoPago: 'mercadopago',
        externalId: String(payment.id),
        amount: payment.transaction_amount,
        currency: payment.currency_id || 'ARS',
        details: payment,
        providerStatus: 'pending',
      };
    }

    return {
      exportToken: parsedRef.exportToken,
      email: payerEmail,
      userId: parsedRef.userId,
      plan: parsedRef.plan,
      metodoPago: 'mercadopago',
      externalId: String(payment.id),
      amount: payment.transaction_amount,
      currency: payment.currency_id || 'ARS',
      details: payment,
      providerStatus: payment.status === 'approved' ? 'approved' : 'pending',
    };
  },
};
