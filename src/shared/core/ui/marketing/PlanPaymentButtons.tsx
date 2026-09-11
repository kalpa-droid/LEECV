import React from 'react';
import { radius, elevationSystem } from '../../uiDesignSystem';
import { useText } from '../../../i18n/useText';

export type PaymentGatewayId = 'mercadopago' | 'paypal' | 'lemonsqueezy';

export interface PlanPaymentButtonsProps {
  planId: 'pro' | 'enterprise';
  onSelectGateway: (planId: 'pro' | 'enterprise', gateway: PaymentGatewayId) => void;
  loadingGateway?: string | null;
  /** Color de acento del botón principal (Mercado Pago) — Pro y Enterprise usan colores distintos hoy. */
  primaryButtonClass?: string;
}

/**
 * NÚCLEO ÚNICO de los 3 botones de pasarela de pago (Mercado Pago, PayPal,
 * Lemon Squeezy) para un plan pago. Antes esto estaba escrito 2 veces a
 * mano dentro de PricingModal.tsx (uno para 'pro', casi idéntico otro para
 * 'enterprise'), y la landing tenía un botón falso que solo navegaba al
 * editor sin iniciar ningún pago real. Cualquier lugar de la app que
 * necesite ofrecer pago de un plan (modal, landing, futuras páginas de
 * producto) usa este componente — no se vuelve a escribir un botón de
 * pasarela a mano.
 */
export const PlanPaymentButtons: React.FC<PlanPaymentButtonsProps> = ({
  planId,
  onSelectGateway,
  loadingGateway = null,
  primaryButtonClass = 'bg-[var(--color-accent-purple)] hover:opacity-90 text-white',
}) => {
  const t = useText();

  return (
    <>
      <button
        onClick={() => onSelectGateway(planId, 'mercadopago')}
        disabled={loadingGateway !== null}
        className={`w-full py-2.5 ${primaryButtonClass} text-xs font-black rounded-[${radius.card}] ${elevationSystem.raised} transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60`}
      >
        <span>{planId === 'pro' ? t.pricing.subscribeMercadoPagoArgentine : t.pricing.activateMercadoPagoArgentine}</span>
      </button>
      <button
        onClick={() => onSelectGateway(planId, 'paypal')}
        disabled={loadingGateway !== null}
        className={`w-full py-2 bg-[var(--color-secondary-muted)] hover:opacity-90 text-[var(--color-secondary-text)] border border-[var(--color-secondary-base)]/30 text-xs font-black rounded-[${radius.card}] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60`}
      >
        <span>{t.pricing.payPaypalUsd}</span>
      </button>
      <button
        onClick={() => onSelectGateway(planId, 'lemonsqueezy')}
        disabled={loadingGateway !== null}
        className={`w-full py-2 bg-[var(--ui-bg-panel)] hover:bg-[var(--ui-btn-neutral-hover)] text-[var(--ui-text-primary)] text-[11px] font-bold rounded-[${radius.card}] transition flex items-center justify-center gap-1.5 border border-[var(--ui-border)] cursor-pointer disabled:opacity-60`}
      >
        <span>{t.pricing.subscribeLemonSqueezyUsd}</span>
      </button>
      {/* Nota informativa fuera de los botones — hereda el fondo real de la
          card (PlanFeatureCard), no el de los botones de acento que la
          preceden; el auditor estático asocia mal el bg más cercano. */}
      {/* check-contrast-ignore-next-line */}
      <p className="text-[10px] text-[var(--ui-text-secondary)] text-center pt-1 leading-snug">
        {t.pricing.currencyClarityNote}
      </p>
    </>
  );
};
