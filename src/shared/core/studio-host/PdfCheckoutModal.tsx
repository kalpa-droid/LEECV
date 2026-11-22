import React, { useState } from 'react';
import { selectPaidPlan } from '../payments/paymentService';
import { CreditCard, Download, Check, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { dal } from '../storage/dataAccessLayer';
import { useAuth } from '../auth/AuthContext';

import { isValidEmail } from '../utils/validationEngine';
import { useExportEntitlement } from '../entitlements/useExportEntitlement';
import { withErrorHandling } from '../utils/errorHandler';

import { radius, button } from '../uiDesignSystem';
import { formatPrice } from '../payments/pricingCatalog';
import { useText } from '../../i18n/useText';

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

  const { canExport } = useExportEntitlement();

  const handleCheckout = async (gateway: 'mercadopago' | 'paypal') => {
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
        const data = await dal.pdfExportTokens.createUnpaidToken({ email, doc_type: 'cv', user_id: user?.id || undefined });
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

  // El consumo del crédito es responsabilidad del llamador (proceedWithExport,
  // handleExportPdf, etc.). Acá solo confirmamos: consumir en ambos lados
  // cobraba dos veces al usuario.
  const handleConfirmExport = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await onConfirm();
    } finally {
      setIsProcessing(false);
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
            className={`${button.base} ${button.ghost}`}
          >
            {t.checkout.backToEditor}
          </button>
          {canExport && (
            <button
              onClick={handleConfirmExport}
              disabled={isProcessing}
              className={`${button.base} ${button.success} flex items-center gap-2`}
            >
              <Check className="w-4 h-4" />
              <span>Confirmar Exportación</span>
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4 text-xs p-4 bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)]" style={{ borderRadius: radius.modal }}>
        {errorMsg && (
          <div className="p-3 bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-base)]/40 text-[var(--color-status-danger-text)] text-xs font-bold flex items-center gap-2" style={{ borderRadius: radius.card }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Email Section */}
        <div className="p-4 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] space-y-3" style={{ borderRadius: radius.modal }}>
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
            className="w-full text-xs p-2.5 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] placeholder-[var(--ui-text-muted)] font-bold outline-none focus:border-[var(--color-accent-base)] transition" style={{ borderRadius: radius.card }}
          />
        </div>

        {/* Botón de rescate / soporte WhatsApp — Etapa 3 */}
        <a
          href={`https://wa.me/5493878342772?text=${encodeURIComponent('Hola LEECV, tengo dudas con el pago de mi exportación PDF.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full block p-3 bg-[var(--color-brand-whatsapp)]/10 border border-[var(--color-brand-whatsapp)]/30 text-[var(--color-brand-whatsapp)] rounded-[10px] transition flex items-center gap-2 font-bold text-xs hover:bg-[var(--color-brand-whatsapp)]/20"
        >
          <span>📱</span>
          <span>¿Dudas con el pago? Escribile a soporte por WhatsApp (+5493878342772)</span>
        </a>

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
              className={`w-full p-3 ${button.providerBrand('mercadopago')} transition flex items-center justify-between cursor-pointer`} style={{ borderRadius: radius.modal }}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-5 h-5" />
                <div className="text-left">
                  <p className="leading-tight">{t.checkout.payMercadoPagoTitle}</p>
                  <p className="text-[10px] opacity-80 font-bold">{t.checkout.payMercadoPagoDesc}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-black/80 text-[var(--ui-on-dark-amber)] text-[10px] font-black" style={{ borderRadius: radius.control }}>
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
                onClick={() => handleCheckout('paypal')}
                disabled={isProcessing}
                className={`w-full p-3 ${button.providerBrand('paypal')} transition flex items-center justify-between cursor-pointer`} style={{ borderRadius: radius.modal }}
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-5 h-5" />
                  <div className="text-left">
                    <p className="leading-tight">Pagar con PayPal</p>
                    <p className="text-[10px] opacity-80 font-bold">Saldo o tarjeta internacional</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-black/80 text-[var(--ui-on-dark-amber)] text-[10px] font-black" style={{ borderRadius: radius.control }}>
                  {formatPrice('single_pdf', 'usd')}
                </span>
              </button>
            </div>
          </div>

          <button
            onClick={() => { onClose(); if (onExportJson) onExportJson(); }}
            className={`w-full p-2.5 ${button.base} ${button.secondary} text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer mt-4`} style={{ borderRadius: radius.card }}
          >
            <Download className="w-4 h-4 text-[var(--ui-btn-neutral-text)]" />
            <span>{t.checkout.downloadJsonFreeBtn}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
