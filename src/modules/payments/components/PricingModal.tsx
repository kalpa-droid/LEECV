import React, { useState } from 'react';
import { Modal } from '../../../shared/core/ui/Modal';
import { useAuth } from '../../../shared/core/auth/AuthContext';
import { Check, Zap, Sparkles } from 'lucide-react';
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
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async (planId: 'credits_pack_5' | 'credits_pack_10', gateway: 'mercadopago' | 'paypal') => {
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
          doc_type: 'pack',
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
      title={'Comprar Paquetes de Créditos'}
      icon={<Zap className="w-5 h-5 text-[var(--color-status-warning-text)]" />}
      size="lg"
    >
      <div className={`p-4 bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] rounded-[${radius.modal}] space-y-4 text-xs`}>
        {!user && (
          <div className="p-3 bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)]/40 rounded-[var(--radius-card)] text-[var(--color-status-warning-text)] flex items-center justify-between">
            <span>Inicia sesión o crea una cuenta para comprar packs de exportaciones.</span>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full">
          
          {/* Pack 5 */}
          <div className={`p-4 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-[${radius.card}] flex flex-col justify-between`}>
            <div>
              <h3 className="font-black text-[var(--ui-text-primary)] text-sm mb-1">Pack 5 Créditos</h3>
              <p className="text-[10px] text-[var(--ui-text-secondary)] mb-4">5 exportaciones PDF. No vencen.</p>
              
              <ul className="space-y-2 mb-4 text-[11px] text-[var(--ui-text-secondary)]">
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[var(--color-status-success-text)]" /> Exportaciones en alta calidad</li>
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[var(--color-status-success-text)]" /> Sin marca de agua</li>
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[var(--color-status-success-text)]" /> Créditos permanentes</li>
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
                onClick={() => handleCheckout('credits_pack_5', 'paypal')}
                disabled={isProcessing}
                className={`w-full p-2.5 ${button.providerBrand('paypal')} rounded-[${radius.control}] flex items-center justify-between`}
              >
                <span className="font-bold text-[10px]">PayPal (USD)</span>
                <span className="font-black text-[11px]">{formatPrice('credits_pack_5', 'usd')}</span>
              </button>
            </div>
          </div>

          {/* Pack 10 */}
          <div className={`p-4 bg-[var(--ui-bg-card)] border-2 border-[var(--color-accent-base)] rounded-[${radius.card}] flex flex-col justify-between relative`}>
            <div className="absolute -top-2.5 right-3 bg-[var(--color-accent-base)] text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Mejor Valor</span>
            </div>
            <div>
              <h3 className="font-black text-[var(--ui-text-primary)] text-sm mb-1">Pack 10 Créditos</h3>
              <p className="text-[10px] text-[var(--ui-text-secondary)] mb-4">10 exportaciones PDF. No vencen.</p>
              
              <ul className="space-y-2 mb-4 text-[11px] text-[var(--ui-text-secondary)]">
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[var(--color-status-success-text)]" /> Exportaciones en alta calidad</li>
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[var(--color-status-success-text)]" /> Sin marca de agua</li>
                <li className="flex items-center gap-2"><Check className="w-3 h-3 text-[var(--color-status-success-text)]" /> Mayor ahorro por crédito</li>
              </ul>
            </div>
            
            <div className="space-y-2 pt-3 border-t border-[var(--ui-border)]">
              <button
                onClick={() => handleCheckout('credits_pack_10', 'mercadopago')}
                disabled={isProcessing}
                className={`w-full p-2.5 ${button.providerBrand('mercadopago')} rounded-[${radius.control}] flex items-center justify-between`}
              >
                <span className="font-bold text-[10px]">MercadoPago (ARS)</span>
                <span className="font-black text-[11px]">{formatPrice('credits_pack_10', 'ars')}</span>
              </button>
              <button
                onClick={() => handleCheckout('credits_pack_10', 'paypal')}
                disabled={isProcessing}
                className={`w-full p-2.5 ${button.providerBrand('paypal')} rounded-[${radius.control}] flex items-center justify-between`}
              >
                <span className="font-bold text-[10px]">PayPal (USD)</span>
                <span className="font-black text-[11px]">{formatPrice('credits_pack_10', 'usd')}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </Modal>
  );
}
