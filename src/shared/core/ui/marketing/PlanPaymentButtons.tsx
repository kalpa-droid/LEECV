import React from 'react';
import { Loader2 } from 'lucide-react';
import { PlanId, formatPrice } from '../../payments/pricingCatalog';
import { useText } from '../../../i18n/useText';
import { radius, elevationSystem } from '../../uiDesignSystem';

export interface PlanPaymentButtonsProps {
  planId: Extract<PlanId, 'pro' | 'enterprise'>;
  onSelectGateway: (gateway: 'mercadopago' | 'paypal' | 'lemonsqueezy') => void;
  loadingGateway?: string | null;
  disabled?: boolean;
  compact?: boolean;
  showCurrencyNotice?: boolean;
}

export const PlanPaymentButtons: React.FC<PlanPaymentButtonsProps> = ({
  planId,
  onSelectGateway,
  loadingGateway = null,
  disabled = false,
  compact = false,
  showCurrencyNotice = true,
}) => {
  const t = useText();
  const isLoading = loadingGateway !== null;
  const isCurrentlyDisabled = disabled || isLoading;

  const priceArs = formatPrice(planId, 'ars');
  const priceUsd = formatPrice(planId, 'usd');

  return (
    <div className="w-full space-y-2 mt-auto">
      {/* Botón 1: Mercado Pago (Pesos Argentinos ARS) */}
      <button
        type="button"
        onClick={() => onSelectGateway('mercadopago')}
        disabled={isCurrentlyDisabled}
        className={`w-full ${
          compact ? 'py-1.5 px-3 text-[11px]' : 'py-2.5 px-4 text-xs'
        } rounded-[${radius.card}] ${
          planId === 'enterprise'
            ? 'bg-[var(--color-status-warning-base)] hover:opacity-95 text-[var(--color-accent-on-base)]'
            : 'bg-[var(--color-accent-purple)] hover:opacity-90 text-white'
        } font-black transition cursor-pointer flex items-center justify-between gap-2 ${elevationSystem.raised} disabled:opacity-50`}
      >
        <span className="flex items-center gap-1.5 truncate">
          {loadingGateway === 'mercadopago' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          ) : (
            <span>🇦🇷</span>
          )}
          <span className="truncate">Mercado Pago</span>
        </span>
        <span className="text-[10px] font-extrabold opacity-95 shrink-0 bg-black/20 px-2 py-0.5 rounded-full">
          {priceArs}
        </span>
      </button>

      {/* Botón 2: PayPal (Dólares USD) */}
      <button
        type="button"
        onClick={() => onSelectGateway('paypal')}
        disabled={isCurrentlyDisabled}
        className={`w-full ${
          compact ? 'py-1.5 px-3 text-[11px]' : 'py-2 px-4 text-xs'
        } rounded-[${radius.card}] bg-[var(--color-secondary-muted)] hover:opacity-90 text-[var(--color-secondary-text)] border border-[var(--color-secondary-base)]/30 font-black transition cursor-pointer flex items-center justify-between gap-2 disabled:opacity-50`}
      >
        <span className="flex items-center gap-1.5 truncate">
          {loadingGateway === 'paypal' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          ) : (
            <span>💳</span>
          )}
          <span className="truncate">PayPal</span>
        </span>
        <span className="text-[10px] font-extrabold opacity-90 shrink-0 bg-black/10 px-2 py-0.5 rounded-full">
          {priceUsd}
        </span>
      </button>

      {/* Botón 3: Lemon Squeezy (Dólares USD) */}
      <button
        type="button"
        onClick={() => onSelectGateway('lemonsqueezy')}
        disabled={isCurrentlyDisabled}
        className={`w-full ${
          compact ? 'py-1.5 px-3 text-[10px]' : 'py-2 px-4 text-[11px]'
        } rounded-[${radius.card}] bg-[var(--ui-bg-panel)] hover:bg-[var(--ui-btn-neutral-hover)] text-[var(--ui-text-primary)] border border-[var(--ui-border)] font-bold transition cursor-pointer flex items-center justify-between gap-2 disabled:opacity-50`}
      >
        <span className="flex items-center gap-1.5 truncate">
          {loadingGateway === 'lemonsqueezy' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          ) : (
            <span>🌎</span>
          )}
          <span className="truncate">Lemon Squeezy</span>
        </span>
        <span className="text-[10px] font-bold opacity-80 shrink-0 bg-[var(--ui-bg-card)] px-2 py-0.5 rounded-full border border-[var(--ui-border)]">
          {priceUsd}
        </span>
      </button>

      {showCurrencyNotice && (
        <p className="text-[10px] text-[var(--ui-text-secondary)] text-center leading-tight pt-1">
          🇦🇷 <strong>ARS</strong> con Mercado Pago &bull; 💳/🌎 <strong>USD</strong> con PayPal o Lemon Squeezy
        </p>
      )}
    </div>
  );
};
