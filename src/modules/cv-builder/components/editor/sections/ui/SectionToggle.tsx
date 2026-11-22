import React from 'react';
import { Plus } from 'lucide-react';
import { button, elevationSystem } from '../../../../../../shared/core/uiDesignSystem';
import { SectionSwitch } from '../../../../../../shared/core/ui/SectionSwitch';

export const SectionToggle = ({
  sectionKey,
  sectionTitle,
  cvData,
  setCvData,
  onAddAction,
  addLabel,
}: any) => {
  const isVisible = cvData?.sectionVisibility?.[sectionKey] !== false;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-[12px] border mb-3 transition ${
        isVisible
          ? `bg-[var(--ui-bg-card)] border-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] ${elevationSystem.raised}`
          : 'bg-[var(--color-neutral-surface-muted)] border-[var(--color-neutral-border)] text-[var(--color-neutral-text-muted)] opacity-75'
      }`}
    >
      <span className="text-xs font-black uppercase tracking-wide">{sectionTitle}</span>

      <div className="flex items-center gap-2">
        <SectionSwitch
          checked={isVisible}
          label={sectionTitle || sectionKey}
          size="sm"
          onChange={(next) => {
            setCvData((prev: any) => ({
              ...prev,
              sectionVisibility: {
                ...prev.sectionVisibility,
                [sectionKey]: next,
              },
            }));
          }}
        />

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
