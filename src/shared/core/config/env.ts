/**
 * MOTOR CENTRALIZADO DE CONFIGURACIÓN Y VARIABLES DE ENTORNO (env)
 * Regla C.2 — Validación segura del entorno con zod y soft-warnings en desarrollo y valores de reserva.
 *
 * Centraliza todo acceso a `import.meta.env` para evitar lecturas dispersas en código de servicios
 * o componentes, garantizando tipado estricto y prevención de errores en tiempo de ejecución.
 */
import { z } from 'zod';

const isDev = Boolean(
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV
);

const envSchema = z.object({
  // Supabase
  VITE_SUPABASE_URL: z.string().min(1, "VITE_SUPABASE_URL is required"),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, "VITE_SUPABASE_ANON_KEY is required"),

  // Analítica & Métricas
  GA_MEASUREMENT_ID: z.string().optional(),
  POSTHOG_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().default('https://app.posthog.com'),

  // Monitoreo & Sentry
  SENTRY_DSN: z.string().default('https://ee85a68c26a11080f175541ed2c2a593@o4512035779182592.ingest.us.sentry.io/4512035802251264'),

  // Pasarelas & Lemon Squeezy
  LEMONSQUEEZY_URL_PDF1: z.string().default('https://leecv-26.lemonsqueezy.com/checkout/buy/8ddd3fca-c0f8-493f-8f44-05389e74a0e9'),
  LEMONSQUEEZY_URL_SINGLE_PDF: z.string().optional(),
  LEMONSQUEEZY_URL_PACK5: z.string().optional(),
  LEMONSQUEEZY_URL_PACK10: z.string().optional(),
  LEMONSQUEEZY_URL_PRO: z.string().default('https://leecv-26.lemonsqueezy.com/checkout/buy/6b4b732a-d1ec-48de-89f0-02a3d02be613'),
  LEMONSQUEEZY_URL_ENTERPRISE: z.string().default('https://leecv-26.lemonsqueezy.com/checkout/buy/d8968d41-e826-43a8-a057-bf51e8add5e3'),
  LEMONSQUEEZY_CHECKOUT_URL: z.string().optional(),

  // Flags de entorno
  IS_DEV: z.boolean(),
  IS_PROD: z.boolean(),
  MODE: z.string()
});

export type EnvConfig = z.infer<typeof envSchema>;

function getEnvValue(key: string, fallback?: string): string | undefined {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key] !== undefined && import.meta.env[key] !== '') {
    return String(import.meta.env[key]);
  }
  return fallback;
}

const rawEnv = {
  VITE_SUPABASE_URL: getEnvValue('VITE_SUPABASE_URL'),
  VITE_SUPABASE_ANON_KEY: getEnvValue('VITE_SUPABASE_ANON_KEY'),
  GA_MEASUREMENT_ID: getEnvValue('VITE_GA_MEASUREMENT_ID'),
  POSTHOG_KEY: getEnvValue('VITE_POSTHOG_KEY'),
  POSTHOG_HOST: getEnvValue('VITE_POSTHOG_HOST'),
  SENTRY_DSN: getEnvValue('VITE_SENTRY_DSN'),
  LEMONSQUEEZY_URL_PDF1: getEnvValue('VITE_LEMONSQUEEZY_URL_PDF1') || getEnvValue('VITE_LEMONSQUEEZY_URL_SINGLE_PDF'),
  LEMONSQUEEZY_URL_SINGLE_PDF: getEnvValue('VITE_LEMONSQUEEZY_URL_SINGLE_PDF'),
  LEMONSQUEEZY_URL_PACK5: getEnvValue('VITE_LEMONSQUEEZY_URL_PACK5'),
  LEMONSQUEEZY_URL_PACK10: getEnvValue('VITE_LEMONSQUEEZY_URL_PACK10'),
  LEMONSQUEEZY_URL_PRO: getEnvValue('VITE_LEMONSQUEEZY_URL_PRO'),
  LEMONSQUEEZY_URL_ENTERPRISE: getEnvValue('VITE_LEMONSQUEEZY_URL_ENTERPRISE'),
  LEMONSQUEEZY_CHECKOUT_URL: getEnvValue('VITE_LEMONSQUEEZY_CHECKOUT_URL'),
  IS_DEV: isDev,
  IS_PROD: Boolean(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD),
  MODE: getEnvValue('MODE', isDev ? 'development' : 'production')
};

let parsedEnv: EnvConfig;
export let envError: Error | null = null;

try {
  parsedEnv = envSchema.parse(rawEnv);
} catch (error) {
  envError = error as Error;
  if (isDev && typeof window !== 'undefined') {
    console.error('[Config/Env] Variables de entorno inválidas o faltantes:', error);
    throw new Error('Variables de entorno requeridas faltantes en desarrollo. Revisa la consola o tu archivo .env.');
  } else {
    console.warn('[Config/Env] Variables de entorno inválidas. La app intentará funcionar en modo degradado.');
    const safeResult = envSchema.safeParse(rawEnv);
    if (!safeResult.success) {
      // Fallback a un objeto que cumpla el contrato, usando strings vacíos para evitar crashes
      parsedEnv = {
        ...rawEnv,
        VITE_SUPABASE_URL: rawEnv.VITE_SUPABASE_URL || '',
        VITE_SUPABASE_ANON_KEY: rawEnv.VITE_SUPABASE_ANON_KEY || '',
        POSTHOG_HOST: rawEnv.POSTHOG_HOST || 'https://app.posthog.com',
        SENTRY_DSN: rawEnv.SENTRY_DSN || 'https://ee85a68c26a11080f175541ed2c2a593@o4512035779182592.ingest.us.sentry.io/4512035802251264',
        LEMONSQUEEZY_URL_PDF1: rawEnv.LEMONSQUEEZY_URL_PDF1 || 'https://leecv-26.lemonsqueezy.com/checkout/buy/8ddd3fca-c0f8-493f-8f44-05389e74a0e9',
        LEMONSQUEEZY_URL_PRO: rawEnv.LEMONSQUEEZY_URL_PRO || 'https://leecv-26.lemonsqueezy.com/checkout/buy/6b4b732a-d1ec-48de-89f0-02a3d02be613',
        LEMONSQUEEZY_URL_ENTERPRISE: rawEnv.LEMONSQUEEZY_URL_ENTERPRISE || 'https://leecv-26.lemonsqueezy.com/checkout/buy/d8968d41-e826-43a8-a057-bf51e8add5e3',
        IS_DEV: rawEnv.IS_DEV,
        IS_PROD: rawEnv.IS_PROD,
        MODE: rawEnv.MODE || 'production'
      } as unknown as EnvConfig;
    } else {
      parsedEnv = safeResult.data;
    }
  }
}

export const env = parsedEnv;
