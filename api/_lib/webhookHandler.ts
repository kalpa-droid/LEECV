import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './supabaseAdmin.js';
import { serverDal } from './serverDal.js';
import { applyPayment, PaymentDetails } from './applyPayment.js';
import { errorResponse, successResponse } from './apiResponse.js';
import { captureBackendException } from './sentryBackend.js';

export interface WebhookConfig {
  provider: 'mercadopago' | 'paypal' | 'lemonsqueezy';
  rawBody?: boolean;
  verifySignature?: (ctx: { req: VercelRequest; rawBody?: string; parsedBody: any }) => Promise<boolean> | boolean;
  extractPaymentDetails: (ctx: { req: VercelRequest; rawBody?: string; parsedBody: any }) => Promise<PaymentDetails | null> | PaymentDetails | null;
}

async function readRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

/**
 * MOTOR CANÓNICO DE WEBHOOKS (createWebhookHandler)
 * 
 * Abstracta la verificación de firma, extracción de metadata e invocación idempotente de applyPayment.
 * Soporta `rawBody: true` para pasarelas como Lemon Squeezy que requieren verificar firmas byte-exactas.
 */
export function createWebhookHandler(config: WebhookConfig) {
  return async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'POST') {
      return errorResponse(res, 405, 'Método HTTP no permitido');
    }

    let rawBody: string | undefined;
    let parsedBody: any = req.body;

    if (config.rawBody) {
      try {
        rawBody = await readRawBody(req);
        parsedBody = JSON.parse(rawBody);
      } catch (err: any) {
        await captureBackendException(err, `webhook_json_parse:${config.provider}`);
        return errorResponse(res, 400, 'JSON inválido en el body del webhook');
      }
    }

    const ctx = { req, rawBody, parsedBody };

    if (config.verifySignature) {
      try {
        const isValid = await config.verifySignature(ctx);
        if (!isValid) {
          console.error(`[CRITICAL WEBHOOK ALERT - ${config.provider}]: Firma de webhook rechazada / inválida`);
          await captureBackendException(new Error(`Firma de webhook rechazada (${config.provider})`), `webhook_invalid_signature:${config.provider}`);
          return errorResponse(res, 401, 'Firma de webhook inválida');
        }
      } catch (err: any) {
        console.error(`[CRITICAL WEBHOOK ALERT - ${config.provider}]: Error en validación de firma:`, err);
        await captureBackendException(err, `webhook_verify_exception:${config.provider}`);
        return errorResponse(res, 401, `Error en validación de firma: ${err?.message || err}`);
      }
    }

    try {
      const paymentDetails = await config.extractPaymentDetails(ctx);
      if (!paymentDetails) {
        return successResponse(res, { status: 'ignored', message: 'Evento no procesable u omitido intencionalmente' });
      }

      const result = await applyPayment(supabaseAdmin, paymentDetails);

      // Si el pago se acreditó (o ya estaba acreditado), cualquier retención
      // previa del mismo pago quedó resuelta por la pasarela.
      if (
        (result.type === 'payment_applied' || result.type === 'already_processed') &&
        paymentDetails.externalId &&
        paymentDetails.metodoPago
      ) {
        try {
          await serverDal.pendingGrants.resolveIfPending(
            paymentDetails.metodoPago,
            paymentDetails.externalId,
            'Acreditado automáticamente por la pasarela'
          );
        } catch (cleanupErr: any) {
          // No se falla el webhook: el derecho ya fue otorgado y la fila puede
          // resolverse manualmente desde el panel si esta limpieza no prospera.
          console.error(`[WEBHOOK PENDING-GRANT CLEANUP - ${config.provider}]:`, cleanupErr?.message || cleanupErr);
          await captureBackendException(cleanupErr, `webhook_pending_grant_cleanup:${config.provider}`, {
            externalId: paymentDetails.externalId,
          });
        }
      }

      return successResponse(res, { status: 'processed', result });
    } catch (err: any) {
      console.error(`[CRITICAL WEBHOOK ERROR - ${config.provider}]:`, err?.message || err, err?.stack);
      await captureBackendException(err, `webhook_execution_failure:${config.provider}`, { parsedBody });
      return errorResponse(res, 500, err?.message || 'Inconveniente procesando webhook');
    }
  };
}
