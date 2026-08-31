import { RecordLayoutTemplate } from '../records/recordSpatialLayoutEngine';

export interface CardDesign {
  id: string;
  name: string;
  borderColorRole: 'primary' | 'secondary' | 'accent' | 'border' | 'transparent';
  borderWidthPt: number;
  borderRadiusPt: number;
  backgroundColorRole: 'background' | 'primary' | 'secondary' | 'accent' | 'transparent';
  titleColorRole: 'primary' | 'secondary' | 'accent' | 'text' | 'textOnPrimary';
  badgeColorRole: 'accent' | 'secondary' | 'primary' | 'transparent';
  titleSizeToken?: 'title' | 'itemTitle' | 'sectionHeading';
  badgeSizeToken?: 'caption' | 'body' | 'itemTitle';
  accentTarget?: 'title' | 'meta-badge' | 'left-rule' | 'icon-only' | 'none';
  layoutTemplate?: RecordLayoutTemplate;
}

export const CARD_DESIGNS: Record<string, CardDesign> = {
  'accent-card': {
    id: 'accent-card',
    name: '🎨 Borde Acento (con Fondo)',
    borderColorRole: 'accent',
    borderWidthPt: 1.5,
    borderRadiusPt: 4,
    backgroundColorRole: 'accent',
    titleColorRole: 'primary',
    badgeColorRole: 'accent',
    titleSizeToken: 'itemTitle',
    badgeSizeToken: 'caption',
    accentTarget: 'title',
  },
  'accent-outline': {
    id: 'accent-outline',
    name: '🎨 Borde Acento (Sin Fondo)',
    borderColorRole: 'accent',
    borderWidthPt: 1.5,
    borderRadiusPt: 4,
    backgroundColorRole: 'transparent',
    titleColorRole: 'primary',
    badgeColorRole: 'accent',
    titleSizeToken: 'itemTitle',
    badgeSizeToken: 'caption',
    accentTarget: 'title',
  },
  'primary-card': {
    id: 'primary-card',
    name: '🔷 Borde Primario (con Fondo)',
    borderColorRole: 'primary',
    borderWidthPt: 1,
    borderRadiusPt: 4,
    backgroundColorRole: 'background',
    titleColorRole: 'primary',
    badgeColorRole: 'primary',
    titleSizeToken: 'itemTitle',
    badgeSizeToken: 'caption',
  },
  'primary-outline': {
    id: 'primary-outline',
    name: '🔷 Borde Primario (Sin Fondo)',
    borderColorRole: 'primary',
    borderWidthPt: 1,
    borderRadiusPt: 4,
    backgroundColorRole: 'transparent',
    titleColorRole: 'primary',
    badgeColorRole: 'primary',
    titleSizeToken: 'itemTitle',
    badgeSizeToken: 'caption',
  },
  'neutral-card': {
    id: 'neutral-card',
    name: '⚪ Borde Neutro (con Fondo)',
    borderColorRole: 'border',
    borderWidthPt: 0.8,
    borderRadiusPt: 4,
    backgroundColorRole: 'background',
    titleColorRole: 'primary',
    badgeColorRole: 'secondary',
    titleSizeToken: 'itemTitle',
    badgeSizeToken: 'caption',
  },
  'neutral-outline': {
    id: 'neutral-outline',
    name: '⚪ Borde Neutro (Sin Fondo)',
    borderColorRole: 'border',
    borderWidthPt: 0.8,
    borderRadiusPt: 4,
    backgroundColorRole: 'transparent',
    titleColorRole: 'primary',
    badgeColorRole: 'secondary',
    titleSizeToken: 'itemTitle',
    badgeSizeToken: 'caption',
  },
  'clean': {
    id: 'clean',
    name: '✨ Limpio (Sin Borde)',
    borderColorRole: 'transparent',
    borderWidthPt: 0,
    borderRadiusPt: 0,
    backgroundColorRole: 'transparent',
    titleColorRole: 'primary',
    badgeColorRole: 'accent',
    titleSizeToken: 'itemTitle',
    badgeSizeToken: 'caption',
  },
  'tarjeta-clasica': {
    id: 'tarjeta-clasica',
    name: 'Tarjeta de Presentación Frente',
    borderColorRole: 'transparent',
    borderWidthPt: 0,
    borderRadiusPt: 0,
    backgroundColorRole: 'background',
    titleColorRole: 'primary',
    badgeColorRole: 'accent',
    titleSizeToken: 'title',
    badgeSizeToken: 'caption',
  }
};
