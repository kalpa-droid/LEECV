import React from 'react';
import { Check } from 'lucide-react';
import { MarketingCTA } from './MarketingCTA';
import { radius } from '../../uiDesignSystem';

export interface ProductDetailBlockProps {
  reverse?: boolean;
  image: string;
  title: string;
  description: string;
  bullets: string[];
  ctaLabel: string;
  onClick: () => void;
}

export const ProductDetailBlock: React.FC<ProductDetailBlockProps> = ({
  reverse = false,
  image,
  title,
  description,
  bullets,
  ctaLabel,
  onClick,
}) => {
  return (
    <div
      className={`flex flex-col lg:flex-row items-center gap-10 lg:gap-16 py-10 ${
        reverse ? 'lg:flex-row-reverse' : ''
      }`}
    >
      {/* Image Preview Container */}
      <div className="w-full lg:w-1/2">
        <div className={`relative rounded-[${radius.modal}] p-2 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] shadow-[var(--shadow-floating)] overflow-hidden group`}>
          <div className={`relative aspect-[16/10] w-full rounded-[${radius.card}] overflow-hidden bg-[var(--ui-bg-panel)]`}>
            <img
              src={image}
              alt={title}
              loading="lazy"
              className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </div>
        </div>
      </div>

      {/* Content Side */}
      <div className="w-full lg:w-1/2 text-left space-y-5">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--ui-text-primary)] tracking-tight">
          {title}
        </h3>

        <p className="text-base text-[var(--ui-text-secondary)] leading-relaxed">
          {description}
        </p>

        <ul className="space-y-3 pt-2">
          {bullets.map((bullet, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <div className="p-1 rounded-full bg-[var(--color-status-success-muted)] text-[var(--color-status-success-text)] shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-medium text-[var(--ui-text-primary)] leading-snug">
                {bullet}
              </span>
            </li>
          ))}
        </ul>

        <div className="pt-4">
          <MarketingCTA label={ctaLabel} onClick={onClick} size="md" />
        </div>
      </div>
    </div>
  );
};
