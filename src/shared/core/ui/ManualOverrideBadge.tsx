import React from 'react';
import { RotateCcw } from 'lucide-react';
import { LidioHelpTrigger } from './LidioHelpTrigger';

export interface ManualOverrideBadgeProps {
  /** Marca si este ajuste fue modificado manualmente sobre el estándar global. */
  isOverridden: boolean;
  /** Valor esperado por la configuración global activa (para avisar si difiere). */
  globalLabel?: string;
  /** Callback opcional para volver este campo puntual al valor global/preset. */
  onReset?: () => void;
  /** Si está en true, destaca en ámbar no intrusivo que difiere de una regla global estricta. */
  hasConflict?: boolean;
  conflictHelpText?: string;
  className?: string;
}

/**
 * Indicador Cero Ruido para Nivel 3 (Ajuste Fino / Manual).
 * Permite saber al instante si un campo obedece al estándar global o fue tocado a mano,
 * y revertirlo sin afectar al resto del documento.
 */
export const ManualOverrideBadge: React.FC<ManualOverrideBadgeProps> = ({
  isOverridden,
  globalLabel,
  onReset,
  hasConflict = false,
  conflictHelpText,
  className = '',
}) => {
  if (!isOverridden) return null;

  const badgeColors = hasConflict
    ? 'bg-[var(--color-status-warning-muted)] border-[var(--color-status-warning-base)]/40 text-[var(--color-status-warning-text)]'
    : 'bg-[var(--color-secondary-muted)] border-[var(--color-secondary-base)]/35 text-[var(--color-secondary-text)]';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold leading-none ${badgeColors} ${className}`}
    >
      <span>{hasConflict ? 'Manual ≠ norma' : 'Ajuste fino'}</span>
      {conflictHelpText && (
        <LidioHelpTrigger
          size="xs"
          title={globalLabel ? `Diferencia con ${globalLabel}` : 'Ajuste manual'}
          text={conflictHelpText}
          groupKey={`override-${globalLabel || 'manual'}`}
        />
      )}
      {onReset && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReset();
          }}
          title={globalLabel ? `Volver al valor de ${globalLabel}` : 'Volver al valor automático'}
          aria-label="Volver al valor automático"
          className="inline-flex items-center justify-center p-0.5 rounded-full hover:opacity-75 cursor-pointer"
        >
          <RotateCcw className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
};
