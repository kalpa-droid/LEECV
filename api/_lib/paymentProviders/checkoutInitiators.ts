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

      let response;
      if (plan === 'pro') {
        response = await fetch('https://api.mercadopago.com/preapproval', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.MP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: title,
            external_reference: JSON.stringify({ exportToken, plan, userId }),
            payer_email: email,
            auto_recurring: {
              frequency: 1,
              frequency_type: 'months',
              transaction_amount: price,
              currency_id: 'ARS'
            },
            back_url: `${env.SITE_URL}/?pago=exitoso`
          }),
        });
      } else {
        response = await fetch('https://api.mercadopago.com/checkout/preferences', {
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
      }

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

      let orderRes;
      if (plan === 'pro') {
        if (!env.PAYPAL_PRO_PLAN_ID) {
          throw new Error('No está configurado PAYPAL_PRO_PLAN_ID');
        }
        orderRes = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            plan_id: env.PAYPAL_PRO_PLAN_ID,
            custom_id: JSON.stringify({ exportToken, plan, userId }),
            subscriber: {
              email_address: email
            },
            application_context: {
              brand_name: 'LEECV',
              landing_page: 'NO_PREFERENCE',
              user_action: 'SUBSCRIBE_NOW',
              return_url: `${env.SITE_URL}/?pago=exitoso`,
              cancel_url: `${env.SITE_URL}/?pago=fallido`,
            }
          })
        });
      } else {
        orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
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
      }

      const orderData: any = await orderRes.json();
      if (!orderRes.ok) throw new Error(`Error PayPal Order: ${JSON.stringify(orderData)}`);

      const approveLink = orderData.links?.find((l: any) => l.rel === 'approve')?.href;
      if (!approveLink) throw new Error('PayPal no devolvió link de aprobación');

      return { checkoutUrl: approveLink };
    }

    case 'lemonsqueezy': {
      const urlMap: Record<string, string | undefined> = {
        single_pdf: env.LEMONSQUEEZY_URL_PDF1,
        credits_pack_5: env.LEMONSQUEEZY_URL_PACK5,
        credits_pack_10: env.LEMONSQUEEZY_URL_PACK10,
        pro: env.LEMONSQUEEZY_URL_PRO,
      };

      const base = urlMap[plan] || env.LEMONSQUEEZY_CHECKOUT_URL;
      if (!base) {
        throw new Error('No está configurada la URL de checkout de Lemon Squeezy para este plan en el backend');
      }

      const url = new URL(base);
      url.searchParams.set('checkout[email]', email);
      if (exportToken) url.searchParams.set('checkout[custom][export_token]', exportToken);
      if (userId) url.searchParams.set('checkout[custom][user_id]', userId);
      url.searchParams.set('checkout[custom][plan]', plan);

      return { checkoutUrl: url.toString() };
    }

    default:
      throw new Error(`Inicio de pago backend no soportado para ${providerId}`);
  }
}
