import React, { ButtonHTMLAttributes, ReactNode, ElementType } from 'react';
import { elevationSystem, radius } from '../uiDesignSystem';

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
  const baseStyles = `font-black rounded-[${radius.control}] transition-all flex items-center justify-center gap-1.5 ${elevationSystem.raised} cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95`;

  const variantStyles: Record<string, string> = {
    primary: 'bg-[var(--color-accent-base)] text-white hover:bg-[var(--color-accent-hover)] border border-transparent',
    secondary: 'bg-[var(--color-accent-base)] text-white hover:bg-[var(--color-accent-brand-hover)] border border-[var(--color-accent-brand-hover)]',
    accent: 'bg-[var(--color-accent-amber)] text-[var(--color-neutral-text-primary)] hover:bg-[var(--color-accent-amber-hover)] border border-[var(--color-accent-amber-hover)]',
    dark: 'bg-[var(--ui-btn-neutral-bg)] text-[var(--ui-btn-neutral-text)] hover:bg-[var(--ui-btn-neutral-hover)] border border-[var(--ui-btn-neutral-border)]',
    danger: 'bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)] border border-[var(--color-status-danger-base)]/30 hover:bg-[var(--color-status-danger-base)] hover:text-white',
    outline: 'border-2 border-[var(--ui-btn-outline-border)] bg-[var(--ui-btn-outline-bg)] text-[var(--ui-btn-outline-text)] hover:bg-[var(--ui-btn-outline-hover)]',
    ghost: 'bg-transparent text-[var(--ui-btn-ghost-text)] hover:text-[var(--ui-btn-ghost-text-hover)] hover:bg-[var(--ui-btn-ghost-hover)]'
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
