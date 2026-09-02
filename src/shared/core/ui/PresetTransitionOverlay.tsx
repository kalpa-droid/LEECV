import React from 'react';
import { VintageQuillLoader } from './VintageQuillLoader';
import { radius, elevationSystem } from '../uiDesignSystem';

interface PresetTransitionOverlayProps {
  isApplying: boolean;
  presetName?: string;
  presetType?: string;
  className?: string;
}

/**
 * PresetTransitionOverlay - Capa flotante con efecto Glassmorphism y Pluma Antigua
 *
 * Muestra una tarjeta elegante con la pluma de caligrafía y el nombre del preset
 * que se está aplicando actualmente, dando retroalimentación inmediata al usuario.
 */
export const PresetTransitionOverlay: React.FC<PresetTransitionOverlayProps> = ({
  isApplying,
  presetName,
  presetType: _presetType,
  className = ''
}) => {
  if (!isApplying) {
    return null;
  }

  const displayName = presetName || 'Diseño de Documento';

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[6px] transition-all duration-200 animate-fadeIn pointer-events-none ${className}`}
    >
      <div 
        className={`px-6 py-5 rounded-[${radius.modal}] bg-[var(--ui-bg-card)] border-2 border-[var(--color-secondary-bright)]/40 ${elevationSystem.floating} shadow-2xl flex flex-col items-center gap-3 text-center max-w-xs sm:max-w-sm pointer-events-auto`}
      >
        {/* Pluma Antigua Rotatoria de Caligrafía */}
        <VintageQuillLoader size={52} />

        {/* Texto Informativo */}
        <div className="space-y-1 mt-1">
          <div className="flex items-center justify-center gap-1.5 text-xs font-black tracking-wide text-[var(--color-secondary-bright)] uppercase">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-secondary-bright)] animate-ping" />
            <span>Aplicando Preset</span>
          </div>

          <h3 className="text-sm sm:text-base font-black text-[var(--ui-text-primary)] leading-tight px-2">
            "{displayName}"
          </h3>

          <p className="text-[11px] font-bold text-[var(--ui-text-secondary)] opacity-85">
            Renderizando maquetación ejecutiva...
          </p>
        </div>

        {/* Barra de progreso de luz sutil */}
        <div className="w-full h-1 bg-[var(--ui-bg-panel)] rounded-full overflow-hidden mt-1 border border-[var(--ui-border)]">
          <div 
            className="h-full bg-gradient-to-r from-[var(--color-secondary-bright)] via-[var(--color-accent-base)] to-[var(--color-accent-amber)] animate-pulse"
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </div>
  );
};
