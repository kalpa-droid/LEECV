/**
 * NÚCLEO — MOTOR DE MODO ATS UNICONTENIDO (atsFlatteningEngine.ts)
 *
 * Transforma cualquier Preset en una versión aplanada de lectura lineal directa (1 sola columna,
 * sin adornos vectoriales, sin bordes decorativos y con tipografía estándar universal).
 */

import { Preset } from '../presets/presetSchema';

export function flattenPresetForATS(basePreset: Preset): Preset {
  const allSectionIds: string[] = [];
  basePreset.sectionOrder.forEach((sector) => {
    sector.sectionIds.forEach((sid) => {
      if (!allSectionIds.includes(sid)) {
        allSectionIds.push(sid);
      }
    });
  });

  return {
    ...basePreset,
    id: `${basePreset.id}-ats-mode`,
    name: `${basePreset.name} (Versión ATS)`,
    sectionOrder: [
      {
        sectorRole: 'main',
        sectionIds: allSectionIds
      }
    ],
    sectors: [
      {
        id: 'sector_main_ats',
        role: 'main',
        widthPercent: 100,
        order: 1
      }
    ],
    decorativeElementPolicy: {
      cardBorders: false,
      sectionDividers: true,
      backgroundShapes: false,
      shadowEffects: false,
      cornerOrnaments: 'none',
      watermarkType: 'none',
      headerIconStyle: 'minimal'
    },
    typography: {
      ...basePreset.typography,
      fontFamily: 'Helvetica'
    }
  };
}
