import type { ProviderId } from '../../../src/shared/core/payments/paymentProviderCatalog.js';

export interface CheckoutSessionResult {
  checkoutUrl: string;
}

export async function createCheckoutForProvider(
  providerId: ProviderId,
  plan: string,
  userId: string,
  email?: string
): Promise<CheckoutSessionResult> {
  switch (providerId) {
    case 'mercadopago': {
      const PLAN_PRICES_ARS: Record<string, number> = {
        single_pdf: Number(process.env.MP_PRECIO_PDF_ARS || 1800),
        credits_pack_5: Number(process.env.MP_PRECIO_PACK5_ARS || 7500),
        credits_pack_10: Number(process.env.MP_PRECIO_PACK10_ARS || 12000),
        pro: Number(process.env.MP_PRECIO_PRO_ARS || 22800),
        enterprise: Number(process.env.MP_PRECIO_ENTERPRISE_ARS || 34800),
      };

      const PLAN_TITLES: Record<string, string> = {
        single_pdf: 'LEECV - 1 Crédito de Exportación PDF A4',
        credits_pack_5: 'LEECV - Pack 5 Créditos de Exportación PDF',
        credits_pack_10: 'LEECV - Pack 10 Créditos de Exportación PDF',
        pro: 'LEECV Pro - Suscripción Agencia Mensual',
        enterprise: 'LEECV Enterprise - Suscripción Agencia Cloud Mensual',
      };

      const price = PLAN_PRICES_ARS[plan];
      if (!price) throw new Error(`Plan desconocido para Mercado Pago: ${plan}`);
      const title = PLAN_TITLES[plan] || 'LEECV - Exportación PDF';

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
      if (!response.ok || !data.init_point) throw new Error(`Error MP: ${data.message || JSON.stringify(data)}`);
      return { checkoutUrl: data.init_point };
    }

    case 'paypal': {
      const PLAN_PRICES_USD: Record<string, string> = {
        single_pdf: process.env.PAYPAL_PRECIO_PDF_USD || '2.00',
        credits_pack_5: process.env.PAYPAL_PRECIO_PACK5_USD || '8.00',
        credits_pack_10: process.env.PAYPAL_PRECIO_PACK10_USD || '14.00',
        pro: process.env.PAYPAL_PRECIO_PRO_USD || '24.00',
        enterprise: process.env.PAYPAL_PRECIO_ENTERPRISE_USD || '49.00',
      };

      const priceStr = PLAN_PRICES_USD[plan];
      if (!priceStr) throw new Error(`Plan desconocido para PayPal: ${plan}`);

      const env = (process.env.PAYPAL_ENV || 'live').toLowerCase();
      const baseUrl = env === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
      const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');

      const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
      const tokenData: any = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(`PayPal Auth Error: ${tokenData.error_description || tokenData.error}`);

      const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: 'USD',
                value: priceStr,
              },
              custom_id: JSON.stringify({ userId, plan }),
              description: `LEECV Subscription (${plan})`,
            },
          ],
          application_context: {
            brand_name: 'LEECV',
            landing_page: 'NO_PREFERENCE',
            user_action: 'PAY_NOW',
            return_url: `${process.env.SITE_URL}/?pago=exitoso`,
            cancel_url: `${process.env.SITE_URL}/?pago=fallido`,
          },
        }),
      });

      const orderData: any = await orderRes.json();
      if (!orderRes.ok) throw new Error(`Error PayPal Order: ${JSON.stringify(orderData)}`);

      const approveLink = orderData.links?.find((l: any) => l.rel === 'approve')?.href;
      if (!approveLink) throw new Error('PayPal no devolvió link de aprobación');

      return { checkoutUrl: approveLink };
    }

    default:
      throw new Error(`Inicio de pago backend no soportado para ${providerId}`);
  }
}
