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
}

export const CARD_DESIGNS: Record<string, CardDesign> = {
  'accent-card': {
    id: 'accent-card',
    name: 'Borde de Acento (Formación / Destacados)',
    borderColorRole: 'accent',
    borderWidthPt: 1.5,
    borderRadiusPt: 4,
    backgroundColorRole: 'transparent',
    titleColorRole: 'primary',
    badgeColorRole: 'accent',
    titleSizeToken: 'itemTitle',
    badgeSizeToken: 'caption',
  },
  'primary-card': {
    id: 'primary-card',
    name: 'Borde Primario (Experiencia / Puestos)',
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
    name: 'Borde Neutro Sutil',
    borderColorRole: 'border',
    borderWidthPt: 0.8,
    borderRadiusPt: 4,
    backgroundColorRole: 'transparent',
    titleColorRole: 'primary',
    badgeColorRole: 'secondary',
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
