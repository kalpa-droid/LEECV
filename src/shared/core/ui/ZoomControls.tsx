import React from 'react';
import { ZoomIn, ZoomOut, Smartphone } from 'lucide-react';

interface ZoomControlsProps {
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  triggerAutoFit: () => void;
  className?: string;
  isMobile?: boolean;
}

export function ZoomControls({
  zoomLevel,
  setZoomLevel,
  triggerAutoFit,
  className = '',
  isMobile = false
}: ZoomControlsProps) {
  return (
    <div className={`flex items-center gap-1 bg-[var(--color-neutral-text-primary)] px-2 py-1 rounded-xl border border-white/10 shadow-inner select-none ${className}`}>
      <button
        type="button"
        onClick={() => setZoomLevel(prev => Math.max(0.3, parseFloat((prev - 0.1).toFixed(2))))}
        className="p-1 rounded-lg hover:bg-[var(--color-accent-base)] text-white transition cursor-pointer active:scale-95"
        title="Alejar (-10%)"
      >
        <ZoomOut className={isMobile ? "w-3 h-3" : "w-3.5 h-3.5"} />
      </button>

      <span className="px-2 text-[var(--color-accent-amber)] text-xs font-black min-w-10 text-center">
        {Math.round(zoomLevel * 100)}%
      </span>

      <button
        type="button"
        onClick={() => setZoomLevel(prev => Math.min(2.0, parseFloat((prev + 0.1).toFixed(2))))}
        className="p-1 rounded-lg hover:bg-[var(--color-accent-base)] text-white transition cursor-pointer active:scale-95"
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
    </div>
  );
}
