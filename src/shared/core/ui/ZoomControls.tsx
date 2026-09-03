import React from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { UI_THEME_META } from '../uiDesignSystem';

import { elevationSystem, radius } from '../uiDesignSystem';

interface ZoomControlsProps {
  zoomLevel: number;
  setZoomLevel: (action: number | ((prev: number) => number)) => void;
  triggerAutoFit: () => void;
  isAutoFitMode?: boolean;
  className?: string;
  isMobile?: boolean;
  /** Tema activo actual (ej. 'day', 'dark', 'teal_ocean', 'ink'). Si se pasa
   *  junto con onCycleTheme, se muestra el selector de tema dentro de esta
   *  misma barra — no hace falta un botón aparte en otro lugar de la UI. */
  currentUiTheme?: string;
  onCycleTheme?: () => void;
}

export function ZoomControls({
  zoomLevel,
  setZoomLevel,
  triggerAutoFit,
  isAutoFitMode = false,
  className = '',
  isMobile = false,
  currentUiTheme,
  onCycleTheme
}: ZoomControlsProps) {
  const themeMeta = currentUiTheme ? (UI_THEME_META[currentUiTheme] || UI_THEME_META.default) : null;
  const ThemeIcon = themeMeta?.icon;

  return (
    <div className={`flex items-center gap-1 bg-[var(--ui-bg-dock)] px-2 py-1 rounded-[${radius.card}] border border-[var(--ui-dock-border)] ${elevationSystem.raised} select-none ${className}`}>
      <button
        type="button"
        onClick={() => setZoomLevel((prev: number) => Math.max(0.3, parseFloat((prev - 0.1).toFixed(2))))}
        className={`p-1 rounded-[${radius.control}] hover:bg-[var(--color-accent-base)] text-[var(--ui-dock-text)] hover:text-white transition cursor-pointer active:scale-95`}
        title="Alejar (-10%)"
      >
        <ZoomOut className={isMobile ? "w-3 h-3" : "w-3.5 h-3.5"} />
      </button>

      <span className="px-1 text-[var(--color-accent-amber-bright)] text-xs font-black min-w-9 text-center">
        {Math.round(zoomLevel * 100)}%
      </span>

      <button
        type="button"
        onClick={() => setZoomLevel((prev: number) => Math.min(2.0, parseFloat((prev + 0.1).toFixed(2))))}
        className={`p-1 rounded-[${radius.control}] hover:bg-[var(--color-accent-base)] text-[var(--ui-dock-text)] hover:text-white transition cursor-pointer active:scale-95`}
        title="Acercar (+10%)"
      >
        <ZoomIn className={isMobile ? "w-3 h-3" : "w-3.5 h-3.5"} />
      </button>

      <button
        type="button"
        onClick={triggerAutoFit}
        className={`p-1 rounded-[${radius.control}] transition flex items-center justify-center ${elevationSystem.raised} cursor-pointer ml-0.5 active:scale-95 ${
          isAutoFitMode
            ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ring-2 ring-[var(--color-accent-amber-bright)]/80'
            : 'hover:bg-[var(--color-accent-base)] text-[var(--ui-dock-text)] hover:text-[var(--color-accent-on-base)]'
        }`}
        title="Auto-encajar hoja a pantalla (Modo Automático)"
      >
        <Maximize2 className={isMobile ? "w-3 h-3" : "w-3.5 h-3.5"} />
      </button>

      {themeMeta && ThemeIcon && onCycleTheme && (
        <>
          <div className="w-px self-stretch bg-[var(--ui-dock-border)] mx-0.5" />
          <button
            type="button"
            onClick={onCycleTheme}
            className={`p-1 rounded-[${radius.control}] hover:bg-[var(--color-accent-base)] text-[var(--ui-dock-text)] hover:text-white transition cursor-pointer active:scale-95 flex items-center gap-1`}
            title={`Tema actual: ${themeMeta.label}. Clic para cambiar.`}
          >
            <ThemeIcon className={isMobile ? "w-3 h-3" : "w-3.5 h-3.5"} />
            {!isMobile && <span className="text-[10px] font-black">{themeMeta.shortLabel}</span>}
          </button>
        </>
      )}
    </div>
  );
}
