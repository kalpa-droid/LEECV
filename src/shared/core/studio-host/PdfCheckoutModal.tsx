import React, { useEffect, useState } from 'react';
import { CreditCard, Download, Check, AlertCircle, Sparkles, Crown } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { dal } from '../storage/dataAccessLayer';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../ui/Toast';
import { isValidEmail } from '../utils/validationEngine';
import { useExportEntitlement } from '../entitlements/useExportEntitlement';
import { useEntitlements } from '../entitlements/useEntitlements';
import { withErrorHandling } from '../utils/errorHandler';
import { radius, button } from '../uiDesignSystem';
import {
  APP_PERMANENT_PASS_BY_DOC_TYPE,
  PASS_CREDIT_COSTS,
  PlanId,
  formatPrice,
} from '../payments/pricingCatalog';
import { redeemCreditsForPass, selectPaidPlan, trackFunnelEvent } from '../payments/paymentService';
import { useText } from '../../i18n/useText';

const PASS_DESCRIPTIONS: Record<string, { badge: string; title: string; subtitle: string }> = {
  pass_editorlee: {
    badge: 'Más conveniente en EditorLee',
    title: 'Pase Permanente EditorLee',
    subtitle: 'Uso individual ilimitado sin vencimiento (o 10 créditos).',
  },
  pass_facturlee: {
    badge: 'Ideal para tu negocio',
    title: 'Pase Permanente FacturLee',
    subtitle: 'Comprobantes ilimitados en tu equipo para siempre (o 10 créditos).',
  },
};

interface PdfCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  onExportJson?: () => void;
  docType?: string;
  purpose?: 'export' | 'publish';
}

