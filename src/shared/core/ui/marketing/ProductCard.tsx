import React from 'react';
import { type LucideIcon, ArrowRight } from 'lucide-react';
import { displayScale, marketingCard } from '../../uiDesignSystem';

export interface ProductCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel: string;
  onClick: () => void;
}

export function ProductCard({
  icon: Icon,
  title,
  description,
  ctaLabel,
  onClick,
}: ProductCardProps) {
  return (
    <div
      onClick={onClick}
      className={`group ${marketingCard.base} ${marketingCard.idle}`}
    >
      <div>
        <div className={marketingCard.iconWrap}>
          <Icon className="w-8 h-8" />
        </div>

        <h3 className={`${displayScale.cardTitle} mt-6 text-[var(--ui-text-primary)] group-hover:text-[var(--color-accent-text)] transition-colors`}>
          {title}
        </h3>

        <p className="mt-3 text-sm leading-relaxed text-[var(--ui-text-secondary)]">
          {description}
        </p>
      </div>

      <div className="mt-8 flex items-center gap-2 text-sm font-bold text-[var(--color-accent-text)] group-hover:translate-x-1 transition-transform">
        <span>{ctaLabel}</span>
        <ArrowRight className="w-4 h-4" />
      </div>
    </div>
  );
}
