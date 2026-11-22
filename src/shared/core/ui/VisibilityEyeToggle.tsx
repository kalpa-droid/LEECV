import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { emitLidioMessage } from '../assistant/lidioBus';

export interface VisibilityEyeToggleProps {
  visible: boolean;
  onToggle: (nextVisible: boolean) => void;
  /** Nombre corto del campo o dato para el mensaje de Lidio y lectores de pantalla. */
  targetLabel?: string;
  /** Si está en true, Lidio avisa que los datos no se borran al ocultar/mostrar. */
  announceOnChange?: boolean;
  size?: 'xs' | 'sm';
  className?: string;
}

/**
 * Control limpio con ícono de ojo abierto/tachado para mostrar u ocultar un dato
 * o registro en la hoja final sin checkboxes ni textos ruidosos.
 */
export const VisibilityEyeToggle: React.FC<VisibilityEyeToggleProps> = ({
  visible,
  onToggle,
  targetLabel = 'Este dato',
  announceOnChange = true,
  size = 'sm',
  className = '',
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !visible;
    onToggle(next);

    if (announceOnChange) {
      emitLidioMessage({
        kind: 'state',
        groupKey: `visibility-${targetLabel}`,
        title: next ? 'Visible en la hoja' : 'Oculto de la hoja',
        body: next
          ? `${targetLabel} vuelve a mostrarse en tu documento final.`
          : `${targetLabel} quedó oculto de la hoja, pero tus datos no se pierden: podés tocar el ojo otra vez cuando quieras mostrarlo.`,
      });
    }
  };

  const dim = size === 'xs' ? 'w-7 h-7' : 'w-8 h-8';
  const iconDim = size === 'xs' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={visible}
      aria-label={
        visible
          ? `${targetLabel}: visible en el documento (tocar para ocultar)`
          : `${targetLabel}: oculto del documento (tocar para mostrar)`
      }
      title={visible ? 'Visible en la hoja' : 'Oculto en la hoja'}
      className={`inline-flex items-center justify-center rounded-full border transition-all cursor-pointer active:scale-95 shrink-0 ${dim} ${
        visible
          ? 'bg-[var(--color-secondary-muted)] border-[var(--color-secondary-base)]/40 text-[var(--color-secondary-text)] hover:border-[var(--color-secondary-base)]'
          : 'bg-[var(--color-neutral-surface-muted)] border-[var(--color-neutral-border)] text-[var(--color-neutral-text-muted)] hover:text-[var(--color-neutral-text-primary)]'
      } ${className}`}
    >
      {visible ? <Eye className={iconDim} /> : <EyeOff className={iconDim} />}
    </button>
  );
};
