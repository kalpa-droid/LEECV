import * as Sentry from '@sentry/node';

const SENTRY_DSN =
  process.env.SENTRY_DSN ||
  process.env.VITE_SENTRY_DSN ||
  'https://ee85a68c26a11080f175541ed2c2a593@o4512035779182592.ingest.us.sentry.io/4512035802251264';

let isInitialized = false;

export function initBackendSentry() {
  if (isInitialized) return;
  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: 0.2,
      environment: process.env.NODE_ENV || 'production',
    });
    isInitialized = true;
  } catch (err) {
    console.warn('[BACKEND SENTRY] Error al inicializar Sentry Node SDK:', err);
  }
}

export async function captureBackendException(
  error: unknown,
  context?: string,
  extra?: Record<string, any>
) {
  initBackendSentry();

  const errObj = error instanceof Error ? error : new Error(String(error));

  console.error(`[CRITICAL BACKEND ERROR] [${context || 'API Serverless'}]:`, {
    message: errObj.message,
    stack: errObj.stack,
    extra,
    timestamp: new Date().toISOString(),
  });

  try {
    Sentry.withScope((scope) => {
      if (context) scope.setTag('context', context);
      if (extra) scope.setExtras(extra);
      Sentry.captureException(errObj);
    });

    // En funciones serverless de Vercel Node.js, flush() asegura que los eventos
    // se envíen por HTTP a Sentry antes de que la función retorne y el runtime se congele.
    await Sentry.flush(2000);
  } catch (flushErr) {
    console.warn('[BACKEND SENTRY] Error transmitiendo a Sentry:', flushErr);
  }
}
