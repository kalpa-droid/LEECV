/**
 * NÚCLEO — MOTOR DE RESOLUCIÓN DE DISPOSICIÓN DE COLUMNAS (layoutResolutionEngine.ts)
 * 
 * Fusiona las preferencias de disposición del usuario (`layout.columnAssignments` y `layout.sectionOrders` de `primaria`/`secundaria`)
 * con el orden de secciones base declarado por el Preset (`preset.sectionOrder`).
 * 
 * Garantiza que mover una sección a columna primaria (main / derecha) o secundaria (sidebar / izquierda)
 * se aplique síncronamente con total fidelidad en el lienzo de PDF y en la vista previa.
 */

import { Preset, PresetSectionOrder } from '../presets/presetSchema';
import { CANONICAL_SECTION_ORDER } from '../../../sections/canonicalSectionOrder';
import { SECTION_CATALOG } from '../../../sectionRegistry';

export interface CvLayoutOverrides {
  pageSizeId?: string;
  sidebarWidthPercent?: number;
  columnAssignments?: Record<string, 'primaria' | 'secundaria' | string>;
  sectionOrders?: {
    primaria?: string[];
    secundaria?: string[];
  };
}

export function resolveEffectivePresetSectionOrder(
  preset: Preset,
  layoutOverrides?: CvLayoutOverrides
): PresetSectionOrder[] {
  const baseSidebar = preset.sectionOrder.find(s => s.sectorRole === 'sidebar')?.sectionIds || [];
  const baseMain = preset.sectionOrder.find(s => s.sectorRole === 'main')?.sectionIds || [];

  const hasSidebarSector = Array.isArray(preset.sectors) && preset.sectors.some(s => s.role === 'sidebar');

  const userSecOrder = layoutOverrides?.sectionOrders?.secundaria;
  const userPrimOrder = layoutOverrides?.sectionOrders?.primaria;
  const assignments = layoutOverrides?.columnAssignments || {};

  let sidebarIds: string[] = Array.isArray(userSecOrder) && userSecOrder.length > 0
    ? [...userSecOrder]
    : [...baseSidebar];

  let mainIds: string[] = Array.isArray(userPrimOrder) && userPrimOrder.length > 0
    ? [...userPrimOrder]
    : [...baseMain];

  // Aplicar las asignaciones individuales explícitas por sección
  Object.entries(assignments).forEach(([secId, targetRole]) => {
    const cleanId = secId.replace(/-cont$/, '');

    if (targetRole === 'secundaria') {
      if (!sidebarIds.includes(cleanId)) sidebarIds.push(cleanId);
      mainIds = mainIds.filter(id => id !== cleanId);
    } else if (targetRole === 'primaria') {
      if (!mainIds.includes(cleanId)) mainIds.push(cleanId);
      sidebarIds = sidebarIds.filter(id => id !== cleanId);
    }
  });

  // Completar secciones del orden canónico que no estén presentes en ningún sector
  CANONICAL_SECTION_ORDER.forEach(secId => {
    if (!sidebarIds.includes(secId) && !mainIds.includes(secId)) {
      const catEntry = SECTION_CATALOG.find(s => s.id === secId);
      const targetRole = catEntry?.defaultSectorRole || 'main';
      if (targetRole === 'sidebar' && hasSidebarSector) {
        sidebarIds.push(secId);
      } else {
        mainIds.push(secId);
      }
    }
  });

  const canonicalIndexMap = new Map(CANONICAL_SECTION_ORDER.map((id, idx) => [id, idx]));
  const sortListByCanonical = (list: string[], baseList: string[]) => {
    return [...list].sort((a, b) => {
      const idxAInBase = baseList.indexOf(a);
      const idxBInBase = baseList.indexOf(b);
      if (idxAInBase !== -1 && idxBInBase !== -1) {
        return idxAInBase - idxBInBase;
      }
      if (idxAInBase !== -1) return -1;
      if (idxBInBase !== -1) return 1;
      return (canonicalIndexMap.get(a) ?? 999) - (canonicalIndexMap.get(b) ?? 999);
    });
  };

  const finalSidebar = sortListByCanonical(sidebarIds, Array.isArray(userSecOrder) && userSecOrder.length > 0 ? userSecOrder : baseSidebar);
  const finalMain = sortListByCanonical(mainIds, Array.isArray(userPrimOrder) && userPrimOrder.length > 0 ? userPrimOrder : baseMain);

  // Invariante de Motor: 'firma' pertenece exclusivamente al final de la columna principal (main / terminal)
  let cleanedSidebar = finalSidebar.filter(id => id !== 'firma');
  let cleanedMain = finalMain.filter(id => id !== 'firma');
  if (finalSidebar.includes('firma') || finalMain.includes('firma')) {
    cleanedMain.push('firma');
  }

  if (!hasSidebarSector) {
    let consolidatedMainIds = [...new Set([...cleanedSidebar, ...cleanedMain])];
    if (consolidatedMainIds.includes('firma')) {
      consolidatedMainIds = consolidatedMainIds.filter(id => id !== 'firma');
      consolidatedMainIds.push('firma');
    }
    return [
      { sectorRole: 'main', sectionIds: consolidatedMainIds }
    ];
  }

  return [
    { sectorRole: 'sidebar', sectionIds: [...new Set(cleanedSidebar)] },
    { sectorRole: 'main', sectionIds: [...new Set(cleanedMain)] }
  ];
}

export function resolveEffectivePresetSectors(
  preset: Preset,
  layoutOverrides?: CvLayoutOverrides & { sidebarWidthPercent?: number }
) {
  if (!layoutOverrides?.sidebarWidthPercent || !Array.isArray(preset.sectors)) {
    return preset.sectors;
  }
  const clamped = Math.min(42, Math.max(32, layoutOverrides.sidebarWidthPercent));
  return preset.sectors.map((s) => {
    if (s.role === 'sidebar') {
      return { ...s, widthPercent: clamped };
    }
    if (s.role === 'main') {
      return { ...s, widthPercent: 100 - clamped };
    }
    return s;
  });
}
