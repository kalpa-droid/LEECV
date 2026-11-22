import React from 'react';
import { Lightbulb } from 'lucide-react';
import { LidioHelpTrigger } from './LidioHelpTrigger';

export interface ContextualGuideBoxProps {
  /** Encabezado breve orientado al contenido que está redactando la persona. */
  title?: string;
  /** Ayuda siempre visible para orientar qué escribir en el campo o sección. */
  children: React.ReactNode;
  /** Explicación opcional en globo `?` sobre cómo afecta el contenido al documento final. */
  moreHelpText?: string;
  className?: string;
}

/**
 * Caja de "Ayuda contextual" SIEMPRE VISIBLE:
 * Orientada exclusivamente a guiar qué escribir o cargar (redacción/datos),
 * diferenciándose de `LidioHelpTrigger` (`?`), que explica botones o estados.
 */
export const ContextualGuideBox: React.FC<ContextualGuideBoxProps> = ({
  title = 'Cómo completarlo bien',
  children,
  moreHelpText,
  className = '',
}) => {
  return (
    <div
      data-contextual-guide="true"
      className={`rounded-[12px] border border-[var(--color-accent-base)]/25 bg-[var(--color-accent-muted)] p-3 text-[12px] leading-relaxed text-[var(--color-neutral-text-primary)] ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <Lightbulb className="w-4 h-4 mt-0.5 text-[var(--color-accent-text)] shrink-0" />
          <div className="min-w-0">
            {title && (
              <p className="text-[11px] font-bold text-[var(--color-accent-text)] mb-0.5">
                {title}
              </p>
            )}
            <div className="text-[11px] text-[var(--color-neutral-text-secondary)] leading-relaxed">
              {children}
            </div>
          </div>
        </div>
        {moreHelpText && (
          <LidioHelpTrigger
            size="xs"
            title={title}
            text={moreHelpText}
            groupKey={`guide-${title}`}
          />
        )}
      </div>
    </div>
  );
};
