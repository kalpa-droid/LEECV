import React from 'react';
import { emitLidioMessage } from '../assistant/lidioBus';
import { elevationSystem } from '../uiDesignSystem';

export interface SectionSwitchProps {
  checked: boolean;
  onChange: (nextChecked: boolean) => void;
  /** Nombre visible o accesible de la sección (ej. "Experiencia", "Portada"). */
  label: string;
  /** Mensaje extra opcional para Lidio cuando cambia el estado. */
  helpText?: string;
  announceOnChange?: boolean;
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

/**
 * Perilla física accesible (`role="switch"`) para activar o pausar una sección
 * o ajuste binario sin carteleria ruidosa tipo "ACTIVADA / DESACTIVADA".
 * Al cambiar de estado avisa por Lidio que ningún dato se pierde.
 */
export const SectionSwitch: React.FC<SectionSwitchProps> = ({
  checked,
  onChange,
  label,
  announceOnChange = true,
  size = 'md',
  disabled = false,
  className = '',
}) => {
  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    const next = !checked;
    onChange(next);

    if (announceOnChange) {
      emitLidioMessage({
        kind: 'state',
        groupKey: `switch-${label}`,
        title: label,
        body: next
          ? `"${label}" activada. Ya se incluye en tu documento.`
          : `"${label}" pausada. Tus datos siguen guardados: no se pierde nada y podés volver a activar la perilla cuando quieras.`,
      });
    }
  };

  const trackDims = size === 'sm' ? 'w-10 h-5.5 p-0.5' : 'w-12 h-6.5 p-0.5';
  const knobDims = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const translateClass = size === 'sm'
    ? checked ? 'translate-x-[18px]' : 'translate-x-0'
    : checked ? 'translate-x-[22px]' : 'translate-x-0';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`${label}: ${checked ? 'activa' : 'pausada'}`}
      title={checked ? `${label} activa (tocar para pausar)` : `${label} pausada (tocar para activar)`}
      disabled={disabled}
      onClick={handleToggle}
      data-section-switch={checked ? 'on' : 'off'}
      className={`relative inline-flex items-center rounded-full border transition-colors cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-base)]/40 disabled:opacity-50 disabled:cursor-not-allowed ${trackDims} ${
        checked
          ? 'bg-[var(--color-status-success-base)] border-[var(--color-status-success-base)]'
          : 'bg-[var(--color-neutral-surface-muted)] border-[var(--color-neutral-border-strong)]'
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block rounded-full bg-[var(--ui-bg-card)] ${elevationSystem.raised} transition-transform duration-200 ${knobDims} ${translateClass}`}
      />
    </button>
  );
};
