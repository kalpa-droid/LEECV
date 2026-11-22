import {
  Palette,
  Sliders,
  FileUp,
  Image,
  IdCard,
  FlipHorizontal2,
  QrCode,
} from 'lucide-react';
import type { DockTabItem } from '../../shared/core/studio-host/stepSequenceRegistry';

const CARD_TABS_LARGE: DockTabItem[] = [
  { id: 'diseno', label: 'Diseño & Paleta', icon: Palette, isLarge: true, variant: 'accent' },
];

const CARD_TABS_SMALL: DockTabItem[] = [
  { id: 'card_size', label: 'Tamaño y Corte', icon: Sliders, isLarge: false, variant: 'secondary' },
  { id: 'card_extract', label: 'Extraer datos de CV', icon: FileUp, isLarge: false, variant: 'secondary' },
  { id: 'card_logo', label: 'Logotipo', icon: Image, isLarge: false, variant: 'secondary' },
  { id: 'card_front', label: 'Datos Frente', icon: IdCard, isLarge: false, variant: 'secondary' },
  { id: 'card_back', label: 'Datos Dorso', icon: FlipHorizontal2, isLarge: false, variant: 'secondary' },
  { id: 'card_qr', label: 'QR Interactivo', icon: QrCode, isLarge: false, variant: 'secondary' },
];

export const CARD_STEP_IDS: readonly string[] = [
  ...CARD_TABS_LARGE.map((t) => t.id),
  ...CARD_TABS_SMALL.map((t) => t.id),
];

export function buildCardDockTabs(): DockTabItem[] {
  return [...CARD_TABS_LARGE, ...CARD_TABS_SMALL];
}
