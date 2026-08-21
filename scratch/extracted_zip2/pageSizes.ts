/**
 * CAPA 0 — PÁGINA
 * Única fuente de verdad del tamaño físico del lienzo. Nada de esto sabe
 * qué se va a dibujar adentro — solo define el rectángulo de partida.
 */

export interface PageSize {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  /** Puntos PDF (1mm = 2.8346pt) — lo que realmente consume @react-pdf/renderer */
  widthPt: number;
  heightPt: number;
  label: string;
  /** Familia: sirve para que un preset filtre qué tamaños tienen sentido para él */
  category: 'documento' | 'tarjeta' | 'afiche';
}

function mmToPt(mm: number) {
  return Math.round(mm * 2.8346);
}

function definePageSize(input: Omit<PageSize, 'widthPt' | 'heightPt'>): PageSize {
  return { ...input, widthPt: mmToPt(input.widthMm), heightPt: mmToPt(input.heightMm) };
}

export const PAGE_SIZES: Record<string, PageSize> = {
  a4: definePageSize({ id: 'a4', name: 'A4', widthMm: 210, heightMm: 297, label: 'A4 (210 × 297 mm)', category: 'documento' }),
  carta: definePageSize({ id: 'carta', name: 'Carta', widthMm: 216, heightMm: 279, label: 'Carta (216 × 279 mm)', category: 'documento' }),
  legal: definePageSize({ id: 'legal', name: 'Legal', widthMm: 216, heightMm: 356, label: 'Legal (216 × 356 mm)', category: 'documento' }),
  oficio: definePageSize({ id: 'oficio', name: 'Oficio', widthMm: 216, heightMm: 330, label: 'Oficio (216 × 330 mm)', category: 'documento' }),
  tarjeta_estandar: definePageSize({ id: 'tarjeta_estandar', name: 'Tarjeta personal', widthMm: 89, heightMm: 51, label: 'Tarjeta (89 × 51 mm)', category: 'tarjeta' }),
  afiche_a3: definePageSize({ id: 'afiche_a3', name: 'Afiche A3', widthMm: 297, heightMm: 420, label: 'A3 (297 × 420 mm)', category: 'afiche' }),
};

export function getPageSize(id: string): PageSize {
  return PAGE_SIZES[id] || PAGE_SIZES.a4;
}
