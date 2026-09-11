import React from 'react';
import { type LucideIcon } from 'lucide-react';

export interface PillTabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
}

export interface PillTabsProps {
  tabs: PillTabItem[];
  activeTabId: string;
  onChange: (id: string) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PillTabs: React.FC<PillTabsProps> = ({
  tabs,
  activeTabId,
  onChange,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  }[size];

  return (
    <div
      role="tablist"
      className={`inline-flex items-center p-1.5 rounded-[12px] bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] shadow-sm ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center justify-center font-semibold rounded-[9px] transition-all cursor-pointer select-none ${sizeClasses} ${
              isActive
                ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] border border-[var(--color-accent-base)]/30 shadow-md'
                : 'text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] hover:bg-[var(--ui-bg-card)]'
            }`}
          >
            {Icon && <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
