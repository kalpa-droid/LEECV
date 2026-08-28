/**
 * NÚCLEO — MOTOR DE RESOLUCIÓN DE DISPOSICIÓN DE COLUMNAS (layoutResolutionEngine.ts)
 * 
 * Fusiona las preferencias de disposición del usuario (`layout.columnAssignments` y `layout.sectionOrders` de `primaria`/`secundaria`/`ambas`)
 * con el orden de secciones base declarado por el Preset (`preset.sectionOrder`).
 * 
 * Garantiza que mover una sección a columna primaria (main), secundaria (sidebar) o ambas (both)
 * se aplique síncronamente con total fidelidad en el lienzo de PDF y en la vista previa.
 */

import { Preset, PresetSectionOrder } from '../presets/presetSchema';

export interface CvLayoutOverrides {
  columnAssignments?: Record<string, 'primaria' | 'secundaria' | 'ambas' | string>;
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

  if (!layoutOverrides) {
    return preset.sectionOrder;
  }

  const userSecOrder = layoutOverrides.sectionOrders?.secundaria;
  const userPrimOrder = layoutOverrides.sectionOrders?.primaria;
  const assignments = layoutOverrides.columnAssignments || {};

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
    } else if (targetRole === 'ambas') {
      if (!sidebarIds.includes(cleanId)) sidebarIds.push(cleanId);
      if (!mainIds.includes(cleanId)) mainIds.push(cleanId);
    }
  });

  return [
    { sectorRole: 'sidebar', sectionIds: [...new Set(sidebarIds)] },
    { sectorRole: 'main', sectionIds: [...new Set(mainIds)] }
  ];
}
