import React from 'react';
import { Palette } from 'lucide-react';
import { UI_THEME_META, radius, elevationSystem } from '../uiDesignSystem';

interface ThemeToggleButtonProps {
  currentThemeId: string;
  onToggle: () => void;
  size?: 'sm' | 'md';
}

export function ThemeToggleButton({
  currentThemeId,
  onToggle,
  size = 'md',
}: ThemeToggleButtonProps) {
  const themeMeta = UI_THEME_META[currentThemeId] || UI_THEME_META.default;
  const paddingClass = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs sm:text-sm';

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-1.5 ${paddingClass} rounded-[${radius.card}] font-black text-[var(--ui-text-primary)] bg-[var(--ui-bg-panel)] hover:bg-[var(--ui-bg-card)] border border-[var(--ui-border)] transition ${elevationSystem.raised} cursor-pointer whitespace-nowrap active:scale-95 shrink-0`}
      title={`Tema actual: ${themeMeta.label}. Clic para alternar tema.`}
    >
      <Palette className="w-3.5 h-3.5 text-[var(--color-secondary-bright)] flex-shrink-0" />
      <span className="hidden sm:inline">{themeMeta.shortLabel}</span>
      <span className="text-xs leading-none">{themeMeta.emoji}</span>
    </button>
  );
}
