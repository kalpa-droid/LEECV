// src/shared/core/pdf-engine/layers/cardObject/cardObjectSchema.ts
//
// La TARJETA es un objeto del núcleo (no algo hecho a mano por el usuario
// con un editor libre): tiene medidas configurables porque va DENTRO de una
// hoja fija (A4/A3/etc.), a diferencia de la hoja que nunca cambia.
//
// Medidas estándar reales de la industria (para que "cuántas entran por
// hoja" sea un número que coincide con lo que da cualquier imprenta):

export interface CardSizeStandard {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
}

export const CARD_SIZE_STANDARDS: CardSizeStandard[] = [
  { id: 'estandar_ar_us', label: 'Estándar (85 × 55 mm) — más común AR/US', widthMm: 85, heightMm: 55 },
  { id: 'europea', label: 'Europea (85 × 54 mm)', widthMm: 85, heightMm: 54 },
  { id: 'cuadrada', label: 'Cuadrada (65 × 65 mm)', widthMm: 65, heightMm: 65 },
  { id: 'mini', label: 'Mini (70 × 28 mm)', widthMm: 70, heightMm: 28 },
];

export interface CardObjectConfig {
  sizeId: string;          // uno de CARD_SIZE_STANDARDS['id'], o 'personalizado'
  widthMm: number;
  heightMm: number;
  /**
   * Sangrado — mm extra donde el fondo/color se extiende MÁS ALLÁ del corte
   * final. Estándar de imprenta: 2-3mm. Es fijo y comprobado, no lo edita
   * nadie a mano (evita que alguien ponga 0 sin darse cuenta y le queden
   * bordes blancos al cortar).
   */
  bleedMm: number;
  /** Espacio entre tarjetas adyacentes en la hoja (ver por qué abajo) */
  gutterMm: number;
}

export const DEFAULT_CARD_BLEED_MM = 3;
// El gutter (separación entre tarjetas) es 2x el sangrado: así el sangrado
// de una tarjeta y el de la de al lado se "tocan" en la mitad del gutter, y
// un solo corte sirve para las dos — es la convención real de imprenta.
export const DEFAULT_CARD_GUTTER_MM = DEFAULT_CARD_BLEED_MM * 2;

export function resolveCardSize(sizeId: string, customWidthMm?: number, customHeightMm?: number): CardObjectConfig {
  const standard = CARD_SIZE_STANDARDS.find(s => s.id === sizeId);
  const widthMm = standard ? standard.widthMm : (customWidthMm ?? 85);
  const heightMm = standard ? standard.heightMm : (customHeightMm ?? 55);

  return {
    sizeId,
    widthMm,
    heightMm,
    bleedMm: DEFAULT_CARD_BLEED_MM,
    gutterMm: DEFAULT_CARD_GUTTER_MM,
  };
}
