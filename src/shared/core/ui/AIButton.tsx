import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { button, elevationSystem, radius } from '../uiDesignSystem';
import { useToast } from './Toast';

export interface AIButtonProps {
  label: string;
  onGenerate: () => Promise<string>;
  onSuccess: (text: string) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'sparkles';
  className?: string;
}

export const AIButton: React.FC<AIButtonProps> = ({
  label,
  onGenerate,
  onSuccess,
  disabled = false,
  variant = 'sparkles',
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { showError, showSuccess } = useToast();

  const handleAction = async () => {
    if (isLoading || disabled) return;
    setIsLoading(true);
    try {
      const resultText = await onGenerate();
      if (resultText) {
        onSuccess(resultText);
        showSuccess('Sugerencia generada con IA exitosamente.');
      }
    } catch (err: any) {
      console.error('AI completion error:', err);
      showError(err?.message || 'Inconveniente al generar la sugerencia con IA.');
    } finally {
      setIsLoading(false);
    }
  };

  const variantStyles = variant === 'primary' 
    ? button.primary 
    : variant === 'secondary' 
    ? button.secondary 
    : 'bg-[var(--color-accent-muted)] border border-[var(--color-accent-base)]/40 text-[var(--color-accent-text)] hover:bg-[var(--color-accent-base)] hover:text-[var(--color-accent-on-base)] font-bold';

  return (
    <button
      type="button"
      onClick={handleAction}
      disabled={isLoading || disabled}
      className={`px-3 py-1.5 rounded-[${radius.card}] text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles} ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : (
        <Sparkles className="w-3.5 h-3.5 text-current shrink-0" />
      )}
      <span>{isLoading ? 'Generando...' : label}</span>
    </button>
  );
};
