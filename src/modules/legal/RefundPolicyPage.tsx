import React from 'react';
import { CreditCard, ArrowLeft, RefreshCw } from 'lucide-react';
import { radius, elevationSystem } from '../../shared/core/uiDesignSystem';
import { navigation } from '../../shared/core/utils/navigation';
import { getPacksSentence } from '../../shared/core/payments/legalCopyEngine';

export function RefundPolicyPage() {
  return (
    <div className="h-[100dvh] w-full overflow-y-auto bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] font-sans flex flex-col">
      {/* Header Público */}
      <header className={`bg-[var(--ui-bg-card)] border-b border-[var(--ui-border)] px-4 py-3 sticky top-0 z-30 ${elevationSystem.raised}`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigation.goTo('/')}
              className="p-1.5 rounded-[var(--radius-control)] hover:bg-[var(--ui-bg-panel)] text-[var(--ui-text-secondary)] transition cursor-pointer"
              title="Volver a la aplicación"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[var(--color-status-success-text)]" />
              <span className="font-black text-sm tracking-tight">LEECV — Política de Reembolsos</span>
            </div>
          </div>
          <a
            href="/"
            style={{ borderRadius: radius.control }}
            className="px-3 py-1.5 text-xs font-bold bg-[var(--ui-text-primary)] text-[var(--ui-bg-card)] hover:opacity-90 transition"
          >
            Ir a la App
          </a>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div
          style={{ borderRadius: radius.modal }}
          className={`bg-[var(--ui-bg-card)] border border-[var(--ui-border)] p-6 sm:p-8 ${elevationSystem.overlay}`}
        >
          <h1 className="text-xl font-black mb-1 text-[var(--ui-text-primary)]">Política de Cancelaciones y Reembolsos</h1>
          <p className="text-xs text-[var(--ui-text-secondary)] mb-6">Última actualización: Noviembre 2026 — LEECV (https://leecv.app)</p>

          <div className="space-y-4 text-xs text-[var(--ui-text-secondary)] leading-relaxed font-normal">
            <div
              style={{ borderRadius: radius.card }}
              className="p-3 bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/30 flex items-start gap-3"
            >
              <RefreshCw className="w-5 h-5 text-[var(--color-status-success-text)] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[var(--color-status-success-text)]">
                Transparencia total: cero suscripciones automáticas ni cargos sorpresa en compras puntuales, paquetes ({getPacksSentence()}) y pases de LEECV.
              </p>
            </div>

            <h3 className="text-sm font-black text-[var(--ui-text-primary)]">1. Créditos y Paquetes ({getPacksSentence()})</h3>
            <p>
              Los créditos prepago adquiridos nunca caducan. Si realizaste una compra por error y no utilizaste ninguno de sus créditos, podés solicitar el reembolso total dentro de los primeros <strong>14 días corridos</strong> desde la fecha de compra mediante el mismo medio de pago (Mercado Pago o PayPal).
            </p>

            <h3 className="text-sm font-black text-[var(--ui-text-primary)]">2. Pase Permanente y Pases de 30 Días</h3>
            <p>
              Los Pases Permanentes (EditorLee y FacturLee), el Pase Total 30 Días y la Sala de Equipo EditorLee son pagos únicos prepagos sin renovación automática. Si no descargaste ningún archivo bajo el pase recién activado, podés pedir la devolución íntegra dentro de los primeros 14 días corridos. Además, ante una discontinuación definitiva de la plataforma con preaviso de 60 a 90 días, se reintegrará el saldo proporcional de Pases Permanentes comprados dentro de los 12 meses previos o días no gozados de pases temporales.
            </p>

            <h3 className="text-sm font-black text-[var(--ui-text-primary)]">3. Exportaciones Individuales y Fallos Técnicos</h3>
            <p>
              Una compra de 1 descarga no utilizada tiene garantía de devolución de 14 días corridos. Si sufriste un inconveniente técnico verificable al descargar tu archivo después de debitarse un crédito, reponemos el crédito o procesamos el reembolso sin demoras.
            </p>

            <h3 className="text-sm font-black text-[var(--ui-text-primary)]">4. Cómo Solicitar tu Reembolso</h3>
            <p>
              Escribinos indicando tu número de transacción o correo de pago a{' '}
              <a href="mailto:soporte@leecv.app" className="text-[var(--ui-text-primary)] underline font-bold">
                soporte@leecv.app
              </a>
              . Respondemos en un plazo máximo de 24 a 48 horas hábiles.
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-[var(--ui-border)] flex items-center justify-between text-xs text-[var(--ui-text-secondary)]">
            <span>© 2026 LEECV. Todos los derechos reservados.</span>
            <div className="flex gap-4 font-bold">
              <a href="/privacidad" className="hover:underline">Privacidad</a>
              <a href="/terminos" className="hover:underline">Términos de Servicio</a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default RefundPolicyPage;
