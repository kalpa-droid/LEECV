import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, email, plan = 'single_pdf' } = req.body || {};
  if (!userId || !email) return res.status(400).json({ error: 'Falta userId o email' });

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

    return res.status(200).json({ checkoutUrl: data.init_point });
  } catch (err: any) {
    console.error('Error creando preferencia MP:', err);
    return res.status(500).json({ error: 'No se pudo crear la preferencia de pago' });
  }
}
