import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { getUiHint } from './uiTextGlossary';

export interface InfoHintProps {
  hintId: string;
  variant?: 'hover' | 'tap' | 'inline';
  className?: string;
}

/**
 * Componente unificado para tooltip o nota explicativa sutil en escritorio y celular.
 */
export function InfoHint({ hintId, variant = 'hover', className = '' }: InfoHintProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hint = getUiHint(hintId);
  if (!hint.text) return null;

  if (variant === 'tap') {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`inline-flex flex-col text-left cursor-pointer transition ${className}`}
      >
        <div className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-neutral-text-secondary)] hover:text-[var(--color-neutral-text-primary)] font-medium">
          <Info className="w-3.5 h-3.5 text-[var(--color-neutral-text-secondary)] shrink-0" />
          <span>{hint.title || hint.text}</span>
        </div>
        {isExpanded && hint.title && (
          <span className="mt-1 text-[10px] text-[var(--color-neutral-text-secondary)] leading-relaxed bg-[var(--ui-bg-card)] p-1.5 rounded border border-[var(--color-neutral-border)]">
            {hint.text}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 text-[11px] text-[var(--color-neutral-text-secondary)] font-medium ${className}`} title={hint.text}>
      <Info className="w-3.5 h-3.5 text-[var(--color-neutral-text-secondary)] shrink-0" />
      <span>{hint.title || hint.text}</span>
    </div>
  );
}
