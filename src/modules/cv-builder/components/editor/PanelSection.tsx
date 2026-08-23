import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { colorSystem, typeScale } from '../../../../shared/core/uiDesignSystem';

interface PanelSectionProps {
  icon: React.ReactNode;
  title: string; // 1-3 palabras. Sin subtítulo — si hace falta explicar más, el título está mal elegido.
  children: React.ReactNode; // el preset / decisión principal, siempre visible
  manualAdjustment?: React.ReactNode; // "Ajuste manual" — colapsado por defecto
}

/**
 * ÚNICO bloque de sección que se usa en cualquier pestaña del panel. Nunca
 * se escribe un <h3> suelto con estilos propios en una pestaña — todo pasa
 * por acá, usando el núcleo de colorSystem/typeScale.
 */
export function PanelSection({ icon, title, children, manualAdjustment }: PanelSectionProps) {
  const [showManual, setShowManual] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span style={{ color: colorSystem.secondary.base }}>{icon}</span>
        <span className={typeScale.sectionTitle} style={{ color: colorSystem.neutral.textPrimary }}>
          {title}
        </span>
      </div>

      {children}

      {manualAdjustment && (
        <div className="pt-2 border-t" style={{ borderColor: colorSystem.neutral.border }}>
          <button
            type="button"
            onClick={() => setShowManual(v => !v)}
            className="w-full flex items-center justify-between py-1"
          >
            <span className={typeScale.helper} style={{ color: colorSystem.neutral.textSecondary }}>
              Ajuste manual
            </span>
            <ChevronDown
              className="w-4 h-4 transition-transform"
              style={{ color: colorSystem.neutral.textMuted, transform: showManual ? 'rotate(180deg)' : 'none' }}
            />
          </button>
          {showManual && <div className="pt-2">{manualAdjustment}</div>}
        </div>
      )}
    </div>
  );
}
