import type { VercelRequest, VercelResponse } from '@vercel/node';
import { errorResponse, successResponse } from './_lib/apiResponse.js';
import { requireRateLimit } from './_lib/rateLimiter.js';
import { createCheckoutForProvider } from './_lib/paymentProviders/checkoutInitiators.js';
import { parsePlanReference } from './_lib/paymentProviders/planReference.js';
import { applyPayment } from './_lib/applyPayment.js';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { captureBackendException } from './_lib/sentryBackend.js';
import { dispatchWaAlert } from './_lib/whatsappAlert.js';
import { resolveCheckoutIdentity } from './_lib/checkoutIdentity.js';

/**
 * ACREDITACIÓN INMEDIATA tras una captura COMPLETED (idempotente): usa el
 * MISMO capture.id que el webhook PAYMENT.CAPTURE.COMPLETED como clave
 * (provider, external_id), así webhook y captura nunca duplican créditos.
 * Se reutiliza también en capturas repetidas (ORDER_ALREADY_CAPTURED) por
 * si la primera request murió justo entre la captura y el applyPayment.
 */
async function acreditarCapturaPayPal(captureData: any, orderId: string): Promise<void> {
  const capture = captureData?.purchase_units?.[0]?.payments?.captures?.[0];
  const payerEmail = captureData?.payer?.email_address;
  const customId = capture?.custom_id || captureData?.purchase_units?.[0]?.custom_id || '';

  if (captureData?.status !== 'COMPLETED' || !capture?.id) return;

  try {
    const parsedRef = await parsePlanReference(customId, 'paypal', String(capture.id));
    if (parsedRef && (parsedRef.exportToken || payerEmail || parsedRef.userId)) {
      await applyPayment(supabaseAdmin, {
        exportToken: parsedRef.exportToken ?? null,
        email: payerEmail ?? null,
        userId: parsedRef.userId ?? null,
        plan: parsedRef.plan,
        metodoPago: 'paypal',
        externalId: String(capture.id),
        amount: capture.amount?.value !== undefined ? Number(capture.amount.value) : null,
        currency: capture.amount?.currency_code || 'USD',
        details: captureData,
        providerStatus: 'approved',
      });
    }
  } catch (applyErr: any) {
    // La acreditación fallida NO invalida la captura (el dinero ya fue
    // cobrado): el webhook sigue siendo la red de seguridad y la fila queda
    // 'pending' en processed_payments. Escalamiento inmediato al admin.
    console.error('[paypal-order] Error acreditando tras captura:', applyErr?.message || applyErr);
    await captureBackendException(applyErr, 'paypal-order:capture:applyPayment', { orderId });
    dispatchWaAlert(
      `💳 Captura PayPal SIN ACREDITAR ref:${capture.id} — si el webhook no confirma, revisar manualmente`,
      { orderId, externalId: capture.id, email: payerEmail ?? null }
    );
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return errorResponse(res, 405, 'Método HTTP no permitido');

  const action = (req.query.action as string) || req.body?.action || 'create';
  
  if (action === 'create') {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    
    const rateOk = await requireRateLimit(req, res, `guest:${ip}:paypal-order`, {
      maxRequests: 10,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    const identity = await resolveCheckoutIdentity(req, res, { forcedProvider: 'paypal' });
    if (!identity) return; // la respuesta de error ya fue enviada

    const { plan, emailToUse, exportToken, userId, returnPath } = identity;

    try {
      const result = returnPath
        ? await createCheckoutForProvider('paypal', plan, exportToken, emailToUse, userId, returnPath)
        : await createCheckoutForProvider('paypal', plan, exportToken, emailToUse, userId);
      return successResponse(res, { checkoutUrl: result.checkoutUrl });
    } catch (err: any) {
      console.error('Error creando orden PayPal:', err);
      await captureBackendException(err, 'paypal-order:create', { plan, exportToken });
      // Mensaje genérico: nunca err.message del backend al cliente.
      return errorResponse(res, 500, 'No se pudo crear la orden de pago con PayPal');
    }
  }

  if (action === 'capture') {
    // La captura dispara dinero real: rate-limit propio (antes solo lo tenía
    // 'create') para frenar reintentos de bots o doble clic en bucle.
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const rateOk = await requireRateLimit(req, res, `guest:${ip}:paypal-capture`, {
      maxRequests: 10,
      windowSeconds: 60,
    });
    if (!rateOk) return;

    const { orderId } = req.body || {};
    if (!orderId) return errorResponse(res, 400, 'Falta orderId');

    const env = (process.env.PAYPAL_ENV || 'live').toLowerCase();
    const baseUrl = env === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
    const auth64 = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');

    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth64}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return errorResponse(res, 500, `Error de autenticación con PayPal: ${errText}`);
    }

    const tokenData: any = await tokenRes.json();

    const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenData.access_token}`, 'Content-Type': 'application/json' },
    });
    const captureData: any = await captureRes.json();

    if (!captureRes.ok) {
      // Captura repetida (doble clic / refresh del retorno): no es un error de
      // dinero. La primera captura ya pasó por applyPayment con el capture.id
      // como clave idempotente; devolvemos el estado real de la orden.
      const issue = captureData?.details?.[0]?.issue || captureData?.details?.[0]?.description;
      if (issue === 'ORDER_ALREADY_CAPTURED' || String(captureData?.message || '').includes('already captured')) {
        try {
          const orderRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          });
          const orderData: any = await orderRes.json();
          if (orderRes.ok && orderData?.status === 'COMPLETED') {
            // La primera request pudo morir entre la captura y el applyPayment:
            // se intenta la acreditación con los datos de la orden (el guard
            // idempotente la vuelve inofensiva si ya se aplicó).
            await acreditarCapturaPayPal(orderData, orderId);
            return successResponse(res, { status: 'COMPLETED', alreadyCaptured: true, details: orderData });
          }
        } catch (alreadyErr) {
          console.error('[paypal-order] Error consultando orden ya capturada:', alreadyErr);
        }
      }
      return errorResponse(res, 500, captureData.message || 'No se pudo capturar el pago de PayPal');
    }

    // ACREDITACIÓN INMEDIATA: captura exitosa en PayPal v2 -> applyPayment()
    // en el mismo instante. El webhook posterior cae en 'already_processed'
    // y no duplica nada. Así el usuario vuelve al editor con sus créditos
    // aunque el webhook llegue tarde o no llegue nunca.
    await acreditarCapturaPayPal(captureData, orderId);

    return successResponse(res, { status: captureData.status, details: captureData });
  }

  return errorResponse(res, 400, 'Acción no válida');
}
