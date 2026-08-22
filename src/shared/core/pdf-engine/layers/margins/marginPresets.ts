/**
 * CAPA 1 — MÁRGENES
 * Depende SOLO de la Capa 0 (PageSize). Un margen nunca sabe qué columnas
 * o qué objetos va a haber adentro — solo recorta el rectángulo útil.
 */

import { PageSize } from '../page/pageSizes';

export interface MarginPreset {
  id: string;
  name: string;
  /** En mm. Puede ser fijo o un % de la página — ambos casos se resuelven a mm en resolveMargins */
  top: number | { percentOfHeight: number };
  bottom: number | { percentOfHeight: number };
  left: number | { percentOfWidth: number };
  right: number | { percentOfWidth: number };
}

export interface ResolvedMargins {
  topMm: number; bottomMm: number; leftMm: number; rightMm: number;
  topPt: number; bottomPt: number; leftPt: number; rightPt: number;
}

export interface UsableArea {
  widthMm: number;
  heightMm: number;
  widthPt: number;
  heightPt: number;
  margins: ResolvedMargins;
}

export const MARGIN_PRESETS: Record<string, MarginPreset> = {
  documento_estandar: { id: 'documento_estandar', name: 'Documento estándar', top: 12, bottom: 12, left: 12, right: 12 },
  documento_amplio: { id: 'documento_amplio', name: 'Documento con aire', top: 18, bottom: 18, left: 16, right: 16 },
  tarjeta_ajustada: { id: 'tarjeta_ajustada', name: 'Tarjeta al borde', top: 3, bottom: 3, left: 3, right: 3 },
};

function resolveSide(value: number | { percentOfHeight: number } | { percentOfWidth: number }, refMm: number): number {
  if (typeof value === 'number') return value;
  if ('percentOfHeight' in value) return refMm * value.percentOfHeight;
  return refMm * value.percentOfWidth;
}

/** Capa 0 (página) + Capa 1 (preset de margen) → área útil real, en mm y en pt */
export function resolveMargins(page: PageSize, preset: MarginPreset): UsableArea {
  const topMm = resolveSide(preset.top, page.heightMm);
  const bottomMm = resolveSide(preset.bottom, page.heightMm);
  const leftMm = resolveSide(preset.left, page.widthMm);
  const rightMm = resolveSide(preset.right, page.widthMm);

  const mmToPt = (mm: number) => Math.round(mm * 2.8346);

  return {
    widthMm: page.widthMm - leftMm - rightMm,
    heightMm: page.heightMm - topMm - bottomMm,
    widthPt: page.widthPt - mmToPt(leftMm) - mmToPt(rightMm),
    heightPt: page.heightPt - mmToPt(topMm) - mmToPt(bottomMm),
    margins: {
      topMm, bottomMm, leftMm, rightMm,
      topPt: mmToPt(topMm), bottomPt: mmToPt(bottomMm), leftPt: mmToPt(leftMm), rightPt: mmToPt(rightMm),
    },
  };
}
