import React, { ElementType, ReactNode } from 'react';
import { colorSystem, typeScale, elevationSystem, radius } from '../uiDesignSystem';
import { validateFieldValue } from '../utils/validationEngine';

export interface FieldProps {
  label?: ReactNode;
  error?: string | null;
  helperText?: string | null;
  as?: ElementType;
  className?: string;
  containerClassName?: string;
  id?: string;
  name?: string;
  maxLength?: number;
  value?: any;
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
  name,
  maxLength,
  value,
  ...props
}: FieldProps) {
  const baseInputStyle = `w-full rounded-[${radius.control}] border px-3 py-2 text-[12px] ui-bg-card ui-text-primary ui-border outline-none transition-all placeholder:text-[var(--color-neutral-text-muted)] ${elevationSystem.raised} focus:border-[var(--color-accent-base)] focus:ring-2 focus:ring-[var(--color-accent-muted)]`;

  const effectiveMaxLength = maxLength ?? (Component === 'textarea' ? 2000 : 250);

  // Validación suave no bloqueante (aviso visual de formato)
  const validationKey = name || id || (typeof label === 'string' ? label : '');
  const softValidation = validationKey && typeof value === 'string' ? validateFieldValue(validationKey, value) : { isValid: true };

  const activeHelper = error || (!softValidation.isValid ? softValidation.helperMessage : helperText);
  const isDangerError = !!error;

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
        name={name}
        value={value}
        maxLength={effectiveMaxLength}
        className={`${baseInputStyle} ${!softValidation.isValid && !error ? 'border-[var(--color-status-warning-base)] focus:border-[var(--color-status-warning-base)] bg-[var(--color-status-warning-muted)]' : ''} ${className}`}
        {...props}
      />

      {activeHelper && (
        <p
          className={`${typeScale.micro} font-bold`}
          style={{
            color: isDangerError
              ? colorSystem.status.danger.text
              : !softValidation.isValid
              ? colorSystem.status.warning.text
              : colorSystem.neutral.textSecondary
          }}
        >
          {activeHelper}
        </p>
      )}
    </div>
  );
}
