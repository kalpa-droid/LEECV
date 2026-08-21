/**
 * CAPA 7 — IMPOSICIÓN (N-UP / AUTO-REPEAT)
 * Depende de la Capa 0 (tamaño de hoja) + Capa 6 (caja con sangrado). No sabe
 * nada de contenido — es matemática pura: cuántas copias del "bleed box"
 * entran en la hoja, centradas, con separación entre ellas (gutter) y
 * márgenes de hoja para que la impresora no recorte por los bordes no
 * imprimibles.
 */

import { PageSize } from '../page/pageSizes';
import { BleedBox } from '../bleed/bleedSpec';

export interface ImpositionSpec {
  /** Margen de hoja: zona que ninguna impresora garantiza poder imprimir */
  sheetMarginMm: number;
  /** Separación entre tarjetas, útil como zona de corte compartida */
  gutterMm: number;
}

export const IMPOSITION_PRESETS: Record<string, ImpositionSpec> = {
  // 5mm es el margen no imprimible típico de una impresora de oficina A4/A3.
  impresora_oficina: { sheetMarginMm: 5, gutterMm: 4 },
  // Solo válido si la impresora del usuario admite impresión "borderless" real
  // (la mayoría de las hogareñas NO) — la UI debe advertir esto explícitamente.
  sin_margen_borderless: { sheetMarginMm: 0, gutterMm: 4 },
};

export interface PlacedCard {
  row: number;
  col: number;
  /** Posición en mm de la esquina superior izquierda del BLEED box (no del corte) */
  xMm: number;
  yMm: number;
}

export interface CropMark {
  /** Segmento de línea, en mm, relativo a la hoja completa */
  x1: number; y1: number; x2: number; y2: number;
}

export interface ImpositionResult {
  cols: number;
  rows: number;
  totalPerSheet: number;
  cards: PlacedCard[];
  cropMarks: CropMark[];
}

const CROP_MARK_LENGTH_MM = 3;
const CROP_MARK_GAP_MM = 1; // separación entre la marca y el borde de corte real

/** Capa 0 (hoja) + Capa 6 (bleed box) + Capa 7 (spec de imposición) → grilla resuelta */
export function resolveImposition(sheet: PageSize, bleedBox: BleedBox, spec: ImpositionSpec): ImpositionResult {
  const usableWidthMm = sheet.widthMm - spec.sheetMarginMm * 2;
  const usableHeightMm = sheet.heightMm - spec.sheetMarginMm * 2;

  const cellWidthMm = bleedBox.bleedWidthMm + spec.gutterMm;
  const cellHeightMm = bleedBox.bleedHeightMm + spec.gutterMm;

  const cols = Math.max(1, Math.floor((usableWidthMm + spec.gutterMm) / cellWidthMm));
  const rows = Math.max(1, Math.floor((usableHeightMm + spec.gutterMm) / cellHeightMm));

  // Centrar la grilla completa en la hoja (no pegarla a una esquina).
  const gridWidthMm = cols * bleedBox.bleedWidthMm + (cols - 1) * spec.gutterMm;
  const gridHeightMm = rows * bleedBox.bleedHeightMm + (rows - 1) * spec.gutterMm;
  const startXMm = (sheet.widthMm - gridWidthMm) / 2;
  const startYMm = (sheet.heightMm - gridHeightMm) / 2;

  const cards: PlacedCard[] = [];
  const cropMarks: CropMark[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const xMm = startXMm + col * (bleedBox.bleedWidthMm + spec.gutterMm);
      const yMm = startYMm + row * (bleedBox.bleedHeightMm + spec.gutterMm);
      cards.push({ row, col, xMm, yMm });

      // Línea de corte real de esta tarjeta (borde del trim, no del bleed).
      const trimX1 = xMm + bleedBox.trimOffsetMm.x;
      const trimY1 = yMm + bleedBox.trimOffsetMm.y;
      const trimX2 = trimX1 + bleedBox.trim.trimWidthMm;
      const trimY2 = trimY1 + bleedBox.trim.trimHeightMm;

      // 4 esquinas x 2 marcas (una horizontal, una vertical) = 8 marcas por tarjeta,
      // cada una empieza un poco AFUERA del borde de corte (CROP_MARK_GAP_MM) y se
      // aleja hacia el gutter — así nunca pisan el diseño ni la zona de sangrado.
      const corners = [
        { cx: trimX1, cy: trimY1, dx: -1, dy: -1 },
        { cx: trimX2, cy: trimY1, dx: 1, dy: -1 },
        { cx: trimX1, cy: trimY2, dx: -1, dy: 1 },
        { cx: trimX2, cy: trimY2, dx: 1, dy: 1 },
      ];
      corners.forEach(({ cx, cy, dx, dy }) => {
        cropMarks.push({
          x1: cx + dx * CROP_MARK_GAP_MM, y1: cy,
          x2: cx + dx * (CROP_MARK_GAP_MM + CROP_MARK_LENGTH_MM), y2: cy
        });
        cropMarks.push({
          x1: cx, y1: cy + dy * CROP_MARK_GAP_MM,
          x2: cx, y2: cy + dy * (CROP_MARK_GAP_MM + CROP_MARK_LENGTH_MM)
        });
      });
    }
  }

  return { cols, rows, totalPerSheet: cards.length, cards, cropMarks };
}

