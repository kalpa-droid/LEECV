/**
 * NÚCLEO — MOTOR DE ESTILOS DE CONTENEDORES / TARJETAS (containerStyleEngine.ts)
 * 
 * Regula la combinación de bordes de resalte (Acento, Primario, Neutro)
 * con relleno de fondo (con fondo / sin fondo transparente / limpio sin borde).
 */

export interface ContainerStylePreset {
  id: string;
  name: string;
  shortLabel: string;
  borderColorRole: 'accent' | 'primary' | 'border' | 'transparent';
  borderWidthPt: number;
  hasBackground: boolean;
  backgroundColorRole: 'accent' | 'primary' | 'secondary' | 'background' | 'transparent';
}

export const CONTAINER_STYLE_PRESETS: Record<string, ContainerStylePreset> = {
  'accent-card': {
    id: 'accent-card',
    name: '🎨 Borde Acento (con Fondo)',
    shortLabel: 'Acento + Fondo',
    borderColorRole: 'accent',
    borderWidthPt: 1.5,
    hasBackground: true,
    backgroundColorRole: 'accent'
  },
  'accent-outline': {
    id: 'accent-outline',
    name: '🎨 Borde Acento (Sin Fondo)',
    shortLabel: 'Acento Línea',
    borderColorRole: 'accent',
    borderWidthPt: 1.5,
    hasBackground: false,
    backgroundColorRole: 'transparent'
  },
  'primary-card': {
    id: 'primary-card',
    name: '🔷 Borde Primario (con Fondo)',
    shortLabel: 'Primario + Fondo',
    borderColorRole: 'primary',
    borderWidthPt: 1,
    hasBackground: true,
    backgroundColorRole: 'primary'
  },
  'primary-outline': {
    id: 'primary-outline',
    name: '🔷 Borde Primario (Sin Fondo)',
    shortLabel: 'Primario Línea',
    borderColorRole: 'primary',
    borderWidthPt: 1,
    hasBackground: false,
    backgroundColorRole: 'transparent'
  },
  'neutral-card': {
    id: 'neutral-card',
    name: '⚪ Borde Neutro (con Fondo)',
    shortLabel: 'Neutro + Fondo',
    borderColorRole: 'border',
    borderWidthPt: 0.8,
    hasBackground: true,
    backgroundColorRole: 'background'
  },
  'neutral-outline': {
    id: 'neutral-outline',
    name: '⚪ Borde Neutro (Sin Fondo)',
    shortLabel: 'Neutro Línea',
    borderColorRole: 'border',
    borderWidthPt: 0.8,
    hasBackground: false,
    backgroundColorRole: 'transparent'
  },
  'clean': {
    id: 'clean',
    name: '✨ Limpio (Sin Borde)',
    shortLabel: 'Limpio',
    borderColorRole: 'transparent',
    borderWidthPt: 0,
    hasBackground: false,
    backgroundColorRole: 'transparent'
  }
};

export function getContainerStyle(styleId?: string): ContainerStylePreset {
  if (!styleId) return CONTAINER_STYLE_PRESETS['primary-outline'];
  return CONTAINER_STYLE_PRESETS[styleId] || CONTAINER_STYLE_PRESETS['primary-outline'];
}

export function getAllContainerStyles(): ContainerStylePreset[] {
  return Object.values(CONTAINER_STYLE_PRESETS);
}
