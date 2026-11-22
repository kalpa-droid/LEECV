import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { colorSystem, typeScale } from '../uiDesignSystem';
import { LidioHelpTrigger } from './LidioHelpTrigger';

interface PanelSectionProps {
  icon: React.ReactNode;
  title: string; // 1-3 palabras. Sin subtítulo — el detalle vive en el `?` de Lidio (`helpText`).
  children: React.ReactNode; // el preset / decisión principal, siempre visible
  manualAdjustment?: React.ReactNode; // "Ajuste manual" — colapsado por defecto
  /** Explicación sencilla en globo `?` de Lidio sobre para qué sirve esta sección/control. */
  helpText?: string;
  helpTitle?: string;
  /** Slot opcional a la derecha del encabezado (ej. `SectionSwitch`, `AIButton`, estado). */
  headerRight?: React.ReactNode;
}

/**
 * ÚNICO bloque de sección que se usa en cualquier pestaña del panel. Nunca
 * se escribe un <h3> suelto con estilos propios en una pestaña — todo pasa
 * por acá, usando el núcleo de colorSystem/typeScale.
 */
export function PanelSection({
  icon,
  title,
  children,
  manualAdjustment,
  helpText,
  helpTitle,
  headerRight,
}: PanelSectionProps) {
  const [showManual, setShowManual] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0" style={{ color: colorSystem.secondary.base }}>{icon}</span>
          <span className={`${typeScale.sectionTitle} truncate`} style={{ color: colorSystem.neutral.textPrimary }}>
            {title}
          </span>
          {helpText && (
            <LidioHelpTrigger
              size="xs"
              title={helpTitle || title}
              text={helpText}
              groupKey={`section-help-${helpTitle || title}`}
            />
          )}
        </div>
        {headerRight && (
          <div className="flex items-center gap-1.5 shrink-0">
            {headerRight}
          </div>
        )}
      </div>

      {children}

      {manualAdjustment && (
        <div className="pt-2 border-t" style={{ borderColor: colorSystem.neutral.border }}>
          <button
            type="button"
            onClick={() => setShowManual(v => !v)}
            className="w-full flex items-center justify-between py-1 cursor-pointer"
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
