import React, { useState } from 'react';
import { PillTabs, PillTabItem } from '../PillTabs';
import { displayScale, elevationSystem, radius } from '../../uiDesignSystem';
import { FileText, CreditCard, BookOpen, ArrowRight } from 'lucide-react';

export interface ProductPreviewItem {
  id: string;
  label: string;
  image: string;
  route: string;
}

export interface HeroProductPreviewProps {
  products: ProductPreviewItem[];
  onSelectRoute: (route: string) => void;
}

export const HeroProductPreview: React.FC<HeroProductPreviewProps> = ({
  products,
  onSelectRoute,
}) => {
  const [activeId, setActiveId] = useState<string>(products[0]?.id || 'cv');

  const activeProduct = products.find((p) => p.id === activeId) || products[0];

  const tabs: PillTabItem[] = products.map((p) => ({
    id: p.id,
    label: p.label,
    icon: p.id === 'cv' ? FileText : p.id === 'tarjetas' || p.id === 'tarjeta' ? CreditCard : BookOpen,
  }));

  return (
    <div className="flex flex-col items-center gap-6 mt-8">
      {/* Tabs Selector */}
      <PillTabs
        tabs={tabs}
        activeTabId={activeId}
        onChange={setActiveId}
        size="md"
      />

      {/* Preview Card Showcase */}
      <div className={`relative w-full max-w-4xl rounded-[${radius.modal}] p-2 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] shadow-[var(--shadow-overlay)] overflow-hidden group`}>
        <div className={`relative aspect-[16/9] w-full rounded-[${radius.card}] overflow-hidden bg-[var(--ui-bg-panel)] flex items-center justify-center`}>
          <img
            src={activeProduct.image}
            alt={activeProduct.label}
            loading="eager"
            // @ts-ignore
            fetchpriority="high"
            className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.01]"
          />

          {/* Action Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--ui-bg-panel)]/90 via-transparent to-transparent flex items-end justify-between p-6 opacity-95 group-hover:opacity-100 transition-opacity">
            <div className="text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent-text)] bg-[var(--color-accent-muted)] border border-[var(--color-accent-base)]/30 px-2.5 py-1 rounded-md">
                Motor Vectorial A4
              </span>
              <h4 className="text-xl font-bold text-[var(--ui-text-primary)] mt-1">
                {activeProduct.label}
              </h4>
            </div>

            <button
              type="button"
              onClick={() => onSelectRoute(activeProduct.route)}
              className={`px-5 py-2.5 rounded-[${radius.card}] bg-[var(--color-accent-base)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-on-base)] font-bold text-sm shadow-[var(--shadow-floating)] flex items-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95`}
            >
              <span>Crear el mío</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
