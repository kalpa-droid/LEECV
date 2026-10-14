import type { ProviderId } from './types.js';
import { getPrice } from './pricingCatalog.js';
import { env } from '../config/env.js';

export interface CheckoutSessionResult {
  checkoutUrl: string;
}

export async function createCheckoutForProvider(
  providerId: ProviderId,
  plan: string,
  exportToken: string,
  email: string,
  userId?: string
): Promise<CheckoutSessionResult> {
  if (plan === 'pro') {
    throw new Error('El plan Pro no está disponible para compra.');
  }

  const planData = getPrice(plan);
  if (!planData) {
    throw new Error(`Plan desconocido: ${plan}`);
  }

  switch (providerId) {
    case 'mercadopago': {
      const PLAN_TITLES: Record<string, string> = {
        single_pdf: 'LEECV - 1 Crédito de Exportación PDF',
        credits_pack_5: 'LEECV - Pack 5 Créditos de Exportación PDF',
        credits_pack_10: 'LEECV - Pack 10 Créditos de Exportación PDF',
        pro: 'LEECV Pro - Suscripción Agencia Mensual',
      };

      const price = planData.ars;
      const title = PLAN_TITLES[plan] || 'LEECV - Exportación PDF';

      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`,
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
          external_reference: JSON.stringify({ exportToken, plan, userId }),
          back_urls: {
            success: `${env.SITE_URL}/?pago=exitoso`,
            failure: `${env.SITE_URL}/?pago=fallido`,
            pending: `${env.SITE_URL}/?pago=pendiente`,
          },
          auto_return: 'approved',
          notification_url: `${env.SITE_URL}/api/mercadopago-webhook`,
        }),
      });

      const data: any = await response.json();
      if (!response.ok || !data.init_point) throw new Error(`Error MP: ${data.message || JSON.stringify(data)}`);
      return { checkoutUrl: data.init_point };
    }

    case 'paypal': {
      const priceStr = String(planData.usd);
      
      const baseUrl = env.PAYPAL_ENV === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
      const auth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64');

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
              custom_id: JSON.stringify({ exportToken, plan, userId }),
              description: `LEECV Export (${plan})`,
            },
          ],
          application_context: {
            brand_name: 'LEECV',
            landing_page: 'NO_PREFERENCE',
            user_action: 'PAY_NOW',
            return_url: `${env.SITE_URL}/?pago=exitoso`,
            cancel_url: `${env.SITE_URL}/?pago=fallido`,
          },
        }),
      });

      const orderData: any = await orderRes.json();
      if (!orderRes.ok) throw new Error(`Error PayPal Order: ${JSON.stringify(orderData)}`);

      const approveLink = orderData.links?.find((l: any) => l.rel === 'approve')?.href;
      if (!approveLink) throw new Error('PayPal no devolvió link de aprobación');

      return { checkoutUrl: approveLink };
    }

    case 'lemonsqueezy': {
      throw new Error('Lemon Squeezy no está habilitado como método de pago.');
    }

    default:
      throw new Error(`Inicio de pago backend no soportado para ${providerId}`);
  }
}
