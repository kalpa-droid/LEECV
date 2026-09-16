import * as Sentry from '@sentry/react';
import { env } from '../config/env';

const SENTRY_DSN = env.SENTRY_DSN;

if (typeof window !== 'undefined' && SENTRY_DSN) {
  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 0.2,
    });
  } catch (err) {
    console.warn('[MONITORING] Error inicializando Sentry:', err);
  }
}

/**
 * Módulo de Monitoreo de Errores y Excepciones (Sentry / Centralized Error Logger)
 *
 * Ofrece una interfaz unificada para reportar render crashes, fallos de red en pasarelas,
 * violaciones de seguridad o excepciones críticas tanto en cliente como en servidor.
 */

export interface MonitoringContext {
  context?: string;
  userEmail?: string;
  userId?: string;
  provider?: string;
  extra?: Record<string, any>;
}

export function reportException(error: unknown, metadata: MonitoringContext = {}) {
  const errObj = error instanceof Error ? error : new Error(String(error));

  // 1. Log estructurado en consola
  console.error(`[MONITORING ERROR] [${metadata.context || 'General'}]:`, {
    message: errObj.message,
    stack: errObj.stack,
    metadata,
    timestamp: new Date().toISOString()
  });

  // 2. Transmisión a Sentry via @sentry/react
  try {
    Sentry.withScope((scope) => {
      if (metadata.context) scope.setTag('context', metadata.context);
      if (metadata.provider) scope.setTag('provider', metadata.provider);
      if (metadata.userEmail) scope.setUser({ email: metadata.userEmail, id: metadata.userId });
      if (metadata.extra) scope.setExtras(metadata.extra);
      Sentry.captureException(errObj);
    });
  } catch (e) {
    console.warn('[MONITORING] Falló la transmisión a Sentry:', e);
  }
}

export function reportMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', metadata: MonitoringContext = {}) {
  console.log(`[MONITORING ${level.toUpperCase()}] [${metadata.context || 'General'}]: ${message}`, metadata);
  try {
    Sentry.captureMessage(message, level);
  } catch {
    // Silent fallback
  }
}
