import React, { useState } from 'react';
import { ShieldCheck, ExternalLink, AlertTriangle, Send, CheckCircle2, Activity, Terminal } from 'lucide-react';
import { reportException, reportMessage } from '../../../shared/core/utils/monitoring';
import { useToast } from '../../../shared/core/ui/Toast';
import { elevationSystem, radius } from '../../../shared/core/uiDesignSystem';

export function SentryReportsTab() {
  const { showSuccess, showError } = useToast();
  const [testingError, setTestingError] = useState(false);

  const sentryDsn = 'https://ee85a68c26a11080f175541ed2c2a593@o4512035779182592.ingest.us.sentry.io/4512035802251264';
  const sentryDashboardUrl = 'https://leecv.sentry.io/issues/';

  const handleSendTestError = () => {
    setTestingError(true);
    try {
      reportException(new Error(`Test de Error en Vivo desde Panel Admin LEECV (${new Date().toLocaleTimeString('es-AR')})`), {
        context: 'AdminDashboardTest',
        userEmail: 'admin@leecv.app',
        extra: { trigger: 'Manual test from admin dashboard', timestamp: new Date().toISOString() }
      });
      showSuccess('✅ Excepción de prueba emitida hacia Sentry. Revisa el dashboard en unos segundos.');
    } catch (err) {
      showError('Error enviando reporte a Sentry.');
    } finally {
      setTestingError(false);
    }
  };

  const handleSendTestMessage = () => {
    reportMessage('Diagnóstico de rutina emitido desde Panel Admin LEECV', 'info', {
      context: 'AdminPing',
    });
    showSuccess('ℹ️ Mensaje de diagnóstico enviado a Sentry.');
  };

  return (
    <div className="space-y-6">
      {/* HEADER DE LA SECCIÓN */}
      <div className={`bg-[var(--ui-bg-card)] rounded-[${radius.modal}] p-5 border border-[var(--color-neutral-border)] ${elevationSystem.raised} flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-[${radius.card}] bg-[var(--color-accent-purple-light)] border border-[var(--color-accent-purple)]/40 text-[var(--color-accent-purple-text)] flex items-center justify-center`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-base text-[var(--color-neutral-text-primary)]">Monitoreo de Errores & Telemetría Sentry</h2>
            <p className="text-xs text-[var(--color-neutral-text-secondary)]">Captura automática de render crashes, errores de red y excepciones en tiempo real</p>
          </div>
        </div>

        <a
          href={sentryDashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`px-4 py-2 bg-[var(--color-secondary-base)] hover:opacity-90 text-[var(--color-secondary-on-base)] text-xs font-black rounded-[${radius.card}] ${elevationSystem.raised} transition flex items-center gap-2`}
        >
          <span>Abrir Panel de Sentry.io</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* DETALLES DE INTEGRACIÓN Y PRUEBAS EN VIVO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* TARJETA 1: PRUEBAS EN VIVO */}
        <div className={`bg-[var(--ui-bg-card)] rounded-[${radius.modal}] p-5 border border-[var(--color-neutral-border)] ${elevationSystem.raised} space-y-4`}>
          <div className="flex items-center gap-2 border-b border-[var(--color-neutral-border)] pb-3">
            <Activity className="w-4 h-4 text-[var(--color-secondary-text)]" />
            <h3 className="font-black text-sm text-[var(--color-neutral-text-primary)]">Pruebas de Transmisión en Vivo</h3>
          </div>

          <p className="text-xs text-[var(--color-neutral-text-secondary)]">
            Emití un evento de prueba directo desde esta pantalla para verificar que la captura de errores en producción funcione correctamente.
          </p>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleSendTestError}
              disabled={testingError}
              className={`w-full py-2.5 bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)] border border-[var(--color-status-danger-base)]/40 hover:opacity-90 text-xs font-black rounded-[${radius.card}] ${elevationSystem.raised} transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Reportar Excepción de Prueba</span>
            </button>

            <button
              onClick={handleSendTestMessage}
              className={`w-full py-2 bg-[var(--color-neutral-surface-muted)] hover:bg-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] border border-[var(--color-neutral-border)] text-xs font-bold rounded-[${radius.card}] transition flex items-center justify-center gap-2 cursor-pointer`}
            >
              <Send className="w-3.5 h-3.5 text-[var(--color-secondary-text)]" />
              <span>Enviar Mensaje de Diagnóstico</span>
            </button>
          </div>
        </div>

        {/* TARJETA 2: CONFIGURACIÓN Y DSN */}
        <div className={`bg-[var(--ui-bg-card)] rounded-[${radius.modal}] p-5 border border-[var(--color-neutral-border)] ${elevationSystem.raised} space-y-4`}>
          <div className="flex items-center gap-2 border-b border-[var(--color-neutral-border)] pb-3">
            <Terminal className="w-4 h-4 text-[var(--color-accent-purple-text)]" />
            <h3 className="font-black text-sm text-[var(--color-neutral-text-primary)]">Estado de la Integración</h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/30 text-[var(--color-status-success-text)] font-bold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                SDK @sentry/react
              </span>
              <span className="text-[10px] uppercase bg-[var(--color-status-success-base)]/20 px-2 py-0.5 rounded">Conectado</span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-[var(--color-neutral-text-secondary)]">DSN Activo:</span>
              <div className="p-2 rounded bg-[var(--color-neutral-surface-muted)] font-mono text-[10px] text-[var(--color-neutral-text-primary)] break-all border border-[var(--color-neutral-border)] mt-1">
                {sentryDsn}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
