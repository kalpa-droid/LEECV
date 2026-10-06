import React, { useState } from 'react';
import { Modal } from '../../../shared/core/ui/Modal';
import { useAuth } from '../../../shared/core/auth/AuthContext';
import { CreditCard, Check, ShieldCheck, Zap } from 'lucide-react';
import { radius, button } from '../../../shared/core/uiDesignSystem';
import { formatPrice } from '../../../shared/core/payments/pricingCatalog';
import { selectPaidPlan } from '../paymentService';
import { useToast } from '../../../shared/core/ui/Toast';
import { dal } from '../../../shared/core/storage/dataAccessLayer';
import { withErrorHandling } from '../../../shared/core/utils/errorHandler';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
}

export function PricingModal({ isOpen, onClose, onOpenLogin }: PricingModalProps) {
  const { user, profile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async (planId: 'credits_pack_5' | 'credits_pack_10' | 'pro', gateway: 'mercadopago' | 'paypal' | 'lemonsqueezy') => {
    if (!user) {
      onClose();
      onOpenLogin();
      return;
    }

    setIsProcessing(true);

    // Create a new export token via Supabase tied to the user
    let exportToken = '';
    const resToken = await withErrorHandling(
      async () => {
        const data = await dal.pdfExportTokens.insert({ 
          email: user.email!,
          doc_type: 'pack', // or 'pro', but doc_type here is just an indicator for the pack
          user_id: user.id
        });
        if (!data) throw new Error('Error al generar token de pago');
        exportToken = data.token;
      },
      { context: 'Creando Token de Checkout', errorMessage: 'Error al inicializar el checkout' }
    );

    if (!resToken.success || !exportToken) {
      showError(resToken.error?.message || 'Error al iniciar checkout');
      setIsProcessing(false);
      return;
    }

    localStorage.setItem('leecv_export_token', exportToken);

    await selectPaidPlan(planId, gateway, user.email!, exportToken, user.id, {
      onError: (msg) => {
        showError(msg);
        setIsProcessing(false);
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={'Mejora tu cuenta'}
      icon={<Zap className="w-5 h-5 text-[var(--color-status-warning-text)]" />}
      size="lg"
    >
      <div className={`p-4 bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] rounded-[${radius.modal}] space-y-4 text-xs`}>
        {!user && (
          <div className="p-3 bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)]/40 rounded-[var(--radius-card)] text-[var(--color-status-warning-text)] flex items-center justify-between">
            <span>Inicia sesión o crea una cuenta para comprar packs de descargas o suscripciones.</span>
            <button
              onClick={() => {
                onClose();
                onOpenLogin();
              }}
              className={`${button.primary} py-1.5 px-3 text-[10px] whitespace-nowrap`}
            >
              Iniciar Sesión
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Pack 5 */}
          <div className={`p-4 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-[${radius.card}] flex flex-col justify-between`}>
            <div>
              <h3 className="font-black text-[var(--ui-text-primary)] text-sm mb-1">Pack 5 Créditos</h3>
              <p className="text-[10px] text-[var(--ui-text-secondary)] mb-4">5 exportaciones PDF. No vencen.</p>
              
              <ul className="space-y-2 mb-4 text-[11px] text-[var(--ui-text-secondary)]">
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[var(--color-status-success-text)]" /> Exportaciones en alta calidad</li>
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[var(--color-status-success-text)]" /> Sin marca de agua</li>
              </ul>
            </div>
            
            <div className="space-y-2 pt-3 border-t border-[var(--ui-border)]">
              <button
                onClick={() => handleCheckout('credits_pack_5', 'mercadopago')}
                disabled={isProcessing}
                className={`w-full p-2.5 ${button.providerBrand('mercadopago')} rounded-[${radius.control}] flex items-center justify-between`}
              >
                <span className="font-bold text-[10px]">MercadoPago (ARS)</span>
                <span className="font-black text-[11px]">{formatPrice('credits_pack_5', 'ars')}</span>
              </button>
              <button
                onClick={() => handleCheckout('credits_pack_5', 'lemonsqueezy')}
                disabled={isProcessing}
                className={`w-full p-2.5 ${button.providerBrand('lemonsqueezy')} rounded-[${radius.control}] flex items-center justify-between`}
              >
                <span className="font-bold text-[10px]">Internacional (USD)</span>
                <span className="font-black text-[11px]">{formatPrice('credits_pack_5', 'usd')}</span>
              </button>
            </div>
          </div>

          {/* Pro */}
          <div className={`p-4 bg-[var(--color-accent-purple-muted)] border border-[var(--color-accent-purple-bright)] rounded-[${radius.card}] flex flex-col justify-between`}>
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-black text-[var(--color-accent-purple-text)] text-sm">LEECV Pro</h3>
                <span className="bg-[var(--color-accent-purple-base)] text-[var(--color-accent-on-base)] text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Suscripción</span>
              </div>
              <p className="text-[10px] text-[var(--ui-text-primary)] opacity-80 mb-4">Exportaciones ilimitadas al mes.</p>
              
              <ul className="space-y-2 mb-4 text-[11px] text-[var(--ui-text-primary)]">
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[var(--color-accent-purple-text)]" /> Todo lo de los packs</li>
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[var(--color-accent-purple-text)]" /> Exportaciones ilimitadas</li>
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[var(--color-accent-purple-text)]" /> Soporte prioritario</li>
              </ul>
            </div>
            
            <div className="space-y-2 pt-3 border-t border-[var(--color-accent-purple-bright)]/20">
              <button
                onClick={() => handleCheckout('pro', 'mercadopago')}
                disabled={isProcessing}
                className={`w-full p-2.5 ${button.providerBrand('mercadopago')} rounded-[${radius.control}] flex items-center justify-between`}
              >
                <span className="font-bold text-[10px]">MercadoPago (ARS/mes)</span>
                <span className="font-black text-[11px]">{formatPrice('pro', 'ars')}</span>
              </button>
              <button
                onClick={() => handleCheckout('pro', 'lemonsqueezy')}
                disabled={isProcessing}
                className={`w-full p-2.5 ${button.providerBrand('lemonsqueezy')} rounded-[${radius.control}] flex items-center justify-between`}
              >
                <span className="font-bold text-[10px]">Internacional (USD/mes)</span>
                <span className="font-black text-[11px]">{formatPrice('pro', 'usd')}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </Modal>
  );
}
