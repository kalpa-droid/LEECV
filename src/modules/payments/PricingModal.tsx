import React, { useState } from 'react';
import { Check, Crown, Zap, Shield, Sparkles, Cloud, Smartphone, User, LogOut, HardDrive, LogIn } from 'lucide-react';
import { iniciarPagoMercadoPago, iniciarPagoLemonSqueezy, iniciarPagoPayPal } from './paymentService';
import { useToast } from '../../shared/core/ui/Toast';
import { Modal } from '../../shared/core/ui/Modal';
import { withErrorHandling } from '../../shared/core/utils/errorHandler';
import { logout, signInWithGoogle } from '../auth/authService';

import { elevationSystem, radius } from '../../shared/core/uiDesignSystem';
import { formatPrice, formatPricePerMonth } from '../../shared/core/payments/pricingCatalog';
import { getPlanLabel } from '../../shared/core/entitlements/useEntitlements';
import { useText } from '../../shared/i18n/useText';
import { PlanFeatureCard } from '../../shared/core/ui/marketing/PlanFeatureCard';

export default function PricingModal({ isOpen, onClose, currentProfile }: any) {
  const { showError, showSuccess } = useToast();
  const [loadingGateway, setLoadingGateway] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const t = useText();

  async function handleLogout() {
    setIsLoggingOut(true);
    await withErrorHandling(
      async () => {
        await logout();
        showSuccess(t.pricing.sessionClosedSuccess);
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      },
      { context: 'Cerrar Sesión' }
    );
    setIsLoggingOut(false);
  }

  async function handleGoogleConnect() {
    await withErrorHandling(
      async () => {
        await signInWithGoogle();
      },
      { context: 'Vincular Google Drive' }
    );
  }

  async function handleSelectPlan(planId: 'pro' | 'enterprise', gateway: 'mercadopago' | 'paypal' | 'lemonsqueezy') {
    setLoadingGateway(gateway);
    await withErrorHandling(
      async () => {
        if (gateway === 'mercadopago') {
          await iniciarPagoMercadoPago(planId);
        } else if (gateway === 'paypal') {
          await iniciarPagoPayPal(planId);
        } else {
          await iniciarPagoLemonSqueezy(planId);
        }
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
        {/* Tarjeta de Cuenta Activa / Perfil de Usuario */}
        <div className={`bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-[${radius.modal}] p-4 flex flex-col md:flex-row items-center justify-between gap-4`}>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className={`w-10 h-10 rounded-[${radius.card}] bg-[var(--color-accent-purple-light)] border border-[var(--color-accent-purple)]/40 text-[var(--color-accent-purple-text)] flex items-center justify-center flex-shrink-0`}>
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[var(--ui-text-primary)]">
                  {currentProfile?.email || 'Sesión Activa en LEECV'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)] border border-[var(--color-status-warning-base)]/30 uppercase">
                  {currentProfile?.role === 'admin' ? 'Administrador' : getPlanLabel(currentProfile?.plan)}
                </span>
              </div>
              <p className="text-[11px] text-[var(--ui-text-secondary)] flex items-center gap-1.5 mt-0.5">
                <HardDrive className="w-3.5 h-3.5 text-[var(--ui-secondary)]" />
                <span>{t.pricing.googleDriveLabel} {currentProfile?.drive_connected ? '🟢 Conectado' : '⚪ No vinculado'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => handleSelectPlan('pro', 'mercadopago')}
              className={`px-3.5 py-2 rounded-[${radius.card}] bg-[var(--color-accent-purple)] hover:opacity-90 text-white font-extrabold text-xs transition ${elevationSystem.raised} cursor-pointer flex items-center gap-1.5`}
            >
              <Crown className="w-4 h-4" />
              <span>{t.pricing.upgradeToAgency}{formatPricePerMonth('pro', 'usd')})</span>
            </button>
          </div>
        </div>

        {/* Encabezado Explicativo */}
        <div className="text-center space-y-1.5 max-w-xl mx-auto">
          <h2 className="text-lg font-black text-[var(--ui-text-primary)] tracking-tight">{t.pricing.choosePerfectPlan}</h2>
          <p className="text-xs text-[var(--ui-text-secondary)]">
            {t.pricing.planSubtitle}
          </p>
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
              className={`w-full py-2.5 bg-[var(--ui-bg-panel)] hover:bg-[var(--ui-btn-neutral-hover)] text-[var(--ui-text-primary)] border border-[var(--ui-border)] text-xs font-black rounded-[${radius.card}] transition cursor-pointer`}
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
