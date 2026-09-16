/**
 * MOTOR CENTRALIZADO DE CONFIGURACIÓN Y VARIABLES DE ENTORNO (env)
 * Regla C.2 — Validación segura del entorno con soft-warnings en desarrollo y valores de reserva.
 *
 * Centraliza todo acceso a `import.meta.env` para evitar lecturas dispersas en código de servicios
 * o componentes, garantizando tipado estricto y prevención de errores en tiempo de ejecución.
 */

export interface EnvConfig {
  // Supabase
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;

  // Analítica & Métricas
  GA_MEASUREMENT_ID?: string;
  POSTHOG_KEY?: string;
  POSTHOG_HOST: string;

  // Monitoreo & Sentry
  SENTRY_DSN: string;

  // Pasarelas & Lemon Squeezy
  LEMONSQUEEZY_URL_PDF1: string;
  LEMONSQUEEZY_URL_SINGLE_PDF?: string;
  LEMONSQUEEZY_URL_PACK5?: string;
  LEMONSQUEEZY_URL_PACK10?: string;
  LEMONSQUEEZY_URL_PRO: string;
  LEMONSQUEEZY_URL_ENTERPRISE: string;
  LEMONSQUEEZY_CHECKOUT_URL?: string;

  // Flags de entorno
  IS_DEV: boolean;
  IS_PROD: boolean;
  MODE: string;
}

function getEnvValue(key: string, fallback: string = ''): string {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key] !== undefined) {
    return String(import.meta.env[key]);
  }
  return fallback;
}

const isDev = Boolean(
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV
);

// Validación y soft-warnings en desarrollo
if (isDev) {
  const requiredDevKeys = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  for (const key of requiredDevKeys) {
    if (!getEnvValue(key)) {
      console.warn(`[Config/Env] Variable de entorno requerida no definida en DEV: "${key}". La app funcionará en modo degradado/local.`);
    }
  }
}

export const env: EnvConfig = {
  // Supabase
  VITE_SUPABASE_URL: getEnvValue('VITE_SUPABASE_URL', ''),
  VITE_SUPABASE_ANON_KEY: getEnvValue('VITE_SUPABASE_ANON_KEY', ''),

  // Analítica
  GA_MEASUREMENT_ID: getEnvValue('VITE_GA_MEASUREMENT_ID', ''),
  POSTHOG_KEY: getEnvValue('VITE_POSTHOG_KEY', ''),
  POSTHOG_HOST: getEnvValue('VITE_POSTHOG_HOST', 'https://app.posthog.com'),

  // Monitoreo
  SENTRY_DSN: getEnvValue('VITE_SENTRY_DSN', 'https://ee85a68c26a11080f175541ed2c2a593@o4512035779182592.ingest.us.sentry.io/4512035802251264'),

  // Lemon Squeezy Checkout URLs
  LEMONSQUEEZY_URL_PDF1:
    getEnvValue('VITE_LEMONSQUEEZY_URL_PDF1') ||
    getEnvValue('VITE_LEMONSQUEEZY_URL_SINGLE_PDF') ||
    'https://leecv-26.lemonsqueezy.com/checkout/buy/8ddd3fca-c0f8-493f-8f44-05389e74a0e9',
  LEMONSQUEEZY_URL_SINGLE_PDF: getEnvValue('VITE_LEMONSQUEEZY_URL_SINGLE_PDF', ''),
  LEMONSQUEEZY_URL_PACK5: getEnvValue('VITE_LEMONSQUEEZY_URL_PACK5', ''),
  LEMONSQUEEZY_URL_PACK10: getEnvValue('VITE_LEMONSQUEEZY_URL_PACK10', ''),
  LEMONSQUEEZY_URL_PRO: getEnvValue('VITE_LEMONSQUEEZY_URL_PRO', 'https://leecv-26.lemonsqueezy.com/checkout/buy/6b4b732a-d1ec-48de-89f0-02a3d02be613'),
  LEMONSQUEEZY_URL_ENTERPRISE: getEnvValue('VITE_LEMONSQUEEZY_URL_ENTERPRISE', 'https://leecv-26.lemonsqueezy.com/checkout/buy/d8968d41-e826-43a8-a057-bf51e8add5e3'),
  LEMONSQUEEZY_CHECKOUT_URL: getEnvValue('VITE_LEMONSQUEEZY_CHECKOUT_URL', ''),

  // Entorno
  IS_DEV: isDev,
  IS_PROD: Boolean(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD),
  MODE: getEnvValue('MODE', isDev ? 'development' : 'production'),
};
