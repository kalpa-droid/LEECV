export const env = new Proxy({}, {
  get(_, prop) {
    if (prop === 'SITE_URL') return process.env.SITE_URL || 'http://localhost:5173';
    if (prop === 'PAYPAL_ENV') return process.env.PAYPAL_ENV || 'live';
    return process.env[prop as string];
  }
}) as {
  SITE_URL: string;
  MP_ACCESS_TOKEN?: string;
  MP_WEBHOOK_SECRET?: string;
  PAYPAL_ENV: string;
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
  PAYPAL_WEBHOOK_ID?: string;
  LEMONSQUEEZY_API_KEY?: string;
  LEMONSQUEEZY_WEBHOOK_SECRET?: string;
  LEMONSQUEEZY_CHECKOUT_URL?: string;
  LEMONSQUEEZY_URL_PDF1?: string;
  LEMONSQUEEZY_URL_PACK5?: string;
  LEMONSQUEEZY_URL_PACK10?: string;
  LEMONSQUEEZY_URL_PRO?: string;
  LS_VARIANT_SINGLE_PDF?: string;
  LS_VARIANT_PACK5?: string;
  LS_VARIANT_PACK10?: string;
  LS_VARIANT_PRO?: string;
};
