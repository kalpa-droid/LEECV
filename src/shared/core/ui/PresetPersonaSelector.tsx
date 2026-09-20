import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { radius, elevationSystem } from '../uiDesignSystem';

export interface PresetPersonaItem {
  id: string;
  name: string;
  description?: string;
  badge?: string;
  palette?: {
    primary: string;
    secondary?: string;
    accent?: string;
  };
  icon?: React.ReactNode;
}

export interface PresetPersonaSelectorProps {
  title?: string;
  subtitle?: string;
  presets: PresetPersonaItem[];
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export const PresetPersonaSelector: React.FC<PresetPersonaSelectorProps> = ({
  title,
  subtitle,
  presets,
  selectedPresetId,
  onSelectPreset,
  columns = 2,
  className = '',
}) => {
  const columnGridClass =
    columns === 1
      ? 'grid-cols-1'
      : columns === 3
      ? 'grid-cols-1 sm:grid-cols-3'
      : columns === 4
      ? 'grid-cols-2 sm:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-2';

  return (
    <div className={`space-y-3 ${className}`}>
      {(title || subtitle) && (
        <div className="space-y-0.5">
          {title && (
            <h3 className="text-xs font-extrabold text-[var(--color-neutral-text-primary)] flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent-text)] flex-shrink-0" />
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-[11px] text-[var(--color-neutral-text-secondary)]">
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div className={`grid ${columnGridClass} gap-2`}>
        {presets.map((preset) => {
          const isSelected = selectedPresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset.id)}
              className={`p-2.5 rounded-[${radius.card}] border text-left transition flex flex-col justify-between gap-2 cursor-pointer ${
                isSelected
                  ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-rose-muted)]/30 ring-2 ring-[var(--color-accent-base)]/30'
                  : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)]'
              }`}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <div className="flex items-center gap-1.5 min-w-0 pr-1">
                  {preset.icon && (
                    <span className="text-[var(--ui-text-primary)] flex-shrink-0">
                      {preset.icon}
                    </span>
                  )}
                  <span className="text-[11px] font-black text-[var(--color-neutral-text-primary)] truncate">
                    {preset.name}
                  </span>
                  {preset.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] font-extrabold flex-shrink-0 uppercase">
                      {preset.badge}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-[var(--ui-text-primary)] flex-shrink-0" />
                )}
              </div>

              {preset.description && (
                <p className="text-[10px] text-[var(--color-neutral-text-secondary)] leading-relaxed line-clamp-2">
                  {preset.description}
                </p>
              )}

              {preset.palette && (
                <div className="flex gap-1 items-center pt-0.5">
                  <div
                    className={`w-3.5 h-3.5 rounded-full border border-[var(--ui-border)] ${elevationSystem.raised}`}
                    style={{ backgroundColor: preset.palette.primary }}
                    title="Color Principal"
                  />
                  {preset.palette.accent && (
                    <div
                      className={`w-3.5 h-3.5 rounded-full border border-[var(--ui-border)] ${elevationSystem.raised}`}
                      style={{ backgroundColor: preset.palette.accent }}
                      title="Color Acento"
                    />
                  )}
                  {preset.palette.secondary && (
                    <div
                      className={`w-3.5 h-3.5 rounded-full border border-[var(--ui-border)] ${elevationSystem.raised}`}
                      style={{ backgroundColor: preset.palette.secondary }}
                      title="Color Secundario"
                    />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
