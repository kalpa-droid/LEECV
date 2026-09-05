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

  // 2. Integración condicional con Sentry si está disponible en window o globalThis
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    try {
      (window as any).Sentry.withScope((scope: any) => {
        if (metadata.context) scope.setTag('context', metadata.context);
        if (metadata.provider) scope.setTag('provider', metadata.provider);
        if (metadata.userEmail) scope.setUser({ email: metadata.userEmail, id: metadata.userId });
        if (metadata.extra) scope.setExtras(metadata.extra);
        (window as any).Sentry.captureException(errObj);
      });
    } catch (e) {
      console.warn('[MONITORING] Falló la transmisión a Sentry client-side:', e);
    }
  }

  // 3. Fallback para entornos Node Serverless
  if (typeof globalThis !== 'undefined' && (globalThis as any).Sentry) {
    try {
      (globalThis as any).Sentry.captureException(errObj);
    } catch (e) {
      console.warn('[MONITORING] Falló la transmisión a Sentry server-side:', e);
    }
  }
}

export function reportMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', metadata: MonitoringContext = {}) {
  console.log(`[MONITORING ${level.toUpperCase()}] [${metadata.context || 'General'}]: ${message}`, metadata);
}
