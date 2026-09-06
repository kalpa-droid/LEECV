import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { button } from '../../uiDesignSystem';

export interface MarketingCTAProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: LucideIcon;
  size?: 'md' | 'lg';
}

export function MarketingCTA({
  label,
  onClick,
  variant = 'primary',
  icon: Icon,
  size = 'lg',
}: MarketingCTAProps) {
  const variantClass = button[variant];
  const sizeClass = size === 'lg' ? 'px-6 py-3.5 text-base' : 'px-4 py-2.5 text-sm';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 ${button.base} ${variantClass} ${sizeClass}`}
    >
      <span>{label}</span>
      {Icon && <Icon className="w-5 h-5" />}
    </button>
  );
}
