import React from 'react';
import { Info } from 'lucide-react';
import { getUiHint } from './uiTextGlossary';

export interface InfoHintProps {
  hintId: string;
  className?: string;
}

/**
 * Componente unificado para tooltip o nota explicativa sutil.
 */
export function InfoHint({ hintId, className = '' }: InfoHintProps) {
  const hint = getUiHint(hintId);
  if (!hint.text) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 text-[11px] text-[var(--color-neutral-text-secondary)] font-medium ${className}`} title={hint.text}>
      <Info className="w-3.5 h-3.5 text-[var(--color-neutral-text-secondary)] shrink-0" />
      <span>{hint.title || hint.text}</span>
    </div>
  );
}
