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
};
