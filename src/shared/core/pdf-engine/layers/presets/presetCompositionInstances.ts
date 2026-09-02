/**
 * NÚCLEO — INSTANCIAS DE COMPOSICIÓN DE PRESETS (presetCompositionInstances.ts)
 * 
 * Instancias concretas reutilizables de ColorPreset, TypographyPreset y ColumnLayoutPreset
 * para ser consumidas por presetCompositionEngine.ts y presetRegistry.ts.
 */

import { ColorPreset, TypographyPreset, ColumnLayoutPreset } from './presetSchema';
import { generateHarmoniousPalette } from '../colors/paletteHarmonyEngine';

/**
 * Paletas de Color Curadas y Armónicas (19 paletas: 7 originales + 12 nuevas)
 */
export const PRESET_COLORS: Record<string, ColorPreset> = {
  sobrio: {
    id: 'color-sobrio',
    name: 'Sobrio Pizarra',
    seedHex: '#1E293B',
    harmonyScheme: 'monochromatic',
    palette: generateHarmoniousPalette('#1E293B', 'monochromatic')
  },
  joven: {
    id: 'color-joven',
    name: 'Joven Carmesí',
    seedHex: '#FF2E63',
    harmonyScheme: 'split-complementary',
    palette: generateHarmoniousPalette('#FF2E63', 'split-complementary')
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
  },
  marino: {
    id: 'color-marino',
    name: 'Ejecutivo Azul Marino',
    seedHex: '#004080',
    harmonyScheme: 'split-complementary',
    palette: generateHarmoniousPalette('#004080', 'split-complementary')
  },
  borgona: {
    id: 'color-borgona',
    name: 'Borgoña Noble',
    seedHex: '#581825',
    harmonyScheme: 'split-complementary',
    palette: generateHarmoniousPalette('#581825', 'split-complementary')
  },
  amatista: {
    id: 'color-amatista',
    name: 'Amatista Real',
    seedHex: '#3B1C5A',
    harmonyScheme: 'analogous',
    palette: generateHarmoniousPalette('#3B1C5A', 'analogous')
  },
  // 4 JÓVENES / VIBRANTES
  'neon-coral': {
    id: 'color-neon-coral',
    name: 'Coral Neón',
    seedHex: '#FF6B6B',
    harmonyScheme: 'split-complementary',
    palette: generateHarmoniousPalette('#FF6B6B', 'split-complementary')
  },
  'menta-esmeralda': {
    id: 'color-menta-esmeralda',
    name: 'Menta Esmeralda',
    seedHex: '#00B894',
    harmonyScheme: 'analogous',
    palette: generateHarmoniousPalette('#00B894', 'analogous')
  },
  'cyber-indigo': {
    id: 'color-cyber-indigo',
    name: 'Cyber Índigo',
    seedHex: '#6C5CE7',
    harmonyScheme: 'triadic',
    palette: generateHarmoniousPalette('#6C5CE7', 'triadic')
  },
  'amber-solar': {
    id: 'color-amber-solar',
    name: 'Ámbar Solar',
    seedHex: '#FDCB6E',
    harmonyScheme: 'split-complementary',
    palette: generateHarmoniousPalette('#FDCB6E', 'split-complementary')
  },
  // 4 EJECUTIVAS / CORPORATIVAS
  'navy-consul': {
    id: 'color-navy-consul',
    name: 'Navy Cónsul',
    seedHex: '#0C2440',
    harmonyScheme: 'monochromatic',
    palette: generateHarmoniousPalette('#0C2440', 'monochromatic')
  },
  'marron-tabaco': {
    id: 'color-marron-tabaco',
    name: 'Marrón Tabaco',
    seedHex: '#4A2E1B',
    harmonyScheme: 'analogous',
    palette: generateHarmoniousPalette('#4A2E1B', 'analogous')
  },
  'gris-granito': {
    id: 'color-gris-granito',
    name: 'Gris Granito',
    seedHex: '#34495E',
    harmonyScheme: 'monochromatic',
    palette: generateHarmoniousPalette('#34495E', 'monochromatic')
  },
  'verde-oliva': {
    id: 'color-verde-oliva',
    name: 'Verde Oliva Real',
    seedHex: '#2D4030',
    harmonyScheme: 'analogous',
    palette: generateHarmoniousPalette('#2D4030', 'analogous')
  },
  // 4 MINIMALISTAS (Barra clara + Tarjetas blancas)
  'lino-suave': {
    id: 'color-lino-suave',
    name: 'Lino Suave',
    seedHex: '#F5F2EB',
    harmonyScheme: 'monochromatic',
    palette: generateHarmoniousPalette('#F5F2EB', 'monochromatic')
  },
  'hielo-nordico': {
    id: 'color-hielo-nordico',
    name: 'Hielo Nórdico',
    seedHex: '#EBF3F5',
    harmonyScheme: 'analogous',
    palette: generateHarmoniousPalette('#EBF3F5', 'analogous')
  },
  'marfil-minimal': {
    id: 'color-marfil-minimal',
    name: 'Marfil Minimal',
    seedHex: '#FDFBF7',
    harmonyScheme: 'monochromatic',
    palette: generateHarmoniousPalette('#FDFBF7', 'monochromatic')
  },
  'cuarzo-rosa': {
    id: 'color-cuarzo-rosa',
    name: 'Cuarzo Rosa',
    seedHex: '#F7EFF2',
    harmonyScheme: 'analogous',
    palette: generateHarmoniousPalette('#F7EFF2', 'analogous')
  }
};

