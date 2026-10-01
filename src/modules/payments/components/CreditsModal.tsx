import React from 'react';
import { X, Crown, Sparkles, AlertCircle } from 'lucide-react';
import { button, elevationSystem, radius } from '../../../shared/core/uiDesignSystem';
import { useEntitlements } from '../../../shared/core/entitlements/useEntitlements';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPricing: () => void;
}

export function CreditsModal({ isOpen, onClose, onOpenPricing }: CreditsModalProps) {
  const { plan, pdfTokens, isPro } = useEntitlements();

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn no-print`}>
      <div 
        className={`bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] w-full max-w-md rounded-[${radius.modal}] p-6 flex flex-col gap-6 ${elevationSystem.floating} animate-slideUp`}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full bg-[var(--color-accent-purple-muted)] text-[var(--color-accent-purple-text)]`}>
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[var(--ui-text-primary)]">Mi Cuenta & Créditos</h2>
              <p className="text-xs text-[var(--ui-text-secondary)]">Estado de tu plan actual</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-1.5 text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] hover:bg-[var(--ui-bg-card)] rounded-[${radius.control}] transition`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className={`bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-[${radius.card}] p-4 space-y-2`}>
            <p className="text-xs font-bold text-[var(--ui-text-secondary)] uppercase tracking-wider">Plan Actual</p>
            <div className="flex items-center justify-between">
              <span className={`px-2 py-1 text-xs font-black rounded ${isPro ? 'bg-[var(--color-status-warning-base)] text-black' : 'bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-secondary)]'}`}>
                {isPro ? 'PRO (Ilimitado)' : 'FREE / INVITADO'}
              </span>
            </div>
            {isPro && (
              <p className="text-[11px] text-[var(--color-status-success-text)] font-medium mt-1">
                ¡Tienes acceso ilimitado a todas las funciones y descargas PDF!
              </p>
            )}
          </div>

          {!isPro && (
            <div className={`bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-[${radius.card}] p-4 space-y-2`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[var(--ui-text-secondary)] uppercase tracking-wider">Créditos PDF (Packs)</p>
                <span className="text-xl font-black text-[var(--color-accent-text)]">{pdfTokens}</span>
              </div>
              <p className="text-[11px] text-[var(--ui-text-secondary)]">
                Los créditos se usan para exportar a PDF (1 crédito = 1 exportación).
              </p>
            </div>
          )}

          <div className={`bg-[var(--color-accent-blue-muted)] border border-[var(--color-accent-blue)]/20 rounded-[${radius.card}] p-4 flex items-start gap-3`}>
            <Sparkles className="w-5 h-5 text-[var(--color-accent-blue-text)] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[var(--color-accent-blue-text)]">Mejoras de IA</p>
              <p className="text-[11px] text-[var(--color-accent-blue-text)]/80 mt-1">
                La Inteligencia Artificial ahora es gratis e ilimitada para todos los usuarios.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {!isPro && (
            <button
              onClick={() => {
                onClose();
                onOpenPricing();
              }}
              className={`${button.primary} w-full flex-1 justify-center`}
            >
              Comprar Plan Pro o Packs
            </button>
          )}
          <button
            onClick={onClose}
            className={`${isPro ? button.primary : button.secondary} w-full flex-1 justify-center`}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
