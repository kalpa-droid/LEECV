import React, { useState, useRef, useEffect } from 'react';
import { User, LogIn, LogOut, HardDrive, Crown, FileText, Sparkles } from 'lucide-react';
import { useText } from '../../i18n/useText';
import { radius, elevationSystem } from '../uiDesignSystem';
import { getPlanLabel, PLAN_FEATURES } from '../entitlements/useEntitlements';

export interface AccountMenuButtonProps {
  isLoggedIn?: boolean;
  currentProfile?: any;
  onLogin?: () => void;
  onLogout?: () => void;
  onOpenPricing?: () => void;
  onOpenSavedDocs?: () => void;
  className?: string;
  buttonText?: string;
}

export const AccountMenuButton: React.FC<AccountMenuButtonProps> = ({
  isLoggedIn = false,
  currentProfile,
  onLogin,
  onLogout,
  onOpenPricing,
  onOpenSavedDocs,
  className = '',
  buttonText,
}) => {
  const t = useText();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const plan = currentProfile?.plan || 'free';

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-accent-amber)] bg-gradient-to-tr from-[var(--color-accent-orange)] to-[var(--color-accent-amber)] text-black border-2 border-[var(--ui-border)] transition ${elevationSystem.raised} cursor-pointer active:scale-95 text-xs font-black`}
        title={t.navbar?.accountMenuTitle || 'Menú de Cuenta'}
      >
        <User className="w-4 h-4 stroke-[2.5]" />
        {buttonText && <span>{buttonText}</span>}
        {isLoggedIn ? (
          <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
        ) : (
          <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
        )}
      </button>

      {isOpen && (
        <div className={`absolute right-0 mt-2 w-56 rounded-[${radius.modal}] bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] ${elevationSystem.floating} p-1.5 z-50 space-y-1 animate-fadeIn`}>
          {/* Insignia del Plan Activo */}
          <div className={`px-3 py-1.5 rounded-[${radius.card}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] flex items-center justify-between`}>
            <span className="text-[10px] text-[var(--ui-text-secondary)] font-bold">
              {t.navbar?.activePlan || 'Plan Activo'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)]">
              {plan === 'enterprise' ? `Enterprise (${PLAN_FEATURES.enterprise.cloudStorageGB}GB)` : getPlanLabel(plan)}
            </span>
          </div>

          {currentProfile?.email && (
            <div className="px-3 py-1 text-[11px] text-[var(--ui-text-secondary)] truncate">
              {currentProfile.email}
            </div>
          )}

          <div className="w-full h-px bg-[var(--ui-border)] my-0.5" />

          {/* Opción 1: Iniciar / Cerrar Sesión */}
          {isLoggedIn ? (
            onLogout && (
              <button
                type="button"
                onClick={() => { setIsOpen(false); onLogout(); }}
                className="w-full text-left px-3 py-1.5 rounded-[10px] text-xs font-bold text-[var(--color-status-danger-text)] hover:bg-[var(--color-status-danger-muted)] flex items-center gap-2 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-[var(--color-status-danger-text)]" />
                <span>Cerrar Sesión</span>
              </button>
            )
          ) : (
            onLogin && (
              <button
                type="button"
                onClick={() => { setIsOpen(false); onLogin(); }}
                className="w-full text-left px-3 py-1.5 rounded-[10px] text-xs font-bold text-[var(--color-accent-purple-text)] hover:bg-[var(--color-accent-purple-light)] flex items-center gap-2 transition cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-[var(--color-accent-purple-text)]" />
                <span>Iniciar Sesión</span>
              </button>
            )
          )}

          {/* Opción 2: Documentos Guardados */}
          {onOpenSavedDocs && (
            <button
              type="button"
              onClick={() => { setIsOpen(false); onOpenSavedDocs(); }}
              className="w-full text-left px-3 py-1.5 rounded-[10px] text-xs font-bold hover:bg-[var(--ui-btn-neutral-hover)] flex items-center gap-2 transition cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[var(--ui-secondary)]" />
              <span>Mis Documentos</span>
            </button>
          )}

          {/* Opción 3: Ver Planes / Precios */}
          {onOpenPricing && (
            <button
              type="button"
              onClick={() => { setIsOpen(false); onOpenPricing(); }}
              className="w-full text-left px-3 py-1.5 rounded-[10px] text-xs font-bold hover:bg-[var(--ui-btn-neutral-hover)] flex items-center gap-2 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[var(--color-accent-amber-bright)]" />
              <span>Ver Planes & Precios</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
