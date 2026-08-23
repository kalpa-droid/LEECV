import React, { ElementType, ReactNode } from 'react';
import { colorSystem, typeScale } from '../uiDesignSystem';

export interface FieldProps {
  label?: ReactNode;
  error?: string | null;
  helperText?: string | null;
  as?: ElementType;
  className?: string;
  containerClassName?: string;
  id?: string;
  maxLength?: number;
  [key: string]: any;
}

export function Field({
  label,
  error,
  helperText,
  as: Component = 'input',
  className = '',
  containerClassName = '',
  id,
  maxLength,
  ...props
}: FieldProps) {
  const baseInputStyle = `w-full rounded-[10px] border px-3 py-2 text-[12px] ui-bg-card ui-text-primary ui-border outline-none transition-all placeholder:text-[${colorSystem.neutral.textMuted}] shadow-sm focus:border-[${colorSystem.accent.base}] focus:ring-2 focus:ring-[${colorSystem.accent.muted}]`;

  const effectiveMaxLength = maxLength ?? (Component === 'textarea' ? 2000 : 250);

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={id}
          className={`${typeScale.fieldLabel} block ui-text-primary`}
        >
          {label}
        </label>
      )}

      <Component
        id={id}
        maxLength={effectiveMaxLength}
        className={`${baseInputStyle} ${className}`}
        {...props}
      />

      {error && (
        <p className={`${typeScale.micro} font-bold`} style={{ color: colorSystem.status.danger.text }}>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className={`${typeScale.helper}`} style={{ color: colorSystem.neutral.textSecondary }}>
          {helperText}
        </p>
      )}
    </div>
  );
}
