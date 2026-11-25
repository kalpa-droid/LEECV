import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { button, elevationSystem } from '../uiDesignSystem';
import { useToast } from './Toast';
import { DomSectionIcon } from '../pdf-engine/layers/icons/DomSectionIcon';
import { UI_ICON_IDS } from './iconCatalog';
import { LidioHelpTrigger } from './LidioHelpTrigger';

const ANTI_DOUBLE_CLICK_COOLDOWN_MS = 3000;

export interface AIButtonProps {
  /** Etiqueta accesible / título del botón (en modo `iconOnly` no recarga visualmente). */
  label?: string;
  onGenerate: () => Promise<string>;
  onSuccess: (text: string) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'sparkles';
  /** Por defecto `true`: muestra únicamente el símbolo de IA con animación sutil. */
  iconOnly?: boolean;
  /** Ayuda opcional de Lidio en globo `?` adyacente al botón. */
  helpText?: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const AIButton: React.FC<AIButtonProps> = ({
  label = 'Sugerir con IA',
  onGenerate,
  onSuccess,
  disabled = false,
  variant = 'sparkles',
  iconOnly = true,
  helpText,
  size = 'sm',
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  const handleAction = async () => {
    if (isLoading || isCoolingDown || disabled) return;
    setIsLoading(true);
    try {
      const resultText = await onGenerate();
      if (resultText) {
        onSuccess(resultText);
        showSuccess('Sugerencia generada con IA exitosamente.');
        setIsCoolingDown(true);
        if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = setTimeout(() => {
          setIsCoolingDown(false);
        }, ANTI_DOUBLE_CLICK_COOLDOWN_MS);
      }
    } catch (err: any) {
      console.error('AI completion error:', err);
      showError(err?.message || 'Inconveniente al generar la sugerencia con IA.');
    } finally {
      setIsLoading(false);
    }
  };

  const variantStyles =
    variant === 'primary'
      ? button.primary
      : variant === 'secondary'
      ? button.secondary
      : `bg-[var(--color-accent-muted)] border border-[var(--color-accent-base)]/45 text-[var(--color-accent-text)] hover:bg-[var(--color-accent-base)] hover:text-[var(--color-accent-on-base)] font-bold ${elevationSystem.raised}`;

  const iconOnlyDimensions =
    size === 'xs'
      ? 'w-7 h-7 rounded-full p-0'
      : size === 'md'
      ? 'w-9 h-9 rounded-full p-0'
      : 'w-8 h-8 rounded-full p-0';

  const iconPixelSize = size === 'xs' ? 14 : size === 'md' ? 18 : 16;

  const btnEl = (
    <button
      type="button"
      onClick={handleAction}
      disabled={isLoading || isCoolingDown || disabled}
      aria-label={isLoading ? 'Generando sugerencia con IA' : label}
      title={isLoading ? 'Generando...' : isCoolingDown ? 'Espera un momento antes de pedir otra sugerencia' : label}
      data-ai-icon-only={iconOnly ? 'true' : 'false'}
      className={`inline-flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${
        iconOnly
          ? iconOnlyDimensions
          : 'px-3 py-1.5 rounded-[12px] text-xs'
      } ${variantStyles} ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        <span className="ui-ai-sparkle-loop shrink-0">
          <DomSectionIcon iconId={UI_ICON_IDS.ia} size={iconPixelSize} strokeWidth={2.1} />
        </span>
      )}
      {!iconOnly && <span>{isLoading ? 'Generando...' : label}</span>}
    </button>
  );

  if (!helpText) return btnEl;

  return (
    <span className="inline-flex items-center gap-1.5 shrink-0">
      {btnEl}
      <LidioHelpTrigger
        size="xs"
        title={label}
        text={helpText}
        groupKey={`ai-btn-${label}`}
      />
    </span>
  );
};
