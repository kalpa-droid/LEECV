import React, { useState } from 'react';
import { selectPaidPlan } from '../../../payments/paymentService';
import { CreditCard, Download, Check, AlertCircle } from 'lucide-react';
import { Modal } from '../../../../shared/core/ui/Modal';
import { supabase } from '../../../../shared/core/lib/supabaseClient';
import { dal } from '../../../../shared/core/storage/dataAccessLayer';
import { useAuth } from '../../../../shared/core/auth/AuthContext';

import { isValidEmail } from '../../../../shared/core/utils/validationEngine';
import { useExportEntitlement } from '../../../../shared/core/entitlements/useExportEntitlement';
import { withErrorHandling } from '../../../../shared/core/utils/errorHandler';

import { radius, button } from '../../../../shared/core/uiDesignSystem';
import { UI_GLOSSARY } from '../../../../shared/core/ui/uiTextGlossary';
import { formatPrice } from '../../../../shared/core/payments/pricingCatalog';
import { useText } from '../../../../shared/i18n/useText';

export default function PdfCheckoutModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  onExportJson,
}: any) {
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const t = useText();
  const { user } = useAuth();

  const { credits, refreshCredits, consumeCreditIfNeeded } = useExportEntitlement();

  const handleCheckout = async (gateway: 'mercadopago' | 'paypal' | 'lemonsqueezy') => {
    if (!email || !isValidEmail(email)) {
      setErrorMsg('Ingresá un correo electrónico válido para recibir tu comprobante');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    // Create a new export token via Supabase
    let exportToken = '';
    const resToken = await withErrorHandling(
      async () => {
        const data = await dal.pdfExportTokens.insert({ email, doc_type: 'cv' });
        if (!data) throw new Error('Error al generar token de pago');
        exportToken = data.token;
      },
      { context: 'Creando Token de Checkout', errorMessage: 'Error al inicializar el checkout' }
    );

    if (!resToken.success || !exportToken) {
      setErrorMsg(resToken.error?.message || 'Error al iniciar checkout');
      setIsProcessing(false);
      return;
    }

    // Save token to localStorage so we can check it upon return
    localStorage.setItem('leecv_export_token', exportToken);

    // Proceed to gateway
    await selectPaidPlan('single_pdf', gateway, email, exportToken, user?.id, {
      onError: (msg) => {
        setErrorMsg(msg);
        setIsProcessing(false);
      }
    });
  };

  const handleConfirmExport = async () => {
    setIsProcessing(true);
    const consumed = await consumeCreditIfNeeded();
    setIsProcessing(false);
    if (consumed) {
      onConfirm();
    } else {
      setErrorMsg('No tienes créditos o token de exportación activos. Adquiere una exportación seleccionando un método de pago.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={'Descargar tu documento en PDF'}
      icon={<span className="text-xl">📄</span>}
      size="lg"
      footer={
        <div className="w-full flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className={button.ghost}
          >
            {t.checkout.backToEditor}
          </button>
          {credits > 0 && (
            <button
              onClick={handleConfirmExport}
              disabled={isProcessing}
              className={`${button.success} flex items-center gap-2`}
            >
              <Check className="w-4 h-4" />
              <span>Confirmar Exportación</span>
            </button>
          )}
        </div>
      }
    >
      <div className={`space-y-4 text-xs p-4 bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] rounded-[${radius.modal}]`}>
        {errorMsg && (
          <div className={`p-3 bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-base)]/40 rounded-[${radius.card}] text-[var(--color-status-danger-text)] text-xs font-bold flex items-center gap-2`}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Email Section */}
        <div className={`p-4 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-[${radius.modal}] space-y-3`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[var(--ui-text-primary)] uppercase tracking-wide">
              {t.checkout.step1Title}
            </span>
          </div>

          <p className="text-[11px] text-[var(--ui-text-secondary)]">
            Ingresá tu correo para recibir el recibo del pago de tu descarga PDF. 
          </p>

          <input 
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.checkout.emailPlaceholder}
            className={`w-full text-xs p-2.5 rounded-[${radius.card}] bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] placeholder-[var(--ui-text-muted)] font-bold outline-none focus:border-[var(--color-accent-base)] transition`}
          />
        </div>

        {/* Payment Gateways */}
        <div className="space-y-2.5">
          <span className="text-xs font-black text-[var(--color-status-warning-text)] uppercase tracking-wide block">
            {t.checkout.step2Title}
          </span>

          <div className="pt-2">
            <span className="text-[10px] font-bold text-[var(--ui-text-secondary)] uppercase tracking-wider block mb-2">
              🇦🇷 Pago en pesos
            </span>
            <button
              onClick={() => handleCheckout('mercadopago')}
              disabled={isProcessing}
              className={`w-full p-3 ${button.providerBrand('mercadopago')} rounded-[${radius.modal}] transition flex items-center justify-between cursor-pointer`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-5 h-5" />
                <div className="text-left">
                  <p className="leading-tight">{t.checkout.payMercadoPagoTitle}</p>
                  <p className="text-[10px] opacity-80 font-bold">{t.checkout.payMercadoPagoDesc}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 bg-black/80 text-[var(--ui-on-dark-amber)] rounded-[${radius.control}] text-[10px] font-black`}>
                {formatPrice('single_pdf', 'ars')}
              </span>
            </button>
          </div>

          <div className="pt-2 border-t border-[var(--ui-border)] mt-1">
            <span className="text-[10px] font-bold text-[var(--ui-text-secondary)] uppercase tracking-wider block mb-2 mt-1">
              🌎 Pago en dólares
            </span>
            <div className="space-y-2.5">
              <button
                onClick={() => handleCheckout('lemonsqueezy')}
                disabled={isProcessing}
                className={`w-full p-3 ${button.providerBrand('lemonsqueezy')} rounded-[${radius.modal}] transition flex items-center justify-between cursor-pointer`}
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-5 h-5 text-[var(--color-accent-purple-text)]" />
                  <div className="text-left">
                    <p className="leading-tight">{t.checkout.payLemonSqueezyTitle}</p>
                    <p className="text-[10px] opacity-80 font-bold">{t.checkout.payLemonSqueezyDesc}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 bg-black/80 text-[var(--ui-on-dark-amber)] rounded-[${radius.control}] text-[10px] font-black`}>
                  {formatPrice('single_pdf', 'usd')}
                </span>
              </button>

              <button
                onClick={() => handleCheckout('paypal')}
                disabled={isProcessing}
                className={`w-full p-3 ${button.providerBrand('paypal')} rounded-[${radius.modal}] transition flex items-center justify-between cursor-pointer`}
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-5 h-5" />
                  <div className="text-left">
                    <p className="leading-tight">Pagar con PayPal</p>
                    <p className="text-[10px] opacity-80 font-bold">Saldo o tarjeta internacional</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 bg-black/80 text-[var(--ui-on-dark-amber)] rounded-[${radius.control}] text-[10px] font-black`}>
                  {formatPrice('single_pdf', 'usd')}
                </span>
              </button>
            </div>
          </div>

          <button
            onClick={() => { onClose(); if (onExportJson) onExportJson(); }}
            className={`w-full p-2.5 ${button.secondary} text-xs font-bold rounded-[${radius.card}] transition flex items-center justify-center gap-2 cursor-pointer mt-4`}
          >
            <Download className="w-4 h-4 text-[var(--ui-btn-neutral-text)]" />
            <span>{t.checkout.downloadJsonFreeBtn}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
