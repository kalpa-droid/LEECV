/**
 * NÚCLEO — INSTANCIAS DE COMPOSICIÓN DE PRESETS (presetCompositionInstances.ts)
 * 
 * Instancias concretas reutilizables de ColorPreset, TypographyPreset y ColumnLayoutPreset
 * para ser consumidas por presetCompositionEngine.ts y presetRegistry.ts.
 */

import { ColorPreset, TypographyPreset, ColumnLayoutPreset } from './presetSchema';
import { generateHarmoniousPalette } from '../colors/paletteHarmonyEngine';

/**
 * Paletas de Color Curadas y Armónicas
 */
export const PRESET_COLORS: Record<'sobrio' | 'joven' | 'clasico' | 'elegante', ColorPreset> = {
  sobrio: {
    id: 'color-sobrio',
    name: 'Sobrio Pizarra',
    seedHex: '#1E293B',
    harmonyScheme: 'monochromatic',
    palette: generateHarmoniousPalette('#1E293B', 'monochromatic')
  },
  joven: {
    id: 'color-joven',
    name: 'Joven Neón',
    seedHex: '#FF2E63',
    harmonyScheme: 'analogous',
    palette: generateHarmoniousPalette('#FF2E63', 'analogous')
  },
  clasico: {
    id: 'color-clasico',
    name: 'Clásico Ejecutivo',
    seedHex: '#00655F',
    harmonyScheme: 'analogous',
    palette: generateHarmoniousPalette('#00655F', 'analogous')
  },
  elegante: {
    id: 'color-elegante',
    name: 'Elegante Esmeralda',
    seedHex: '#1D9E75',
    harmonyScheme: 'triadic',
    palette: generateHarmoniousPalette('#1D9E75', 'triadic')
  }
};

/**
 * Escalas y Jerarquías Tipográficas
 */
export const PRESET_TYPOGRAPHY: Record<'editorial' | 'moderna' | 'clasica' | 'condensada', TypographyPreset> = {
  editorial: {
    id: 'typo-editorial',
    name: 'Editorial Serif',
    typography: {
      title: 22,
      sectionHeading: 13,
      itemTitle: 11,
      body: 9.5,
      caption: 8,
      fontFamily: 'Helvetica',
      lineHeightBody: 1.35,
      lineHeightHeading: 1.2,
      recordScaleRatios: {
        subtitle: 9,
        meta: 8,
        extra: 8
      }
    }
  },
  moderna: {
    id: 'typo-moderna',
    name: 'Moderna limpia',
    typography: {
      title: 20,
      sectionHeading: 12,
      itemTitle: 10.5,
      body: 9,
      caption: 7.5,
      fontFamily: 'Helvetica',
      lineHeightBody: 1.3,
      lineHeightHeading: 1.15,
      recordScaleRatios: {
        subtitle: 8.5,
        meta: 7.5,
        extra: 7.5
      }
    }
  },
  clasica: {
    id: 'typo-clasica',
    name: 'Clásica Tradicional',
    typography: {
      title: 24,
      sectionHeading: 14,
      itemTitle: 11.5,
      body: 10,
      caption: 8.5,
      fontFamily: 'Helvetica',
      lineHeightBody: 1.4,
      lineHeightHeading: 1.25,
      recordScaleRatios: {
        subtitle: 9.5,
        meta: 8.5,
        extra: 8.5
      }
    }
  },
  condensada: {
    id: 'typo-condensada',
    name: 'Condensada Alta Densidad',
    typography: {
      title: 18,
      sectionHeading: 11,
      itemTitle: 10,
      body: 8.5,
      caption: 7,
      fontFamily: 'Helvetica',
      lineHeightBody: 1.2,
      lineHeightHeading: 1.1,
      recordScaleRatios: {
        subtitle: 8,
        meta: 7,
        extra: 7
      }
    }
  }
};

/**
 * Arquetipos de Disposición de Columnas
 */
export const PRESET_COLUMNS: Record<'sidebar-left' | 'sidebar-right' | 'full-width', ColumnLayoutPreset> = {
  'sidebar-left': {
    id: 'layout-sidebar-left',
    name: 'Barra Izquierda (33/67)',
    sectionOrder: [
      { sectorRole: 'sidebar', sectionIds: ['personal', 'contact', 'skills', 'languages'] },
      { sectorRole: 'main', sectionIds: ['summary', 'experience', 'education', 'certifications', 'projects'] }
    ]
  },
  'sidebar-right': {
    id: 'layout-sidebar-right',
    name: 'Barra Derecha (67/33)',
    sectionOrder: [
      { sectorRole: 'main', sectionIds: ['summary', 'experience', 'education', 'projects'] },
      { sectorRole: 'sidebar', sectionIds: ['personal', 'contact', 'skills', 'languages', 'certifications'] }
    ]
  },
  'full-width': {
    id: 'layout-full-width',
    name: 'Columna Única Completa',
    sectionOrder: [
      { sectorRole: 'main', sectionIds: ['personal', 'summary', 'experience', 'education', 'skills', 'languages', 'certifications', 'projects'] }
    ]
  }
};
