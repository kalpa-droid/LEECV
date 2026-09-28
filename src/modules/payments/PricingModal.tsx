import React, { useState } from 'react';
import { Check, Crown, Zap, Shield, Sparkles, Cloud, Smartphone, User, LogOut, HardDrive, LogIn } from 'lucide-react';
import { selectPaidPlan } from './paymentService';
import { useToast } from '../../shared/core/ui/Toast';
import { Modal } from '../../shared/core/ui/Modal';
import { withErrorHandling } from '../../shared/core/utils/errorHandler';
import { navigation } from '../../shared/core/utils/navigation';

import { button, elevationSystem, radius } from '../../shared/core/uiDesignSystem';
import { formatPrice, formatPricePerMonth } from '../../shared/core/payments/pricingCatalog';
import { getPlanLabel } from '../../shared/core/entitlements/useEntitlements';
import { useText } from '../../shared/i18n/useText';
import { PlanFeatureCard } from '../../shared/core/ui/marketing/PlanFeatureCard';

export default function PricingModal({ isOpen, onClose }: any) {
  const { showError, showSuccess } = useToast();
  const [loadingGateway, setLoadingGateway] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const t = useText();

  async function handleSelectPlan(planId: 'pro' | 'enterprise', gateway: 'mercadopago' | 'paypal' | 'lemonsqueezy') {
    if (!email) {
      showError('Por favor ingresa tu email para asociar la compra.');
      return;
    }
    setLoadingGateway(gateway);
    await withErrorHandling(
      async () => {
        await selectPaidPlan(planId, gateway, email, undefined, {
          onError: (msg) => showError(msg)
        });
      },
      {
        context: 'Selección de Plan de Pago',
        errorMessage: 'Inconveniente al conectar con la pasarela de pagos.',
        notify: (msg) => showError(msg)
      }
    );
    setLoadingGateway(null);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.pricing.modalTitle}
      icon={<Sparkles className="w-5 h-5 text-[var(--ui-accent-purple)]" />}
      size="4xl"
      footer={
        <div className="w-full p-2 text-center text-[11px] text-[var(--ui-text-secondary)]">
          {t.pricing.sslSecurityBanner}
        </div>
      }
    >
      <div className={`space-y-6 bg-[var(--ui-bg-panel)] p-4 rounded-[${radius.modal}] text-[var(--ui-text-primary)]`}>

        {/* Encabezado Explicativo */}
        <div className="text-center space-y-1.5 max-w-xl mx-auto">
          <h2 className="text-lg font-black text-[var(--ui-text-primary)] tracking-tight">{t.pricing.choosePerfectPlan}</h2>
          <p className="text-xs text-[var(--ui-text-secondary)]">
            {t.pricing.planSubtitle}
          </p>
          <div className="pt-4 max-w-sm mx-auto">
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Tu correo electrónico (para enviarte el comprobante y token)"
              className="w-full px-3 py-2 text-sm border border-[var(--ui-border)] rounded-[var(--radius-control)] bg-[var(--ui-bg-card)] focus:outline-none focus:border-[var(--color-accent-base)] text-[var(--ui-text-primary)] placeholder:text-[var(--ui-text-secondary)]/50"
            />
          </div>
        </div>

        {/* Tabla de 3 Niveles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* NIVEL 1: USUARIO INDIVIDUAL */}
          <PlanFeatureCard
            planId="free"
            ctaLabel={t.pricing.useFreeEditorBtn}
          >
            <button
              onClick={onClose}
              className={`${button.secondary} w-full py-2.5 text-xs font-black`}
            >
              {t.pricing.useFreeEditorBtn}
            </button>
          </PlanFeatureCard>

          {/* NIVEL 2: AGENCIA PRO (MÁS POPULAR) */}
          <PlanFeatureCard
            planId="pro"
            highlighted={true}
            onSelectGateway={(planId, gw) => handleSelectPlan(planId, gw)}
            loadingGateway={loadingGateway}
          />

          {/* NIVEL 3: AGENCIA ENTERPRISE + LEECV CLOUD */}
          <PlanFeatureCard
            planId="enterprise"
            onSelectGateway={(planId, gw) => handleSelectPlan(planId, gw)}
            loadingGateway={loadingGateway}
          />
        </div>
      </div>
    </Modal>
  );
}
