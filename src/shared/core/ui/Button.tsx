import React, { ButtonHTMLAttributes, ReactNode, ElementType } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'dark' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
  icon?: ElementType;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  title,
  icon: Icon,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95';

  const variantStyles: Record<string, string> = {
    primary: 'bg-[#00A8A0] text-white hover:bg-[#00877F] border border-[#00877F]',
    secondary: 'bg-[#FF2E63] text-white hover:bg-[#E31555] border border-[#E31555]',
    accent: 'bg-[#FFC93C] text-[#2B1B2E] hover:bg-[#F0AE00] border border-[#F0AE00]',
    dark: 'bg-[#2B1B2E] text-white hover:bg-[#1C121E]',
    danger: 'bg-red-600 text-white hover:bg-red-700 border border-red-700',
    outline: 'border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] hover:bg-[#FFFDF7]',
    ghost: 'bg-transparent text-[#2B1B2E] hover:bg-slate-100 shadow-none'
  };

  const sizeStyles: Record<string, string> = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3.5 py-1.5 text-xs',
    lg: 'px-5 py-2.5 text-sm'
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`${baseStyles} ${variantStyles[variant] || variantStyles.primary} ${sizeStyles[size] || sizeStyles.md} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
      {children}
    </button>
  );
}
