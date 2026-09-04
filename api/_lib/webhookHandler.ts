import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './supabaseAdmin.js';
import { applyPayment, PaymentDetails } from './applyPayment.js';
import { errorResponse, successResponse } from './apiResponse.js';

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
      } catch {
        return errorResponse(res, 400, 'JSON inválido en el body del webhook');
      }
    }

    const ctx = { req, rawBody, parsedBody };

    if (config.verifySignature) {
      try {
        const isValid = await config.verifySignature(ctx);
        if (!isValid) {
          return errorResponse(res, 401, 'Firma de webhook inválida');
        }
      } catch (err: any) {
        return errorResponse(res, 401, `Error en validación de firma: ${err?.message || err}`);
      }
    }

    try {
      const paymentDetails = await config.extractPaymentDetails(ctx);
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
