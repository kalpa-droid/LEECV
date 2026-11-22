import React from 'react';
import { DomSectionIcon } from '../pdf-engine/layers/icons/DomSectionIcon';
import { LidioHelpTrigger } from './LidioHelpTrigger';
import { elevationSystem } from '../uiDesignSystem';

export interface ActionTileButtonProps {
  /** Título breve de 1 a 4 palabras para mostrar dentro del mosaico. */
  label: string;
  /** Ícono ReactNode directo o iconId del catálogo único. */
  icon?: React.ReactNode;
  iconId?: string;
  /** Explicación de Lidio mostrada en el globo `?` (nunca inline debajo del botón). */
  helpText?: string;
  helpGroupKey?: string;
  /** Etiqueta breve opcional de formato o estado (ej. ".zip", "IA"). */
  badge?: string;
  /** Acción principal al tocar el mosaico (si no usa file picker). */
  onClick?: () => void;
  /** Si se define, el mosaico abre el selector de archivos nativo con `<label>`. */
  accept?: string;
  multiple?: boolean;
  onFileSelect?: (files: FileList | null) => void;
  /** ID opcional del input file para etiquetas externas o pruebas. */
  inputId?: string;
  variant?: 'default' | 'accent' | 'secondary' | 'subtle';
  active?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Mosaico de acción limpio (Cero Ruido):
 * - Solo ícono + título corto (1–3 palabras) + insignia opcional mínima.
 * - El signo `?` es un botón hermano en la esquina superior derecha para que
 *   tocar/pasar el mouse muestre a Lidio sin disparar el clic o selector de archivo.
 */
export const ActionTileButton: React.FC<ActionTileButtonProps> = ({
  label,
  icon,
  iconId,
  helpText,
  helpGroupKey,
  badge,
  onClick,
  accept,
  multiple = false,
  onFileSelect,
  inputId,
  variant = 'default',
  active = false,
  disabled = false,
  className = '',
}) => {
  const isFilePicker = Boolean(accept || onFileSelect);

  const variantClasses = active
    ? `border-[var(--color-accent-base)] bg-[var(--color-accent-muted)] text-[var(--color-neutral-text-primary)] ${elevationSystem.raised}`
    : variant === 'accent'
      ? 'border-[var(--color-accent-base)]/40 bg-[var(--color-accent-muted)] text-[var(--color-neutral-text-primary)] hover:border-[var(--color-accent-base)]'
      : variant === 'secondary'
        ? 'border-[var(--color-secondary-base)]/40 bg-[var(--color-secondary-muted)] text-[var(--color-neutral-text-primary)] hover:border-[var(--color-secondary-base)]'
        : variant === 'subtle'
          ? 'border-[var(--color-neutral-border)] bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-primary)] hover:border-[var(--color-neutral-border-strong)]'
          : 'border-[var(--color-neutral-border)] bg-[var(--ui-btn-outline-bg)] text-[var(--color-neutral-text-primary)] hover:border-[var(--color-accent-base)]';

  const iconColorClass = active || variant === 'accent'
    ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]'
    : variant === 'secondary'
      ? 'bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)]'
      : 'bg-[var(--color-neutral-surface-muted)] text-[var(--color-accent-text)]';

  const renderedIcon = icon || (iconId ? <DomSectionIcon iconId={iconId} size={18} strokeWidth={2} /> : null);

  const innerContent = (
    <>
      <div className="flex items-start justify-between gap-2 w-full">
        {renderedIcon && (
          <span
            className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 transition-colors ${iconColorClass}`}
          >
            {renderedIcon}
          </span>
        )}
        {/* Espacio reservado para el botón hermano `?` para evitar superposición */}
        {helpText && <span className="w-6 h-6 shrink-0" aria-hidden="true" />}
      </div>
      <div className="mt-2.5 flex items-end justify-between gap-1.5 w-full min-w-0">
        <span className="text-[12px] font-bold leading-snug text-left text-[var(--color-neutral-text-primary)] line-clamp-2">
          {label}
        </span>
        {badge && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-secondary)] border border-[var(--color-neutral-border)] shrink-0">
            {badge}
          </span>
        )}
      </div>
    </>
  );

  return (
    <div
      className={`relative rounded-[12px] border transition-all ${variantClasses} ${
        disabled ? 'opacity-50 pointer-events-none' : 'active:scale-[0.98]'
      } ${className}`}
    >
      {isFilePicker ? (
        <label
          htmlFor={inputId}
          className="flex flex-col justify-between w-full h-full min-h-[84px] p-3 cursor-pointer select-none"
        >
          {innerContent}
          <input
            id={inputId}
            type="file"
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            onChange={(e) => {
              onFileSelect?.(e.target.files);
              e.target.value = '';
            }}
            className="hidden"
          />
        </label>
      ) : (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="flex flex-col justify-between w-full h-full min-h-[84px] p-3 text-left cursor-pointer select-none"
        >
          {innerContent}
        </button>
      )}

      {helpText && (
        <div className="absolute top-2.5 right-2.5 z-10">
          <LidioHelpTrigger
            size="xs"
            title={label}
            text={helpText}
            groupKey={helpGroupKey || `tile-${label}`}
          />
        </div>
      )}
    </div>
  );
};
