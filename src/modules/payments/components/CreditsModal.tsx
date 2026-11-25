import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Crown, Sparkles, LogIn, ShieldCheck } from 'lucide-react';
import { button, elevationSystem, radius, zIndex } from '../../../shared/core/uiDesignSystem';
import { useAuth } from '../../../shared/core/auth/AuthContext';
import { useEntitlements } from '../../../shared/core/entitlements/useEntitlements';
import { redeemCreditsForPass } from '../../../shared/core/payments/paymentService';
import { useToast } from '../../../shared/core/ui/Toast';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPricing: () => void;
  onOpenLogin?: () => void;
}

const PASS_TITLE_BY_ID: Record<string, string> = {
  pass_editorlee: 'Pase Permanente EditorLee',
  pass_facturlee: 'Pase Permanente FacturLee',
  pass_editorial_team_30d: 'Sala de Equipo EditorLee (30 días)',
};

export function CreditsModal({ isOpen, onClose, onOpenPricing, onOpenLogin }: CreditsModalProps) {
  const { plan, pdfTokens, tokenStats, isPro, appPasses, refreshEntitlements } = useEntitlements();
  const { user, logout } = useAuth();
  const { showSuccess, showError } = useToast();
  const [redeeming, setRedeeming] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRedeem = async (passId: 'pass_30d' | 'pass_editorlee' | 'pass_facturlee') => {
    setRedeeming(passId);
    try {
      await redeemCreditsForPass(passId);
      await refreshEntitlements();
      showSuccess('¡Pase activado usando tus créditos!');
    } catch (err: any) {
      showError(err?.message || 'No se pudo completar el canje.');
    } finally {
      setRedeeming(null);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 animate-fadeIn no-print"
      style={{ zIndex: zIndex.modal }}
    >
      <div
        className={`bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] w-full max-w-md my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 flex flex-col gap-5 ${elevationSystem.floating} animate-slideUp`}
        style={{ borderRadius: radius.modal }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-[var(--color-accent-purple-muted)] text-[var(--color-accent-purple-text)]">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[var(--ui-text-primary)]">Mi Cuenta & Billetera</h2>
              <p className="text-xs text-[var(--ui-text-secondary)]">Créditos y pases activos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] hover:bg-[var(--ui-bg-card)] transition cursor-pointer"
            style={{ borderRadius: radius.control }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div
            className="bg-[var(--ui-bg-card)] border border-[var(--ui-border)] p-4 space-y-2"
            style={{ borderRadius: radius.card }}
          >
            <p className="text-xs font-bold text-[var(--ui-text-secondary)] uppercase tracking-wider">Estado General</p>
            <div className="flex items-center justify-between gap-2">
              <span
                className={`px-2 py-1 text-xs font-black rounded ${
                  isPro
                    ? 'bg-[var(--color-status-warning-base)] text-black'
                    : 'bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)]'
                }`}
              >
                {isPro ? (plan === 'pass_30d' ? '✨ Pase Total 30 Días' : '✨ Plan Ilimitado') : 'FREE / POR USO'}
              </span>
            </div>
            {isPro && (
              <p className="text-[11px] text-[var(--color-status-success-text)] font-medium mt-1">
                Tenés descargas habilitadas en todas las aplicaciones sin descontar créditos.
              </p>
            )}
          </div>

          {appPasses.length > 0 && (
            <div
              className="bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/30 p-4 space-y-2"
              style={{ borderRadius: radius.card }}
            >
              <div className="flex items-center gap-1.5 text-xs font-black text-[var(--color-status-success-text)]">
                <ShieldCheck className="w-4 h-4" />
                <span>Pases activos por aplicación</span>
              </div>
              <div className="space-y-1.5">
                {appPasses.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-[11px] text-[var(--ui-text-primary)]">
                    <span className="font-bold">{PASS_TITLE_BY_ID[p.pass_id] || p.pass_id}</span>
                    <span className="text-[10px] font-bold text-[var(--color-status-success-text)]">
                      {p.is_permanent ? 'Permanente' : p.expires_at ? `Hasta ${new Date(p.expires_at).toLocaleDateString('es-AR')}` : 'Activo'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isPro && (
            <div
              className="bg-[var(--ui-bg-card)] border border-[var(--ui-border)] p-4 space-y-3"
              style={{ borderRadius: radius.card }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[var(--ui-text-secondary)] uppercase tracking-wider">Billetera de Créditos</p>
                <span className="text-xl font-black text-[var(--color-accent-text)]">{pdfTokens} disponibles</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-[var(--ui-bg-panel)] rounded p-2 text-center border border-[var(--ui-border)]">
                  <p className="text-[10px] text-[var(--ui-text-secondary)] uppercase">Usados</p>
                  <p className="text-sm font-bold text-[var(--ui-text-primary)]">{tokenStats?.used || 0}</p>
                </div>
                <div className="bg-[var(--ui-bg-panel)] rounded p-2 text-center border border-[var(--ui-border)]">
                  <p className="text-[10px] text-[var(--ui-text-secondary)] uppercase">Totales</p>
                  <p className="text-sm font-bold text-[var(--ui-text-primary)]">{tokenStats?.total || 0}</p>
                </div>
              </div>

              <p className="text-[11px] text-[var(--ui-text-secondary)]">
                1 crédito = 1 descarga completa (PDF + Word/Excel + Google Drive por 15 min). También podés canjearlos por pases:
              </p>

              {user && pdfTokens >= 5 && (
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    disabled={redeeming !== null}
                    onClick={() => void handleRedeem('pass_30d')}
                    className="w-full py-2 px-3 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] text-[11px] font-bold hover:opacity-90 cursor-pointer"
                    style={{ borderRadius: radius.control }}
                  >
                    {redeeming === 'pass_30d' ? 'Activando...' : 'Canjear 5 créditos → Pase Total 30 Días'}
                  </button>
                  {pdfTokens >= 10 && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={redeeming !== null}
                        onClick={() => void handleRedeem('pass_editorlee')}
                        className="py-2 px-2 bg-[var(--ui-bg-panel)] border border-[var(--color-accent-base)]/40 text-[var(--ui-text-primary)] text-[10px] font-bold hover:border-[var(--color-accent-base)] cursor-pointer"
                        style={{ borderRadius: radius.control }}
                      >
                        10 cr → EditorLee Permanente
                      </button>
                      <button
                        type="button"
                        disabled={redeeming !== null}
                        onClick={() => void handleRedeem('pass_facturlee')}
                        className="py-2 px-2 bg-[var(--ui-bg-panel)] border border-[var(--color-accent-base)]/40 text-[var(--ui-text-primary)] text-[10px] font-bold hover:border-[var(--color-accent-base)] cursor-pointer"
                        style={{ borderRadius: radius.control }}
                      >
                        10 cr → FacturLee Permanente
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {user?.email && (
            <div
              className="bg-[var(--ui-bg-card)] border border-[var(--ui-border)] p-3 flex items-center gap-2"
              style={{ borderRadius: radius.card }}
            >
              <div className="w-2 h-2 rounded-full bg-[var(--color-status-success-base)] shrink-0" />
              <p className="text-xs font-medium text-[var(--ui-text-primary)] truncate">{user.email}</p>
            </div>
          )}

          <div
            className="bg-[var(--color-accent-muted)] border border-[var(--color-accent-base)]/20 p-4 flex items-start gap-3"
            style={{ borderRadius: radius.card }}
          >
            <Sparkles className="w-5 h-5 text-[var(--color-accent-text)] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[var(--color-accent-text)]">Asistencia IA y herramientas incluidas</p>
              <p className="text-[11px] text-[var(--ui-text-secondary)] mt-1">
                La Carta de Presentación y la Tarjeta Personal con QR están incluidas gratis, junto a 3 comprobantes iniciales gratis en FacturLee.
              </p>
            </div>
          </div>

          {user ? (
            <div
              className="p-3 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] flex items-center justify-between gap-2"
              style={{ borderRadius: radius.card }}
            >
              <span className="text-xs text-[var(--ui-text-secondary)]">Sesión activa</span>
              <button
                type="button"
                onClick={async () => { onClose(); await logout(); }}
                className={`${button.base} ${button.danger} px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5`}
              >
                <X className="w-3.5 h-3.5" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          ) : (
            onOpenLogin && (
              <div
                className="p-3 bg-[var(--color-accent-muted)] border border-[var(--color-accent-base)]/30 flex items-center justify-between gap-2"
                style={{ borderRadius: radius.card }}
              >
                <span className="text-xs text-[var(--ui-text-primary)]">¿Ya tenés cuenta o compraste créditos?</span>
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenLogin(); }}
                  className="px-3 py-1.5 rounded-full bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] text-xs font-bold hover:opacity-90 flex items-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Iniciar sesión</span>
                </button>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          {!isPro && (
            <button
              onClick={() => {
                onClose();
                onOpenPricing();
              }}
              className={`${button.base} ${button.primary} w-full flex-1 justify-center`}
            >
              Comprar créditos o pases
            </button>
          )}
          <button
            onClick={onClose}
            className={`${button.base} ${isPro ? button.primary : button.secondary} w-full flex-1 justify-center`}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
