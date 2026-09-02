import React, { useEffect } from 'react';
import { ArrowUp, ArrowDown, Columns, Scissors, Check, ArrowDownUp } from 'lucide-react';
import { getSection, getSectionLabel } from '../../../../shared/core/sectionRegistry';
import { radius, elevationSystem } from '../../../../shared/core/uiDesignSystem';
import { applyRelativeSectionPosition, SectorRoleType } from '../../../../shared/core/pdf-engine/layers/sectors/sectionOrderEngine';
import { resolveEffectivePresetSectionOrder } from '../../../../shared/core/pdf-engine/layers/sectors/layoutResolutionEngine';
import { resolveActivePreset } from '../../../../shared/core/pdf-engine/layers/presets/presetRegistry';
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

  const activePreset = resolveActivePreset(cvData);
  const effectiveSectionOrders = resolveEffectivePresetSectionOrder(activePreset, cvData?.layout);

  const sidebarOrderObj = effectiveSectionOrders.find(s => s.sectorRole === 'sidebar');
  const mainOrderObj = effectiveSectionOrders.find(s => s.sectorRole === 'main');

  const sidebarIds = sidebarOrderObj?.sectionIds || [];
  const mainIds = mainOrderObj?.sectionIds || [];

  const currentSector: SectorRoleType = sidebarIds.includes(cleanSecId) ? 'secundaria' : 'primaria';
  const sameSectorIds = currentSector === 'secundaria' ? sidebarIds : mainIds;
  const eligibleAfterSections = sameSectorIds.filter(id => id !== cleanSecId);

  const currentIndex = sameSectorIds.indexOf(cleanSecId);
  const currentPos = currentIndex !== -1 ? currentIndex + 1 : undefined;

  let currentAfterId = '';
  if (currentIndex > 0) {
    currentAfterId = sameSectorIds[currentIndex - 1];
  }

  const getSectionTitle = (id: string) => {
    return getSectionLabel(id, cvData?.customSections || []);
  };

  const hasPageBreak = !!(cvData.layout?.sectionPageBreaks?.[cleanSecId] || cvData.sectionPageBreaks?.[cleanSecId]);

  const handleSetColumn = (targetVal: SectorRoleType) => {
    setCvData((prev: any) => applyRelativeSectionPosition(prev, {
      sectionId: cleanSecId,
      targetSector: targetVal,
      positionMode: 'end'
    }));
  };

  const handleMove = (direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIdx < 0 || targetIdx >= sameSectorIds.length) return;

    const targetAfterId = direction === 'up'
      ? (targetIdx > 0 ? sameSectorIds[targetIdx - 1] : undefined)
      : sameSectorIds[targetIdx];

    if (direction === 'up' && targetIdx === 0) {
      setCvData((prev: any) => applyRelativeSectionPosition(prev, {
        sectionId: cleanSecId,
        targetSector: currentSector,
        positionMode: 'start'
      }));
    } else if (targetAfterId) {
      setCvData((prev: any) => applyRelativeSectionPosition(prev, {
        sectionId: cleanSecId,
        targetSector: currentSector,
        positionMode: 'after',
        targetAfterId
      }));
    }
  };

  const handleAfterSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'start') {
      setCvData((prev: any) => applyRelativeSectionPosition(prev, {
        sectionId: cleanSecId,
        targetSector: currentSector,
        positionMode: 'start'
      }));
    } else if (val === 'end') {
      setCvData((prev: any) => applyRelativeSectionPosition(prev, {
        sectionId: cleanSecId,
        targetSector: currentSector,
        positionMode: 'end'
      }));
    } else if (val.startsWith('after:')) {
      const targetAfterId = val.replace('after:', '');
      setCvData((prev: any) => applyRelativeSectionPosition(prev, {
        sectionId: cleanSecId,
        targetSector: currentSector,
        positionMode: 'after',
        targetAfterId
      }));
    }
  };

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

  const currentAfterSelectValue = currentIndex === 0 ? 'start' : (currentAfterId ? `after:${currentAfterId}` : 'end');

  return (
    <div data-section-id={cleanSecId} className={`p-2.5 rounded-[${radius.card}] bg-[var(--ui-bg-card)] border border-[var(--color-neutral-border)] space-y-2 text-xs`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Asignación de Columna (Izquierda / Derecha) */}
        {assignableToColumns && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-[var(--color-neutral-text-secondary)] mr-1 flex items-center gap-1">
              <Columns className="w-3 h-3" /> Columna:
            </span>
            <button
              type="button"
              onClick={() => handleSetColumn('secundaria')}
              className={`px-2 py-1 rounded-[${radius.control}] text-[10px] font-extrabold transition cursor-pointer ${
                currentSector === 'secundaria'
                  ? `bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.raised}`
                  : 'bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-secondary)] hover:bg-[var(--color-neutral-border)]/60'
              }`}
              title="Asignar a Columna Secundaria / Lateral (Izquierda)"
            >
              Izquierda
            </button>
            <button
              type="button"
              onClick={() => handleSetColumn('primaria')}
              className={`px-2 py-1 rounded-[${radius.control}] text-[10px] font-extrabold transition cursor-pointer ${
                currentSector === 'primaria'
                  ? `bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.raised}`
                  : 'bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-secondary)] hover:bg-[var(--color-neutral-border)]/60'
              }`}
              title="Asignar a Columna Principal (Derecha)"
            >
              Derecha
            </button>
          </div>
        )}

        {/* Botones de Ordenación Vertical (Subir / Bajar) */}
        {assignableToColumns && currentIndex !== -1 && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-[var(--color-neutral-text-secondary)] mr-1">
              {currentPos !== undefined ? `Pos: #${currentPos}` : 'Orden:'}
            </span>
            <button
              type="button"
              onClick={() => handleMove('up')}
              disabled={currentIndex <= 0}
              className={`p-1.5 rounded-[${radius.control}] bg-[var(--color-neutral-surface-muted)] hover:bg-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer`}
              title="Subir sección en la columna activa"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleMove('down')}
              disabled={currentIndex === -1 || currentIndex >= sameSectorIds.length - 1}
              className={`p-1.5 rounded-[${radius.control}] bg-[var(--color-neutral-surface-muted)] hover:bg-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer`}
              title="Bajar sección en la columna activa"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Selector Fino "Después de: [Sección X]" */}
      {assignableToColumns && (
        <SectionPositionControl sectionKey={cleanSecId} cvData={cvData} setCvData={setCvData} />
      )}

      {/* Salto de Página Forzado & Selector de Estilo de Contenedor Unificado */}
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

