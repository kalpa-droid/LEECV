import React from 'react';
import { Columns, ArrowDownUp } from 'lucide-react';
import { applyRelativeSectionPosition, SectorRoleType } from '../pdf-engine/layers/sectors/sectionOrderEngine';
import { resolveEffectivePresetSectionOrder } from '../pdf-engine/layers/sectors/layoutResolutionEngine';
import { resolveActivePreset } from '../pdf-engine/layers/presets/presetRegistry';
import { getSectionLabel } from '../sectionRegistry';

interface SectionPositionControlProps {
  sectionKey: string;
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
}

export function SectionPositionControl({ sectionKey, cvData, setCvData }: SectionPositionControlProps) {
  if (!sectionKey || !cvData) return null;

  const cleanSecId = sectionKey.replace(/-cont$/, '');
  const activePreset = resolveActivePreset(cvData);
  const effectiveSectionOrders = resolveEffectivePresetSectionOrder(activePreset, cvData?.layout);

  const sidebarOrderObj = effectiveSectionOrders.find(s => s.sectorRole === 'sidebar');
  const mainOrderObj = effectiveSectionOrders.find(s => s.sectorRole === 'main');

  const sidebarIds = sidebarOrderObj?.sectionIds || [];
  const mainIds = mainOrderObj?.sectionIds || [];

  const currentSector: SectorRoleType = sidebarIds.includes(cleanSecId) ? 'secundaria' : 'primaria';
  const sameSectorIds = currentSector === 'secundaria' ? sidebarIds : mainIds;
  const eligibleAfterSections = sameSectorIds.filter(id => id !== cleanSecId);

  // Determinar la posición actual relativa
  const currentIdx = sameSectorIds.indexOf(cleanSecId);
  let currentAfterId = '';
  if (currentIdx > 0) {
    currentAfterId = sameSectorIds[currentIdx - 1];
  }

  const getSectionTitle = (id: string) => {
    return getSectionLabel(id, cvData?.customSections || []);
  };

  const handleSectorChange = (newSector: SectorRoleType) => {
    setCvData((prev: any) => applyRelativeSectionPosition(prev, {
      sectionId: cleanSecId,
      targetSector: newSector,
      positionMode: 'end'
    }));
  };

  const handlePositionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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

  const currentSelectValue = currentIdx === 0 ? 'start' : (currentAfterId ? `after:${currentAfterId}` : 'end');

  return (
    <div className="p-3 bg-[var(--ui-bg-card)] border border-[var(--color-neutral-border)] rounded-[var(--radius-card)] space-y-2 text-xs">
      <div className="flex items-center justify-between font-bold text-[var(--color-neutral-text-primary)]">
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[var(--color-secondary-bright)]">
          <ArrowDownUp className="w-3.5 h-3.5" /> Ubicación y Orden Relativo
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Selector de Columna / Sector */}
        <div>
          <label className="block text-[10px] font-bold text-[var(--color-neutral-text-secondary)] mb-1">
            Ubicación en Hoja
          </label>
          <select
            value={currentSector}
            onChange={(e) => handleSectorChange(e.target.value as SectorRoleType)}
            className="w-full p-2 bg-[var(--ui-bg-panel)] border border-[var(--color-neutral-border)] rounded-[var(--radius-card)] text-xs font-semibold text-[var(--color-neutral-text-primary)] focus:outline-none focus:border-[var(--color-accent-base)]"
          >
            <option value="primaria">Columna Principal (Derecha)</option>
            <option value="secundaria">Barra Lateral (Izquierda)</option>
          </select>
        </div>

        {/* Selector "Después de: ..." */}
        <div>
          <label className="block text-[10px] font-bold text-[var(--color-neutral-text-secondary)] mb-1">
            Posición en Secuencia
          </label>
          <select
            value={currentSelectValue}
            onChange={handlePositionChange}
            className="w-full p-2 bg-[var(--ui-bg-panel)] border border-[var(--color-neutral-border)] rounded-[var(--radius-card)] text-xs font-semibold text-[var(--color-neutral-text-primary)] focus:outline-none focus:border-[var(--color-accent-base)]"
          >
            <option value="start">↑ Al principio de la columna</option>
            {eligibleAfterSections.map((secId) => (
              <option key={secId} value={`after:${secId}`}>
                ↓ Después de: {getSectionTitle(secId)}
              </option>
            ))}
            <option value="end">↓ Al final de la columna</option>
          </select>
        </div>
      </div>
    </div>
  );
}
