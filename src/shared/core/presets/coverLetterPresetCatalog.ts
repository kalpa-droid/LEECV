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

export function getCoverLetterPreset(id: string = 'carta-clasica'): CoverLetterPresetConfig {
  return COVER_LETTER_PRESETS[id] || COVER_LETTER_PRESETS['carta-clasica'];
}
