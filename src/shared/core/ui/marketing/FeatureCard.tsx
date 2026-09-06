import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { displayScale, elevationSystem } from '../../uiDesignSystem';

export interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className={`p-6 rounded-[16px] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] ${elevationSystem.raised} text-left flex flex-col justify-start`}>
      <div className="p-3 rounded-[12px] w-fit bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className={`${displayScale.cardTitle} text-[var(--ui-text-primary)] mb-2`}>
        {title}
      </h4>
      <p className="text-sm text-[var(--ui-text-secondary)] leading-relaxed">
        {description}
      </p>
    </div>
  );
}
