import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from './_lib/authMiddleware.js';
import { errorResponse, successResponse } from './_lib/apiResponse.js';
import { requireRateLimit } from './_lib/rateLimiter.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return errorResponse(res, 405, 'Method not allowed');

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const rateOk = await requireRateLimit(req, res, `user:${auth.user.id}:mp-preference`, {
    maxRequests: 10,
    windowSeconds: 60
  });
  if (!rateOk) return;

  // userId y email salen del token verificado, nunca del body — antes
  // cualquiera podía pasar el userId de otra persona acá.
  const userId = auth.user.id;
  const email = auth.user.email || '';
  const { plan = 'single_pdf' } = req.body || {};

  const PLAN_PRICES_ARS: Record<string, number> = {
    single_pdf: Number(process.env.MP_PRECIO_PDF_ARS || 1200),
    pro: Number(process.env.MP_PRECIO_PRO_ARS || 22800),
    enterprise: Number(process.env.MP_PRECIO_ENTERPRISE_ARS || 34800)
  };

  const PLAN_TITLES: Record<string, string> = {
    single_pdf: 'LEECV - 1 Crédito de Exportación PDF A4',
    pro: 'LEECV Pro - Suscripción Agencia Mensual',
    enterprise: 'LEECV Enterprise - Suscripción Agencia Cloud Mensual'
  };

  const price = PLAN_PRICES_ARS[plan] || PLAN_PRICES_ARS.single_pdf;
  const title = PLAN_TITLES[plan] || PLAN_TITLES.single_pdf;

  try {
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            title,
            quantity: 1,
            unit_price: price,
            currency_id: 'ARS',
          },
        ],
        payer: { email },
        external_reference: JSON.stringify({ userId, plan }),
        back_urls: {
          success: `${process.env.SITE_URL}/?pago=exitoso`,
          failure: `${process.env.SITE_URL}/?pago=fallido`,
          pending: `${process.env.SITE_URL}/?pago=pendiente`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.SITE_URL}/api/mercadopago-webhook`,
      }),
    });

    const data: any = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));

    return successResponse(res, { checkoutUrl: data.init_point });
  } catch (err: any) {
    console.error('Error creando preferencia MP:', err);
    return errorResponse(res, 500, 'No se pudo crear la preferencia de pago');
  }
}
