import React from 'react';
import { Plus } from 'lucide-react';
import { button, elevationSystem, radius } from '../../../../../../shared/core/uiDesignSystem';

export const SectionToggle = ({ 
  sectionKey, 
  sectionTitle, 
  cvData, 
  setCvData, 
  onAddAction, 
  addLabel 
}: any) => {
  const isVisible = cvData?.sectionVisibility?.[sectionKey] !== false;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-[${radius.card}] border mb-3 transition ${
      isVisible 
        ? `bg-[var(--ui-bg-card)] border-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] ${elevationSystem.raised}` 
        : 'bg-[var(--color-neutral-surface-muted)] border-[var(--color-neutral-border)] text-[var(--color-neutral-text-muted)] opacity-75'
    }`}>
      <span className="text-xs font-black uppercase tracking-wide">
        {sectionTitle}
      </span>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setCvData((prev: any) => ({
              ...prev,
              sectionVisibility: {
                ...prev.sectionVisibility,
                [sectionKey]: !isVisible
              }
            }));
          }}
          className={`px-3 py-1 rounded-full text-xs font-black transition flex items-center gap-1.5 ${elevationSystem.raised} cursor-pointer ${
            isVisible
              ? 'bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] hover:bg-[var(--color-secondary-hover)]'
              : 'bg-[var(--color-neutral-text-muted)] text-[var(--color-neutral-surface)] hover:opacity-80'
          }`}
        >
          <span>{isVisible ? 'ACTIVADA' : 'DESACTIVADA'}</span>
        </button>

        {isVisible && onAddAction && addLabel && (
          <button
            type="button"
            onClick={onAddAction}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black transition cursor-pointer ${button.primary}`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{addLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};
