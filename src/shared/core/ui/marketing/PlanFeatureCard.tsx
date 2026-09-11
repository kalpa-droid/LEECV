import React from 'react';
import { Check, Sparkles, Zap } from 'lucide-react';
import { formatPrice, formatPricePerMonth, PlanId } from '../../payments/pricingCatalog';
import { PLAN_FEATURES } from '../../entitlements/useEntitlements';
import { useText } from '../../../i18n/useText';
import { PlanPaymentButtons } from './PlanPaymentButtons';

export interface PlanFeatureCardProps {
  planId: 'free' | 'pro' | 'enterprise';
  highlighted?: boolean;
  currency?: 'usd' | 'ars';
  ctaLabel?: string;
  onSelectPlan?: (planId: string) => void;
  onSelectGateway?: (planId: 'pro' | 'enterprise', gateway: 'mercadopago' | 'paypal' | 'lemonsqueezy') => void;
  loadingGateway?: string | null;
  children?: React.ReactNode;
}

export const PlanFeatureCard: React.FC<PlanFeatureCardProps> = ({
  planId,
  highlighted = false,
  currency = 'usd',
  ctaLabel,
  onSelectPlan,
  onSelectGateway,
  loadingGateway = null,
  children,
}) => {
  const t = useText();
  const planInfo = PLAN_FEATURES[planId];
  const catalogPlanId: PlanId = planId === 'free' ? 'single_pdf' : planId;

  const mainPriceDisplay =
    planId === 'free'
      ? t.pricing.freePriceLabel
      : formatPricePerMonth(catalogPlanId, 'usd');

  const altPriceDisplay =
    planId === 'free'
      ? null
      : `o ${formatPricePerMonth(catalogPlanId, 'ars')}`;

  const priceSubtext =
    planId === 'free'
      ? t.pricing.basicEditorLabel
      : 'USD o ARS / Facturación mensual';

  const bullets = planInfo?.marketingBullets || [];

  return (
    <div
      className={`relative flex flex-col justify-between p-6 rounded-[16px] transition-all duration-200 ${
        highlighted
          ? 'bg-[var(--ui-bg-panel)] border-2 border-[var(--color-accent-base)] shadow-2xl shadow-[var(--color-accent-base)]/10 scale-[1.02] z-10'
          : 'bg-[var(--ui-bg-card)] border border-[var(--ui-border)] hover:border-[var(--ui-border-strong)]'
      }`}
    >
      {highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t.pricing.mostRecommendedBadge}</span>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-xl font-bold text-[var(--ui-text-primary)]">
            {planInfo?.label || planId}
          </h3>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${planInfo?.badgeClass}`}>
            {planId === 'free' ? 'Básico' : planId === 'pro' ? 'Popular' : 'Full'}
          </span>
        </div>

        <div className="mt-4 mb-6">
          <div className="text-3xl font-extrabold text-[var(--ui-text-primary)] tracking-tight">
            {mainPriceDisplay}
          </div>
          {altPriceDisplay && (
            <div className="text-xs font-bold text-[var(--color-status-success-text)] mt-0.5">
              {altPriceDisplay}
            </div>
          )}
          <p className="text-xs text-[var(--ui-text-secondary)] mt-1">{priceSubtext}</p>
        </div>

        <ul className="space-y-3 text-xs text-[var(--ui-text-secondary)] mb-8">
          {bullets.map((bulletKey, index) => {
            const labelText = (t.pricing as any)[bulletKey] || bulletKey;
            return (
              <li key={index} className="flex items-start gap-3">
                <Check className="w-4 h-4 text-[var(--color-status-success-text)] shrink-0 mt-0.5" />
                <span className="leading-normal">{labelText}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {children ? (
        <div className="space-y-2 mt-auto">
          {children}
        </div>
      ) : planId !== 'free' && onSelectGateway ? (
        <PlanPaymentButtons
          planId={planId}
          onSelectGateway={(gw) => onSelectGateway(planId, gw)}
          loadingGateway={loadingGateway}
        />
      ) : onSelectPlan ? (
        <button
          type="button"
          onClick={() => onSelectPlan(planId)}
          className={`w-full py-3 px-4 rounded-[10px] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            highlighted
              ? 'bg-[var(--color-accent-base)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-on-base)] shadow-lg shadow-[var(--color-accent-base)]/25'
              : 'bg-[var(--ui-bg-panel)] hover:bg-[var(--ui-bg-card)] border border-[var(--ui-border)] text-[var(--ui-text-primary)]'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>{ctaLabel || (planId === 'free' ? t.pricing.useFreeEditorBtn : 'Elegir Plan')}</span>
        </button>
      ) : null}
    </div>
  );
};
