import React, { useEffect } from 'react';
import { Scissors, Check } from 'lucide-react';
import { getSection } from '../../../../shared/core/sectionRegistry';
import { radius, elevationSystem } from '../../../../shared/core/uiDesignSystem';
import { SectionPositionControl } from '../../../../shared/core/ui/SectionPositionControl';

interface SectionManualAdjustmentProps {
  sectionId: string;
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
  designKey?: string;
}

const MOUNTED_MANUAL_ADJUSTMENTS = new Set<string>();

export function getMountedManualAdjustments(): Set<string> {
  return MOUNTED_MANUAL_ADJUSTMENTS;
}

export function SectionManualAdjustment({ sectionId, cvData, setCvData, designKey }: SectionManualAdjustmentProps) {
  useEffect(() => {
    if (import.meta.env.DEV) {
      MOUNTED_MANUAL_ADJUSTMENTS.add(sectionId);
    }
    return () => {
      if (import.meta.env.DEV) {
        MOUNTED_MANUAL_ADJUSTMENTS.delete(sectionId);
      }
    };
  }, [sectionId]);

  if (!cvData || !setCvData) return null;

  const cleanSecId = sectionId.replace(/-cont$/, '');
  const activeDesignKey = designKey || cleanSecId;
  const currentCardDesign = cvData.recordCardDesigns?.[activeDesignKey] || (activeDesignKey === 'resumen' ? 'accent-outline' : 'accent-card');

  const catalogEntry = getSection(cleanSecId, cvData.customSections || []);
  const assignableToColumns = catalogEntry ? catalogEntry.assignableToColumns !== false : true;

  const hasPageBreak = !!(cvData.layout?.sectionPageBreaks?.[cleanSecId] || cvData.sectionPageBreaks?.[cleanSecId]);

  const handleTogglePageBreak = () => {
    setCvData((prev: any) => ({
      ...prev,
      layout: {
        ...(prev.layout || {}),
        sectionPageBreaks: {
          ...(prev.layout?.sectionPageBreaks || {}),
          [cleanSecId]: !hasPageBreak
        }
      }
    }));
  };

  const handleSetCardDesign = (designValue: string) => {
    setCvData((prev: any) => ({
      ...prev,
      recordCardDesigns: {
        ...(prev.recordCardDesigns || {}),
        [activeDesignKey]: designValue
      }
    }));
  };

  return (
    <div data-section-id={cleanSecId} className={`p-2.5 rounded-[${radius.card}] bg-[var(--ui-bg-card)] border border-[var(--color-neutral-border)] space-y-2 text-xs`}>
      {/* 1. Control Unificado de Ubicación (Columna) y Posición (Orden Relativo) */}
      {assignableToColumns && (
        <SectionPositionControl sectionKey={cleanSecId} cvData={cvData} setCvData={setCvData} />
      )}

      {/* 2. Salto de Página Forzado & Selector de Estilo de Contenedor Unificado */}
      <div className="pt-1.5 border-t border-[var(--color-neutral-border)]/60 flex items-center justify-between gap-1 flex-wrap">
        <button
          type="button"
          onClick={handleTogglePageBreak}
          className={`px-2.5 py-1 rounded-[${radius.control}] text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
            hasPageBreak
              ? `bg-[var(--color-accent-purple)] text-white ${elevationSystem.raised}`
              : 'bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-secondary)] hover:bg-[var(--color-neutral-border)]'
          }`}
          title="Forzar un salto de página nativo en PDF antes de iniciar esta sección"
        >
          <Scissors className="w-3 h-3" />
          <span>Salto de página</span>
          {hasPageBreak && <Check className={`w-3 h-3 ml-0.5 ${hasPageBreak ? 'text-white' : 'text-[var(--color-neutral-text-secondary)]'}`} />}
        </button>

        {/* 🎨 Selector de Estilo de Contenedores / Borde Unificado */}
        <div className="flex items-center gap-1">
          <select
            value={currentCardDesign}
            onChange={(e) => handleSetCardDesign(e.target.value)}
            className={`text-[10px] px-2 py-1 rounded-[${radius.control}] bg-[var(--color-neutral-surface-muted)] border border-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] font-bold outline-none cursor-pointer`}
            title="Estilo de Contenedores y Bordes de la Sección"
          >
            <option value="accent-card">🎨 Borde Acento + Fondo</option>
            <option value="accent-outline">🎨 Borde Acento (Sin Fondo)</option>
            <option value="primary-card">🔷 Borde Primario + Fondo</option>
            <option value="primary-outline">🔷 Borde Primario (Sin Fondo)</option>
            <option value="neutral-card">⚪ Borde Neutro + Fondo</option>
            <option value="neutral-outline">⚪ Borde Neutro (Sin Fondo)</option>
            <option value="clean">✨ Limpio (Sin Borde)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
