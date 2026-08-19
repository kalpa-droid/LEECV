// api/create-mp-preference.js
// Vercel Serverless Function. Requiere la env var MP_ACCESS_TOKEN (Production Access Token de tu cuenta Mercado Pago).

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, email } = req.body || {};
  if (!userId || !email) return res.status(400).json({ error: 'Falta userId o email' });

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
            title: 'LEECV Premium - Suscripción mensual',
            quantity: 1,
            unit_price: Number(process.env.MP_PRECIO_ARS || 4999),
            currency_id: 'ARS',
          },
        ],
        payer: { email },
        external_reference: userId, // así el webhook sabe a qué usuario activarle premium
        back_urls: {
          success: `${process.env.SITE_URL}/?pago=exitoso`,
          failure: `${process.env.SITE_URL}/?pago=fallido`,
          pending: `${process.env.SITE_URL}/?pago=pendiente`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.SITE_URL}/api/mercadopago-webhook`,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));

    return res.status(200).json({ checkoutUrl: data.init_point });
  } catch (err) {
    console.error('Error creando preferencia MP:', err);
    return res.status(500).json({ error: 'No se pudo crear la preferencia de pago' });
  }
}
