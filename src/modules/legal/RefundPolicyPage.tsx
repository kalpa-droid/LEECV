import React from 'react';
import { CreditCard, ArrowLeft, RefreshCw } from 'lucide-react';
import { radius, elevationSystem } from '../../shared/core/uiDesignSystem';
import { navigation } from '../../shared/core/utils/navigation';

export function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] font-sans flex flex-col">
      {/* Header Público */}
      <header className={`bg-[var(--ui-bg-card)] border-b border-[var(--ui-border)] px-4 py-3 sticky top-0 z-30 ${elevationSystem.raised}`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
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
            className={`px-3 py-1.5 text-xs font-bold bg-[var(--ui-text-primary)] text-[var(--ui-bg-card)] rounded-[${radius.control}] hover:opacity-90 transition`}
          >
            Ir a la App
          </a>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className={`bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-[${radius.modal}] p-6 sm:p-8 ${elevationSystem.overlay}`}>
          <h1 className="text-xl font-black mb-1 text-[var(--ui-text-primary)]">Política de Cancelaciones y Reembolsos</h1>
          <p className="text-xs text-[var(--ui-text-secondary)] mb-6">Última actualización: Septiembre 2026 — LEECV Inc. (https://leecv.app)</p>

          <div className="space-y-4 text-xs text-[var(--ui-text-secondary)] leading-relaxed font-normal">
            <div className={`p-3 bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/30 rounded-[${radius.card}] flex items-start gap-3`}>
              <RefreshCw className="w-5 h-5 text-[var(--color-status-success-text)] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[var(--color-status-success-text)]">
                Transparencia total en compras puntuales de paquetes de créditos y suscripciones recurrentes Pro y Enterprise.
              </p>
            </div>

            <h3 className="text-sm font-black text-[var(--ui-text-primary)]">1. Paquetes de Créditos (Pack 5 y Pack 10)</h3>
            <p>
              Los créditos adquiridos mediante paquetes individuales (Pack 5 y Pack 10) no tienen fecha de caducidad y permanecen asociados indefinidamente a la cuenta del usuario.
            </p>
            <p>
              Si un usuario realiza una compra por error y no ha consumido ninguno de los créditos del paquete adquirido, puede solicitar el reembolso total dentro de los primeros 14 días corridos desde la fecha de compra. El reembolso se procesará a través del mismo medio de pago (Mercado Pago, PayPal o Lemon Squeezy).
            </p>

            <h3 className="text-sm font-black text-[var(--ui-text-primary)]">2. Suscripciones Recurrentes (Pro y Enterprise)</h3>
            <p>
              Las suscripciones mensuales Pro y Enterprise pueden cancelarse en cualquier momento desde el panel de usuario o comunicándose con soporte. La cancelación evita futuros cobros y mantiene el acceso a las funciones avanzadas y almacenamiento hasta la finalización del período contratado.
            </p>

            <h3 className="text-sm font-black text-[var(--ui-text-primary)]">3. Solicitud de Reembolso</h3>
            <p>
              Para solicitar una devolución o reembolso, por favor contáctanos con tu número de transacción o comprobante a través de los canales oficiales de soporte en la plataforma.
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-[var(--ui-border)] flex items-center justify-between text-xs text-[var(--ui-text-secondary)]">
            <span>© 2026 LEECV Inc. Todos los derechos reservados.</span>
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
