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

  if (!layoutOverrides && hasSidebarSector) {
    return preset.sectionOrder;
  }

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

  if (!hasSidebarSector) {
    const consolidatedMainIds = [...new Set([...sidebarIds, ...mainIds])];
    return [
      { sectorRole: 'main', sectionIds: consolidatedMainIds }
    ];
  }

  return [
    { sectorRole: 'sidebar', sectionIds: [...new Set(sidebarIds)] },
    { sectorRole: 'main', sectionIds: [...new Set(mainIds)] }
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
