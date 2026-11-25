import React, { useState } from 'react';
import { ShieldAlert, X, Download } from 'lucide-react';
import { radius } from '../uiDesignSystem';

export interface LocalBackupShieldBannerProps {
  visible: boolean;
  title?: string;
  description?: string;
  actionLabel?: string;
  onBackupNow: () => void;
  dismissKey?: string;
}

/**
 * Aviso suave y no invasivo para recordar guardar una copia en dispositivo o Google Drive
 * en documentos extensos o bóvedas cifradas locales.
 */
export const LocalBackupShieldBanner: React.FC<LocalBackupShieldBannerProps> = ({
  visible,
  title = 'Protegé tu trabajo con una copia externa',
  description = 'Todo se guarda en este navegador, pero si cambiás de equipo o limpiás datos podés perder borradores recientes.',
  actionLabel = 'Guardar copia ahora',
  onBackupNow,
  dismissKey = 'leecv_shield_banner_dismissed',
}) => {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(dismissKey) === '1';
    } catch {
      return false;
    }
  });

  if (!visible || dismissed) return null;

  return (
    <div
      className="p-3 bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)]/40 text-[var(--color-status-warning-text)] flex items-start justify-between gap-2 text-xs"
      style={{ borderRadius: radius.card }}
    >
      <div className="flex items-start gap-2 min-w-0">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="space-y-1.5 min-w-0">
          <p className="font-black leading-snug">{title}</p>
          <p className="text-[11px] opacity-90 leading-snug">{description}</p>
          <button
            type="button"
            onClick={onBackupNow}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--ui-bg-card)] border border-[var(--color-status-warning-base)]/40 text-[var(--color-status-warning-text)] font-bold text-[11px] hover:opacity-90 cursor-pointer"
            style={{ borderRadius: radius.control }}
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>{actionLabel}</span>
          </button>
        </div>
      </div>
      <button
        type="button"
        aria-label="Cerrar recordatorio de respaldo"
        onClick={() => {
          setDismissed(true);
          try {
            if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(dismissKey, '1');
          } catch {
            // Ignorar
          }
        }}
        className="p-1 hover:opacity-75 cursor-pointer shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
