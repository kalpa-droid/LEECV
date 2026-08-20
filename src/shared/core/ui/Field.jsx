import React from 'react';

/**
 * Shared Field Component for inputs, textareas, and selects
 * Standardizes border, focus rings, labels, and helper text across forms.
 */
export function Field({
  label,
  error,
  helperText,
  as: Component = 'input',
  className = '',
  containerClassName = '',
  id,
  ...props
}) {
  const baseInputStyle = 'w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition shadow-sm';

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <label htmlFor={id} className="block text-[11px] font-bold text-[#2B1B2E]">
          {label}
        </label>
      )}

      <Component
        id={id}
        className={`${baseInputStyle} ${error ? 'border-red-500 focus:ring-red-200' : ''} ${className}`}
        {...props}
      />

      {error && <p className="text-[10px] text-red-600 font-bold">{error}</p>}
      {helperText && !error && <p className="text-[10px] text-slate-500 font-medium">{helperText}</p>}
    </div>
  );
}