/**
 * CAPA 8 (parte 1) — DORSO / DUPLEX
 * La mayoría de las impresoras con dúplex automático voltean la hoja sobre su
 * EJE LARGO (el default más común en documentos verticales). Para que el
 * reverso de cada tarjeta quede alineado exactamente detrás de su frente, la
 * grilla del dorso tiene que reflejarse en espejo HORIZONTAL (la tarjeta que
 * queda más a la derecha en el frente pasa a la izquierda en el dorso).
 *
 * Si la impresora del usuario voltea por el EJE CORTO en cambio, el espejo
 * correcto es vertical — por eso el modo es un parámetro explícito, no algo
 * fijo. La UI debe exponer esto como "¿tu impresora voltea por el lado largo
 * o el lado corto?" con el largo como default, y una tarjeta de prueba de una
 * sola hoja antes de imprimir un lote grande — el comportamiento real
 * depende del driver de cada impresora y no se puede verificar sin imprimir.
 */
export function mirrorImpositionForBackSide(
  imposition: ImpositionResult,
  sheet: PageSize,
  bleedBox: BleedBox,
  mode: 'eje_largo' | 'eje_corto' = 'eje_largo'
): ImpositionResult {
  if (mode === 'eje_largo') {
    // Espejo horizontal de toda la hoja: x' = anchoHoja - x - anchoBleedBox
    const mirrorX = (xMm: number) => sheet.widthMm - xMm - bleedBox.bleedWidthMm;

    return {
      ...imposition,
      cards: imposition.cards.map((c) => ({ ...c, col: imposition.cols - 1 - c.col, xMm: mirrorX(c.xMm) })),
      cropMarks: imposition.cropMarks.map((m) => ({
        x1: sheet.widthMm - m.x1, y1: m.y1, x2: sheet.widthMm - m.x2, y2: m.y2
      }))
    };
  }

  // Eje corto: espejo vertical de toda la hoja.
  const mirrorY = (yMm: number) => sheet.heightMm - yMm - bleedBox.bleedHeightMm;
  return {
    ...imposition,
    cards: imposition.cards.map((c) => ({ ...c, row: imposition.rows - 1 - c.row, yMm: mirrorY(c.yMm) })),
    cropMarks: imposition.cropMarks.map((m) => ({
      x1: m.x1, y1: sheet.heightMm - m.y1, x2: m.x2, y2: sheet.heightMm - m.y2
    }))
  };
}
