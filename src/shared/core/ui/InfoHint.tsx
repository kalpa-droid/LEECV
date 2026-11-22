import React from 'react';
import { Info } from 'lucide-react';
import { getUiHint } from './uiTextGlossary';
import { LidioHelpTrigger } from './LidioHelpTrigger';

export interface InfoHintProps {
  hintId: string;
  variant?: 'hover' | 'tap' | 'inline';
  className?: string;
}

/**
 * Componente unificado para explicación bajo demanda vía globo `?` de Lidio
 * (o nota inline breve cuando se solicita `variant="inline"`).
 */
export function InfoHint({ hintId, variant = 'tap', className = '' }: InfoHintProps) {
  const hint = getUiHint(hintId);
  if (!hint.text) return null;

  if (variant === 'inline') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 text-[11px] text-[var(--color-neutral-text-secondary)] font-medium ${className}`}
        title={hint.text}
      >
        <Info className="w-3.5 h-3.5 text-[var(--color-neutral-text-secondary)] shrink-0" />
        <span>{hint.title || hint.text}</span>
      </div>
    );
  }

  return (
    <LidioHelpTrigger
      size="xs"
      title={hint.title}
      text={hint.text}
      groupKey={`hint-${hintId}`}
      className={className}
    />
  );
}
