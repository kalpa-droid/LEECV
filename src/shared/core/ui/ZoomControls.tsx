import React from 'react';
import { ZoomIn, ZoomOut, Smartphone } from 'lucide-react';
import { UI_THEME_META } from '../uiDesignSystem';

interface ZoomControlsProps {
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  triggerAutoFit: () => void;
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
  className = '',
  isMobile = false,
  currentUiTheme,
  onCycleTheme
}: ZoomControlsProps) {
  const themeMeta = currentUiTheme ? (UI_THEME_META[currentUiTheme] || UI_THEME_META.default) : null;
  const ThemeIcon = themeMeta?.icon;

  return (
    <div className={`flex items-center gap-1 bg-[var(--ui-bg-dock)] px-2 py-1 rounded-xl border border-[var(--ui-dock-border)] shadow-inner select-none ${className}`}>
      <button
        type="button"
        onClick={() => setZoomLevel(prev => Math.max(0.3, parseFloat((prev - 0.1).toFixed(2))))}
        className="p-1 rounded-lg hover:bg-[var(--color-accent-base)] text-[var(--ui-dock-text)] hover:text-white transition cursor-pointer active:scale-95"
        title="Alejar (-10%)"
      >
        <ZoomOut className={isMobile ? "w-3 h-3" : "w-3.5 h-3.5"} />
      </button>

      <span className="px-2 text-[var(--color-accent-amber-bright)] text-xs font-black min-w-10 text-center">
        {Math.round(zoomLevel * 100)}%
      </span>

      <button
        type="button"
        onClick={() => setZoomLevel(prev => Math.min(2.0, parseFloat((prev + 0.1).toFixed(2))))}
        className="p-1 rounded-lg hover:bg-[var(--color-accent-base)] text-[var(--ui-dock-text)] hover:text-white transition cursor-pointer active:scale-95"
        title="Acercar (+10%)"
      >
        <ZoomIn className={isMobile ? "w-3 h-3" : "w-3.5 h-3.5"} />
      </button>

      <button
        type="button"
        onClick={triggerAutoFit}
        className="px-2 py-0.5 rounded-lg bg-[var(--color-secondary-base)] hover:bg-[var(--color-secondary-hover)] text-white text-[10px] font-black transition flex items-center gap-1 shadow-sm cursor-pointer ml-1 active:scale-95"
        title="Auto-encajar el diseño al tamaño de pantalla"
      >
        <Smartphone className="w-3 h-3" />
        <span>Encajar</span>
      </button>

      {themeMeta && ThemeIcon && onCycleTheme && (
        <>
          <div className="w-px self-stretch bg-[var(--ui-dock-border)] mx-0.5" />
          <button
            type="button"
            onClick={onCycleTheme}
            className="p-1 rounded-lg hover:bg-[var(--color-accent-base)] text-[var(--ui-dock-text)] hover:text-white transition cursor-pointer active:scale-95 flex items-center gap-1"
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