export default function PdfCheckoutModal({
  isOpen,
  onClose,
  onConfirm,
  onExportJson,
  docType = 'cv',
}: PdfCheckoutModalProps) {
  const [email, setEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('single_pdf');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const t = useText();
  const { user } = useAuth();
  const { showSuccess } = useToast();

  const { canExport } = useExportEntitlement(docType);
  const { pdfTokens, isPro, refreshEntitlements } = useEntitlements();

  const permanentPassId = APP_PERMANENT_PASS_BY_DOC_TYPE[docType];
  const permanentPassMeta = permanentPassId ? PASS_DESCRIPTIONS[permanentPassId] : undefined;

  useEffect(() => {
    if (!isOpen) return;
    trackFunnelEvent('checkout_opened', docType);
    const fallbackEmail =
      user?.email ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('leecv_last_checkout_email') || '' : '');
    if (fallbackEmail && !email) {
      setEmail(fallbackEmail);
    } else if (user?.email && email !== user.email) {
      setEmail(user.email);
    }
  }, [isOpen, user?.email, docType]);

  const checkoutOptions: Array<{ id: PlanId; title: string; desc: string; tag?: string }> = [
    {
      id: 'single_pdf',
      title: '1 Descarga PDF',
      desc: 'Pago único para exportar este archivo ahora.',
    },
    ...(permanentPassId && permanentPassMeta
      ? [
          {
            id: permanentPassId,
            title: permanentPassMeta.title,
            desc: permanentPassMeta.subtitle,
            tag: permanentPassMeta.badge,
          },
        ]
      : []),
    {
      id: 'pass_30d',
      title: 'Pase Total 30 Días (5 apps)',
      desc: 'Todas las herramientas ilimitadas por 30 días sin débito automático.',
      tag: 'Equivale a 5 créditos',
    },
    {
      id: 'credits_pack_10',
      title: 'Pack 10 Créditos (No vencen)',
      desc: 'Guardalos en tu billetera o canjealos por un Pase Permanente.',
    },
  ];

  const handleCheckout = async (gateway: 'mercadopago' | 'paypal') => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      setErrorMsg('Ingresá un correo electrónico válido para recibir tu comprobante');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');
    trackFunnelEvent('checkout_started', docType);

    let exportToken = '';
    const resToken = await withErrorHandling(
      async () => {
        const data = await dal.pdfExportTokens.createUnpaidToken({
          email: normalizedEmail,
          doc_type: docType || 'cv',
          user_id: user?.id || undefined,
        });
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

    localStorage.setItem('leecv_export_token', exportToken);

    await selectPaidPlan(selectedPlan, gateway, normalizedEmail, exportToken, user?.id, {
      onError: (msg) => {
        setErrorMsg(msg);
        setIsProcessing(false);
      },
    });
  };

  const handleRedeemCredits = async (targetPass: 'pass_30d' | 'pass_editorlee' | 'pass_facturlee') => {
    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMsg('');
    try {
      await redeemCreditsForPass(targetPass);
      await refreshEntitlements();
      trackFunnelEvent('pass_redeemed', docType);
      showSuccess('¡Pase activado desde tus créditos! Iniciando tu exportación.');
      await onConfirm();
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo canjear el pase.');
    } finally {
      setIsProcessing(false);
    }
  };

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

        {/* Canje inmediato si el usuario ya tiene créditos en su billetera */}
        {user && !isPro && pdfTokens >= PASS_CREDIT_COSTS.pass_30d && (
          <div
            className="p-3.5 bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/35 space-y-2.5"
            style={{ borderRadius: radius.card }}
          >
            <div className="flex items-center gap-2 text-[var(--color-status-success-text)] font-black">
              <Crown className="w-4 h-4 shrink-0" />
              <span>Tenés {pdfTokens} créditos disponibles en tu cuenta</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {permanentPassId &&
                (permanentPassId === 'pass_editorlee' || permanentPassId === 'pass_facturlee') &&
                pdfTokens >= PASS_CREDIT_COSTS[permanentPassId] && (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => void handleRedeemCredits(permanentPassId)}
                    className="px-3 py-1.5 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] font-bold text-[11px] hover:opacity-90 cursor-pointer"
                    style={{ borderRadius: radius.control }}
                  >
                    Canjear 10 cr → {PASS_DESCRIPTIONS[permanentPassId].title}
                  </button>
                )}
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => void handleRedeemCredits('pass_30d')}
                className="px-3 py-1.5 bg-[var(--ui-bg-card)] border border-[var(--color-status-success-base)]/40 text-[var(--color-status-success-text)] font-bold text-[11px] hover:opacity-90 cursor-pointer"
                style={{ borderRadius: radius.control }}
              >
                Canjear 5 cr → Pase Total 30 Días
              </button>
            </div>
          </div>
        )}

        {/* Selector de opción */}
        <div className="space-y-2">
          <span className="text-xs font-black text-[var(--ui-text-primary)] uppercase tracking-wide block">
            1. Elegí cómo querés desbloquear tu descarga
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {checkoutOptions.map((opt) => {
              const active = selectedPlan === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedPlan(opt.id)}
                  className={`p-3 text-left border transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                    active
                      ? 'bg-[var(--color-accent-muted)] border-[var(--color-accent-base)] text-[var(--ui-text-primary)]'
                      : 'bg-[var(--ui-bg-card)] border-[var(--ui-border)] text-[var(--ui-text-secondary)] hover:border-[var(--color-accent-base)]/50'
                  }`}
                  style={{ borderRadius: radius.card }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-extrabold text-[var(--ui-text-primary)] leading-snug">{opt.title}</span>
                    {opt.tag && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-black bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] rounded shrink-0">
                        <Sparkles className="w-2.5 h-2.5" />
                        {opt.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] leading-snug">{opt.desc}</p>
                  <div className="text-[11px] font-black text-[var(--color-accent-text)]">
                    {formatPrice(opt.id, 'usd')} · {formatPrice(opt.id, 'ars')}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Email Section */}
        <div className="p-4 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] space-y-2.5" style={{ borderRadius: radius.modal }}>
          <span className="text-xs font-black text-[var(--ui-text-primary)] uppercase tracking-wide block">
            {t.checkout.step1Title}
          </span>
          <p className="text-[11px] text-[var(--ui-text-secondary)]">
            Ingresá tu correo para recibir tu comprobante. Si después entrás con ese mismo email, todo se acredita solo.
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.checkout.emailPlaceholder}
            className="w-full text-xs p-2.5 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] placeholder-[var(--ui-text-muted)] font-bold outline-none focus:border-[var(--color-accent-base)] transition"
            style={{ borderRadius: radius.card }}
          />
        </div>

        {/* Payment Gateways */}
        <div className="space-y-2.5">
          <span className="text-xs font-black text-[var(--color-status-warning-text)] uppercase tracking-wide block">
            {t.checkout.step2Title}
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={() => void handleCheckout('mercadopago')}
              disabled={isProcessing}
              className={`w-full p-3 ${button.providerBrand('mercadopago')} transition flex items-center justify-between cursor-pointer`}
              style={{ borderRadius: radius.modal }}
            >
              <div className="flex items-center gap-2 text-left">
                <CreditCard className="w-4 h-4 shrink-0" />
                <div>
                  <p className="leading-tight font-bold">Mercado Pago</p>
                  <p className="text-[10px] opacity-80">Pesos argentinos (ARS)</p>
                </div>
              </div>
              <span className="px-2 py-1 bg-black/80 text-[var(--ui-on-dark-amber)] text-[10px] font-black shrink-0" style={{ borderRadius: radius.control }}>
                {formatPrice(selectedPlan, 'ars')}
              </span>
            </button>

            <button
              onClick={() => void handleCheckout('paypal')}
              disabled={isProcessing}
              className={`w-full p-3 ${button.providerBrand('paypal')} transition flex items-center justify-between cursor-pointer`}
              style={{ borderRadius: radius.modal }}
            >
              <div className="flex items-center gap-2 text-left">
                <CreditCard className="w-4 h-4 shrink-0" />
                <div>
                  <p className="leading-tight font-bold">PayPal</p>
                  <p className="text-[10px] opacity-80">Dólares / Tarjeta (USD)</p>
                </div>
              </div>
              <span className="px-2 py-1 bg-black/80 text-[var(--ui-on-dark-amber)] text-[10px] font-black shrink-0" style={{ borderRadius: radius.control }}>
                {formatPrice(selectedPlan, 'usd')}
              </span>
            </button>
          </div>

          {onExportJson && (
            <button
              onClick={() => { onClose(); onExportJson(); }}
              className={`w-full p-2.5 ${button.base} ${button.secondary} text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer`}
              style={{ borderRadius: radius.card }}
            >
              <Download className="w-4 h-4 text-[var(--ui-btn-neutral-text)]" />
              <span>{t.checkout.downloadJsonFreeBtn}</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
