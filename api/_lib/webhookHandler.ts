import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './supabaseAdmin.js';
import { applyPayment, PaymentDetails } from './applyPayment.js';
import { errorResponse, successResponse } from './apiResponse.js';

export interface WebhookConfig {
  provider: 'mercadopago' | 'paypal' | 'lemonsqueezy';
  verifySignature?: (req: VercelRequest) => Promise<boolean> | boolean;
  extractPaymentDetails: (req: VercelRequest) => Promise<PaymentDetails | null> | PaymentDetails | null;
}

/**
 * MOTOR CANÓNICO DE WEBHOOKS (createWebhookHandler)
 * 
 * Abstracta la verificación de firma, extracción de metadata e invocación idempotente de applyPayment.
 */
export function createWebhookHandler(config: WebhookConfig) {
  return async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'POST') {
      return errorResponse(res, 405, 'Método HTTP no permitido');
    }

    if (config.verifySignature) {
      try {
        const isValid = await config.verifySignature(req);
        if (!isValid) {
          return errorResponse(res, 401, 'Firma de webhook inválida');
        }
      } catch (err: any) {
        return errorResponse(res, 401, `Error en validación de firma: ${err?.message || err}`);
      }
    }

    try {
      const paymentDetails = await config.extractPaymentDetails(req);
      if (!paymentDetails) {
        return successResponse(res, { status: 'ignored', message: 'Evento no procesable u omitido intencionalmente' });
      }

      const result = await applyPayment(supabaseAdmin, paymentDetails);
      return successResponse(res, { status: 'processed', result });
    } catch (err: any) {
      console.error(`[Webhook Error - ${config.provider}]:`, err?.message || err);
      return errorResponse(res, 500, err?.message || 'Inconveniente procesando webhook');
    }
  };
}
