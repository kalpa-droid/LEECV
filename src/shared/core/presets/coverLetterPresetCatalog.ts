import { Preset } from '../pdf-engine/layers/presets/presetSchema';

export interface CoverLetterPresetConfig {
  id: string;
  name: string;
  description: string;
  headerStyle: 'centered' | 'left_bar' | 'minimal';
  inheritCvColors: boolean;
  lineSpacing: number;
}

export const COVER_LETTER_PRESETS: Record<string, CoverLetterPresetConfig> = {
  'carta-clasica': {
    id: 'carta-clasica',
    name: 'Carta Clásica Editorial',
    description: 'Encabezado centrado formal con separador elegante de color de acento.',
    headerStyle: 'centered',
    inheritCvColors: true,
    lineSpacing: 1.25
  },
  'carta-moderna': {
    id: 'carta-moderna',
    name: 'Carta Moderna Ejecutiva',
    description: 'Encabezado alineado a la izquierda con barra lateral de acento.',
    headerStyle: 'left_bar',
    inheritCvColors: true,
    lineSpacing: 1.3
  },
  'carta-minimalista': {
    id: 'carta-minimalista',
    name: 'Carta Minimalista Limpia',
    description: 'Diseño ultra-limpio con márgenes amplios e interlineado cómodo.',
    headerStyle: 'minimal',
    inheritCvColors: true,
    lineSpacing: 1.35
  }
};

export const cartaClasicaPreset: Preset = {
  id: 'carta-clasica',
  name: 'Carta Clásica Editorial',
  pageCategory: 'carta',
  pageSizeId: 'a4',
  marginPresetId: 'normal',
  sectors: [{ id: 'main', role: 'main', widthPercent: 100, order: 0 }],
  fixedObjects: [],
  sectionOrder: [{ sectorRole: 'main', sectionIds: ['encabezado', 'destinatario', 'cuerpo', 'despedida'] }],
  palette: {
    primary: '#1D9E75',
    secondary: '#4A5568',
    accent: '#2D3748',
    text: '#2D3748',
    textOnPrimary: '#ffffff',
    background: '#ffffff'
  },
  typography: {
    title: 16,
    sectionHeading: 12,
    itemTitle: 11,
    body: 10.5,
    caption: 9,
    fontFamily: 'Helvetica',
    lineHeightBody: 1.25
  }
};

export const cartaModernaPreset: Preset = {
  id: 'carta-moderna',
  name: 'Carta Moderna Ejecutiva',
  pageCategory: 'carta',
  pageSizeId: 'a4',
  marginPresetId: 'normal',
  sectors: [{ id: 'main', role: 'main', widthPercent: 100, order: 0 }],
  fixedObjects: [],
  sectionOrder: [{ sectorRole: 'main', sectionIds: ['encabezado', 'destinatario', 'cuerpo', 'despedida'] }],
  palette: {
    primary: '#2B6CB0',
    secondary: '#4A5568',
    accent: '#2D3748',
    text: '#2D3748',
    textOnPrimary: '#ffffff',
    background: '#ffffff'
  },
  typography: {
    title: 16,
    sectionHeading: 12,
    itemTitle: 11,
    body: 10.5,
    caption: 9,
    fontFamily: 'Helvetica',
    lineHeightBody: 1.3
  }
};

export const cartaMinimalistaPreset: Preset = {
  id: 'carta-minimalista',
  name: 'Carta Minimalista Limpia',
  pageCategory: 'carta',
  pageSizeId: 'a4',
  marginPresetId: 'normal',
  sectors: [{ id: 'main', role: 'main', widthPercent: 100, order: 0 }],
  fixedObjects: [],
  sectionOrder: [{ sectorRole: 'main', sectionIds: ['encabezado', 'destinatario', 'cuerpo', 'despedida'] }],
  palette: {
    primary: '#1A202C',
    secondary: '#718096',
    accent: '#2D3748',
    text: '#2D3748',
    textOnPrimary: '#ffffff',
    background: '#ffffff'
  },
  typography: {
    title: 16,
    sectionHeading: 12,
    itemTitle: 11,
    body: 10.5,
    caption: 9,
    fontFamily: 'Helvetica',
    lineHeightBody: 1.35
  }
};

export function getCoverLetterPreset(id: string = 'carta-clasica'): CoverLetterPresetConfig {
  return COVER_LETTER_PRESETS[id] || COVER_LETTER_PRESETS['carta-clasica'];
}

