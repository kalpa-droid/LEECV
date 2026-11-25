import React, { useState } from 'react';
import { Modal } from '../../../shared/core/ui/Modal';
import { useAuth } from '../../../shared/core/auth/AuthContext';
import { Check, Zap, Sparkles, ShieldCheck } from 'lucide-react';
import { radius, button } from '../../../shared/core/uiDesignSystem';
import { formatPrice } from '../../../shared/core/payments/pricingCatalog';
import { selectPaidPlan } from '../../../shared/core/payments/paymentService';
import { useToast } from '../../../shared/core/ui/Toast';
import { dal } from '../../../shared/core/storage/dataAccessLayer';
import { withErrorHandling } from '../../../shared/core/utils/errorHandler';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
}

type PricingCardPlan =
  | 'credits_pack_5'
  | 'pass_30d'
  | 'credits_pack_10'
  | 'pass_editorlee'
  | 'pass_facturlee';

const PRICING_OFFERS: Array<{
  id: PricingCardPlan;
  title: string;
  subtitle: string;
  bullets: string[];
  featured?: boolean;
  badge?: string;
}> = [
  {
    id: 'pass_30d',
    title: 'Pase Total 30 Días',
    subtitle: 'Todas las 5 apps ilimitadas. Sin débito automático.',
    bullets: ['CV, EditorLee, Libro, FacturLee y Agenda', 'Pagás 1 vez (equivale a 5 créditos)', 'Renovás solo si lo necesitás'],
    featured: true,
    badge: 'Todo incluido 30 días',
  },
  {
    id: 'credits_pack_10',
    title: 'Pack 10 Créditos',
    subtitle: 'No vencen y sirven para cualquier app o canje.',
    bullets: ['10 descargas PDF o Word / Excel', 'Canjeables por Pase Permanente', 'Menor costo por documento'],
  },
  {
    id: 'pass_editorlee',
    title: 'EditorLee Permanente',
    subtitle: 'Uso individual ilimitado para siempre en EditorLee.',
    bullets: ['Tesis, informes y libros ilimitados', 'Word, PDF y respaldo en tu Drive', 'Equivale a 10 créditos'],
  },
  {
    id: 'pass_facturlee',
    title: 'FacturLee Permanente',
    subtitle: 'Comprobantes y presupuestos ilimitados en tu PC.',
    bullets: ['Bóveda cifrada 100% tuya', 'PDF y exportación Excel sin límite', 'Equivale a 10 créditos'],
  },
];

export function PricingModal({ isOpen, onClose, onOpenLogin }: PricingModalProps) {
  const { user } = useAuth();
  const { showError } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async (planId: PricingCardPlan, gateway: 'mercadopago' | 'paypal') => {
    if (!user) {
      onClose();
      onOpenLogin();
      return;
    }

    setIsProcessing(true);

    let exportToken = '';
    const resToken = await withErrorHandling(
      async () => {
        const data = await dal.pdfExportTokens.createUnpaidToken({
          email: user.email!,
          doc_type: planId,
          user_id: user.id,
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
      },
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={'Créditos y Pases Sin Suscripción'}
      icon={<Zap className="w-5 h-5 text-[var(--color-status-warning-text)]" />}
      size="lg"
    >
      <div
        className="p-4 bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] space-y-4 text-xs"
        style={{ borderRadius: radius.modal }}
      >
        {!user && (
          <div
            className="p-3 bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)]/40 text-[var(--color-status-warning-text)] flex items-center justify-between gap-2"
            style={{ borderRadius: radius.card }}
          >
            <span>Iniciá sesión para guardar tus créditos o pases en tu cuenta.</span>
            <button
              onClick={() => {
                onClose();
                onOpenLogin();
              }}
              className={`${button.primary} py-1.5 px-3 text-[10px] whitespace-nowrap cursor-pointer`}
            >
              Iniciar Sesión
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {PRICING_OFFERS.map((offer) => (
            <div
              key={offer.id}
              className={`p-4 bg-[var(--ui-bg-card)] flex flex-col justify-between relative ${
                offer.featured
                  ? 'border-2 border-[var(--color-accent-base)]'
                  : 'border border-[var(--ui-border)]'
              }`}
              style={{ borderRadius: radius.card }}
            >
              {offer.badge && (
                <div className="absolute -top-2.5 right-3 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>{offer.badge}</span>
                </div>
              )}

              <div>
                <h3 className="font-black text-[var(--ui-text-primary)] text-sm mb-1">{offer.title}</h3>
                <p className="text-[11px] text-[var(--ui-text-secondary)] mb-3">{offer.subtitle}</p>
                <ul className="space-y-1.5 mb-4 text-[11px] text-[var(--ui-text-secondary)]">
                  {offer.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-[var(--color-status-success-text)] shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 pt-3 border-t border-[var(--ui-border)]">
                <button
                  onClick={() => void handleCheckout(offer.id, 'mercadopago')}
                  disabled={isProcessing}
                  className={`w-full p-2.5 ${button.providerBrand('mercadopago')} flex items-center justify-between cursor-pointer`}
                  style={{ borderRadius: radius.control }}
                >
                  <span className="font-bold text-[10px]">MercadoPago (ARS)</span>
                  <span className="font-black text-[11px]">{formatPrice(offer.id, 'ars')}</span>
                </button>
                <button
                  onClick={() => void handleCheckout(offer.id, 'paypal')}
                  disabled={isProcessing}
                  className={`w-full p-2.5 ${button.providerBrand('paypal')} flex items-center justify-between cursor-pointer`}
                  style={{ borderRadius: radius.control }}
                >
                  <span className="font-bold text-[10px]">PayPal (USD)</span>
                  <span className="font-black text-[11px]">{formatPrice(offer.id, 'usd')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div
          className="p-3 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] flex items-center justify-between gap-2"
          style={{ borderRadius: radius.card }}
        >
          <div className="flex items-center gap-2 text-[var(--ui-text-secondary)]">
            <ShieldCheck className="w-4 h-4 text-[var(--color-status-success-text)] shrink-0" />
            <span>¿Preferís 5 créditos para usar cuando quieras ({formatPrice('credits_pack_5', 'usd')} / {formatPrice('credits_pack_5', 'ars')})?</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => void handleCheckout('credits_pack_5', 'mercadopago')}
              disabled={isProcessing}
              className="px-2.5 py-1.5 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] font-bold text-[10px] hover:border-[var(--color-accent-base)] cursor-pointer"
              style={{ borderRadius: radius.control }}
            >
              MP {formatPrice('credits_pack_5', 'ars')}
            </button>
            <button
              onClick={() => void handleCheckout('credits_pack_5', 'paypal')}
              disabled={isProcessing}
              className="px-2.5 py-1.5 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] font-bold text-[10px] hover:border-[var(--color-accent-base)] cursor-pointer"
              style={{ borderRadius: radius.control }}
            >
              PayPal {formatPrice('credits_pack_5', 'usd')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
