import React from 'react';
import { RefreshCw, X } from 'lucide-react';
import { elevationSystem, radius } from '../uiDesignSystem';

interface UpdateToastProps {
  isVisible: boolean;
  onUpdate: () => void;
  onDismiss?: () => void;
}

export function UpdateToast({ isVisible, onUpdate, onDismiss }: UpdateToastProps) {
  if (!isVisible) return null;

  return (
    <aside
      aria-label="Actualización disponible"
      className={`fixed bottom-4 right-4 sm:right-6 z-50 max-w-sm bg-[var(--ui-bg-panel)] border-2 border-[var(--color-accent-purple-bright)]/40 text-[var(--ui-text-primary)] p-3.5 rounded-[${radius.modal}] ${elevationSystem.floating} backdrop-blur-xl animate-fadeIn`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-[${radius.card}] bg-[var(--color-accent-base)] flex items-center justify-center text-[var(--color-accent-on-base)] shrink-0 ${elevationSystem.raised}`}>
            <RefreshCw className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black tracking-tight text-[var(--ui-text-primary)]">
              Actualización disponible
            </h4>
            <p className="text-[10px] text-[var(--ui-text-secondary)] font-medium">
              Hay una versión nueva de LEECV lista.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onUpdate}
            className={`px-3 py-1.5 bg-[var(--color-accent-base)] hover:opacity-90 text-[var(--color-accent-on-base)] font-black text-xs rounded-full transition cursor-pointer flex items-center gap-1 ${elevationSystem.raised} active:scale-95`}
          >
            <RefreshCw className="w-3 h-3" />
            <span>Actualizar ahora</span>
          </button>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] rounded-full hover:bg-[var(--ui-bg-card)] transition cursor-pointer"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
