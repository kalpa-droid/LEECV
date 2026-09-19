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
  a4: definePageSize({ id: 'a4', name: 'A4', widthMm: 210, heightMm: 297, label: 'Hoja común (la de tu impresora)', category: 'documento' }),
  a3: definePageSize({ id: 'a3', name: 'A3', widthMm: 297, heightMm: 420, label: 'Hoja grande (para imprenta)', category: 'documento' }),
  a5: definePageSize({ id: 'a5', name: 'A5', widthMm: 148, heightMm: 210, label: 'Media hoja común', category: 'documento' }),
  carta: definePageSize({ id: 'carta', name: 'Carta', widthMm: 216, heightMm: 279, label: 'Hoja carta', category: 'documento' }),
  legal: definePageSize({ id: 'legal', name: 'Legal', widthMm: 216, heightMm: 356, label: 'Hoja legal', category: 'documento' }),
  oficio: definePageSize({ id: 'oficio', name: 'Oficio', widthMm: 216, heightMm: 330, label: 'Hoja oficio', category: 'documento' }),
  tarjeta_estandar: definePageSize({ id: 'tarjeta_estandar', name: 'Estándar AR/US', widthMm: 89, heightMm: 51, label: 'Clásica (Argentina / EE. UU.)', category: 'tarjeta' }),
  tarjeta_europea: definePageSize({ id: 'tarjeta_europea', name: 'Europea', widthMm: 85, heightMm: 54, label: 'Europea', category: 'tarjeta' }),
  tarjeta_japonesa: definePageSize({ id: 'tarjeta_japonesa', name: 'Japonesa (Meishi)', widthMm: 91, heightMm: 55, label: 'Japonesa (Meishi)', category: 'tarjeta' }),
  tarjeta_china: definePageSize({ id: 'tarjeta_china', name: 'China / HK / SG', widthMm: 90, heightMm: 54, label: 'China / Hong Kong / Singapur', category: 'tarjeta' }),
  tarjeta_brasilera: definePageSize({ id: 'tarjeta_brasilera', name: 'Brasil / MX / LATAM', widthMm: 90, heightMm: 50, label: 'Brasil / México', category: 'tarjeta' }),
  tarjeta_cuadrada: definePageSize({ id: 'tarjeta_cuadrada', name: 'Cuadrada', widthMm: 65, heightMm: 65, label: 'Cuadrada', category: 'tarjeta' }),
  tarjeta_mini: definePageSize({ id: 'tarjeta_mini', name: 'Mini', widthMm: 70, heightMm: 28, label: 'Mini', category: 'tarjeta' }),
  afiche_a3: definePageSize({ id: 'afiche_a3', name: 'Afiche grande', widthMm: 297, heightMm: 420, label: 'Hoja grande (para imprenta)', category: 'afiche' }),
};

export function getPageSize(id: string): PageSize {
  return PAGE_SIZES[id] || PAGE_SIZES.a4;
}

/** Tarjeta con medida personalizada (mm exactos) — NO se guarda en el registro
 * global: es un objeto, propio de este documento, no un estándar de hoja física. */
export function makeCustomCardSize(widthMm: number, heightMm: number): PageSize {
  return definePageSize({
    id: 'tarjeta_personalizada', name: 'Personalizada',
    widthMm, heightMm, label: `Personalizada (${widthMm} × ${heightMm} mm)`, category: 'tarjeta'
  });
}

const MM_TO_PX_AT_96DPI = 3.779527559;

/**
 * Convierte el tamaño físico de lienzo ya definido (la única fuente de verdad)
 * a píxeles CSS a 96 DPI para que los visores lo utilicen sin declarar medidas propias.
 */
export function resolveDocumentCanvasPx(pageSizeId: string = 'a4'): { widthPx: number; heightPx: number } {
  const size = getPageSize(pageSizeId);
  return {
    widthPx: Math.round(size.widthMm * MM_TO_PX_AT_96DPI),
    heightPx: Math.round(size.heightMm * MM_TO_PX_AT_96DPI)
  };
}