/**
 * Escalas y Jerarquías Tipográficas
 */
export const PRESET_TYPOGRAPHY: Record<'editorial' | 'moderna' | 'clasica' | 'condensada', TypographyPreset> = {
  editorial: {
    id: 'typo-editorial',
    name: 'Editorial Serif',
    typographyHarmonyScheme: 'goldenRatio',
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
    typographyHarmonyScheme: 'perfectFourth',
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
    typographyHarmonyScheme: 'majorThird',
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
    typographyHarmonyScheme: 'minorThird',
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

export function getColumnLayoutPresetName(key: string, sidebarWidthPercent: number = 40): string {
  const clamped = Math.min(42, Math.max(32, sidebarWidthPercent));
  if (key === 'sidebar-left') return `Barra Izquierda (${clamped}%)`;
  if (key === 'sidebar-right') return `Barra Derecha (${clamped}%)`;
  return 'Columna Única Completa (100%)';
}

/**
 * Arquetipos de Disposición de Columnas
 */
export const PRESET_COLUMNS: Record<'sidebar-left' | 'sidebar-right' | 'full-width', ColumnLayoutPreset> = {
  'sidebar-left': {
    id: 'layout-sidebar-left',
    name: getColumnLayoutPresetName('sidebar-left', 40),
    sectors: [
      { id: 'sidebar-col', role: 'sidebar', widthPercent: 40, order: 1 },
      { id: 'main-col', role: 'main', widthPercent: 60, order: 2 }
    ],
    sectionOrder: [
      { sectorRole: 'sidebar', sectionIds: ['contacto', 'datos-personales', 'competencias', 'informatica'] },
      { sectorRole: 'main', sectionIds: ['frase', 'formacion', 'profesion', 'experiencia', 'cursos', 'ecologia', 'firma'] }
    ]
  },
  'sidebar-right': {
    id: 'layout-sidebar-right',
    name: getColumnLayoutPresetName('sidebar-right', 40),
    sectors: [
      { id: 'main-col', role: 'main', widthPercent: 60, order: 1 },
      { id: 'sidebar-col', role: 'sidebar', widthPercent: 40, order: 2 }
    ],
    sectionOrder: [
      { sectorRole: 'main', sectionIds: ['frase', 'formacion', 'profesion', 'experiencia', 'cursos', 'ecologia', 'firma'] },
      { sectorRole: 'sidebar', sectionIds: ['contacto', 'datos-personales', 'competencias', 'informatica'] }
    ]
  },
  'full-width': {
    id: 'layout-full-width',
    name: getColumnLayoutPresetName('full-width', 40),
    sectors: [
      { id: 'main-full', role: 'main', widthPercent: 100, order: 1 }
    ],
    sectionOrder: [
      { sectorRole: 'main', sectionIds: ['contacto', 'datos-personales', 'frase', 'competencias', 'informatica', 'formacion', 'profesion', 'experiencia', 'cursos', 'ecologia', 'firma'] }
    ]
  }
};
