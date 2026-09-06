import React, { useState, useEffect } from 'react';
import { X, Sparkles, ShieldCheck, ArrowRight, Clock } from 'lucide-react';
import { dal } from '../../../shared/core/storage/dataAccessLayer';
import { button, glassmorphism } from '../../../shared/core/uiDesignSystem';
import { t } from '../../../shared/i18n/useText';

interface RetentionOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onAcceptOffer?: () => void;
}

export const RetentionOfferModal: React.FC<RetentionOfferModalProps> = ({
  isOpen,
  onClose,
  userId,
  onAcceptOffer,
}) => {
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen || !userId) return;

    let isMounted = true;
    async function loadOffer() {
      setLoading(true);
      try {
        const activeOffer = await dal.retentionOffers.getActiveForUser(userId);
        if (isMounted) {
          setOffer(activeOffer);
        }
      } catch (err) {
        console.warn('Error cargando oferta de retención:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadOffer();
    return () => {
      isMounted = false;
    };
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const discountPercent = offer?.discount_percent || 20;

  const handleCheckout = () => {
    if (onAcceptOffer) {
      onAcceptOffer();
    } else {
      const checkoutUrl = `https://leecv.lemonsqueezy.com/checkout/buy/pro?discount=RETENCION${discountPercent}&user_id=${encodeURIComponent(userId)}`;
      window.open(checkoutUrl, '_blank');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className={`relative w-full max-w-lg rounded-2xl p-6 overflow-hidden ${glassmorphism.panel} border-[var(--color-secondary-base)]/40 shadow-2xl bg-[var(--ui-bg-card)]`}>
        {/* Glow de fondo */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--color-secondary-base)]/20 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] hover:bg-[var(--ui-border)]/20 transition-colors"
          aria-label={t.common.actions.close}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold bg-[var(--color-status-success-muted)] text-[var(--color-status-success-text)] border border-[var(--color-status-success-base)]/40">
            <Sparkles className="w-3.5 h-3.5" />
            {t.retention.offerModal.tag}
          </span>
        </div>

        <h3 className="text-xl font-bold text-[var(--ui-text-primary)] mb-2 leading-tight">
          {t.retention.offerModal.headlinePrefix} {discountPercent}{t.retention.offerModal.headlineSuffix}
        </h3>

        <p className="text-sm text-[var(--ui-text-secondary)] mb-6 leading-relaxed">
          {t.retention.offerModal.body}
        </p>

        <div className="space-y-3 mb-6 bg-[var(--ui-bg-panel)] rounded-xl p-4 border border-[var(--ui-border)]">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[var(--color-secondary-text)] shrink-0 mt-0.5" />
            <div className="text-xs text-[var(--ui-text-secondary)]">
              <span className="font-semibold text-[var(--ui-text-primary)]">{t.retention.offerModal.feature1Title}</span>
              <p className="text-[var(--ui-text-secondary)] mt-0.5">{t.retention.offerModal.feature1Sub}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-[var(--color-secondary-text)] shrink-0 mt-0.5" />
            <div className="text-xs text-[var(--ui-text-secondary)]">
              <span className="font-semibold text-[var(--ui-text-primary)]">{t.retention.offerModal.feature2Title}</span>
              <p className="text-[var(--ui-text-secondary)] mt-0.5">{t.retention.offerModal.feature2Sub}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCheckout}
            className={`${button.primary} w-full flex items-center justify-center gap-2 py-3 bg-[var(--color-secondary-base)] hover:bg-[var(--color-secondary-hover)] font-semibold text-sm shadow-lg border-none`}
          >
            {t.retention.offerModal.buttonPrefix} {discountPercent}{t.retention.offerModal.buttonSuffix}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
