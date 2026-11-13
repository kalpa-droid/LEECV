/**
 * Ordenamiento espacial de la capa de texto de una página de PDF (PDF.js TextItem).
 *
 * Problema que resuelve: `items.map(i => i.str).join(' ')` borra los saltos de línea y
 * mezcla columnas. Este módulo reconstruye el texto en orden de lectura real:
 *   1. Agrupa ítems por renglón usando la coordenada y (baseline) con tolerancia
 *      proporcional a la altura de fuente.
 *   2. Detecta si la página tiene 2 columnas mediante una franja vertical vacía
 *      persistente (el "gutter") que separa bloques de texto en varios renglones.
 *   3. Decide el modo óptimo por página:
 *      - 'text'   → texto coherente en 1 columna (barato, sin imagen).
 *      - 'hybrid' → texto coherente CON 2 columnas/diseños visuales → la IA ve la
 *                   imagen y recibe el texto reconstruido por bloques como ancla
 *                   exacta de emails, DNI, CUIT, teléfonos y fechas.
 *      - 'image'  → sin capa de texto utilizable (escaneado, curvas, encoding roto).
 *
 * Módulo puro (sin DOM): fácil de testear en node. Las funciones de render
 * viven en `pageImageEncoder.ts`.
 */

import { isTextLayerCoherent } from './textCoherenceHeuristic';

/** Subconjunto de PDF.js TextItem que este módulo necesita (compatible con `any` de pdfjs-dist). */
export interface PdfTextItemLike {
  str: string;
  transform: number[] | ArrayLike<number>;
  width?: number;
  height?: number;
  hasEOL?: boolean;
}

interface NormalizedSpan {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hasEOL: boolean;
}

export interface AnalyzedPage {
  mode: 'text' | 'hybrid' | 'image';
  /** Texto reconstruido en orden de lectura (renglones separados por \n). */
  text: string;
  multiColumn: boolean;
  /** Franja vertical vacía detectada entre columnas (unidades de PDF, escala 1). */
  columnGutter?: { start: number; end: number };
  columnCount: 1 | 2;
  alphaRatio: number;
}

const MIN_GLYPHS_FOR_SPAN = 1;

function normalizeItems(items: readonly PdfTextItemLike[]): NormalizedSpan[] {
  const spans: NormalizedSpan[] = [];
  for (const item of items || []) {
    if (!item || typeof item.str !== 'string') continue;
    const str = item.str;
    if (!str.trim()) continue;
    if (str.replace(/\s/g, '').length < MIN_GLYPHS_FOR_SPAN) continue;

    const t = item.transform;
    if (!t || t.length < 6) continue;
    const x = Number(t[4]);
    const y = Number(t[5]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    const height = Math.abs(Number(item.height ?? (Number(t[3]) || Number(t[0])))) || 10;
    const width = Number.isFinite(item.width as number)
      ? Math.max(0, Number(item.width))
      : Math.max(1, height * str.length * 0.55);

    spans.push({ str, x, y, width, height, hasEOL: !!item.hasEOL });
  }
  return spans;
}

function median(values: number[]): number {
  if (values.length === 0) return 10;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

interface RowGroup {
  y: number;
  spans: NormalizedSpan[];
}

/** Agrupa spans en renglones de arriba hacia abajo (y PDF crece hacia arriba). */
function groupRows(spans: NormalizedSpan[]): RowGroup[] {
  const tol = Math.max(2, median(spans.map(s => s.height)) * 0.6);
  const sorted = [...spans].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: RowGroup[] = [];

  for (const span of sorted) {
    const current = rows.length > 0 ? rows[rows.length - 1] : null;
    if (current && Math.abs(current.y - span.y) <= tol && !(current.spans.length > 0 && current.spans[current.spans.length - 1].hasEOL)) {
      current.spans.push(span);
      current.y = (current.y * (current.spans.length - 1) + span.y) / current.spans.length;
    } else {
      rows.push({ y: span.y, spans: [span] });
    }
  }

  for (const row of rows) {
    row.spans.sort((a, b) => a.x - b.x);
  }
  return rows;
}

function rowsToText(rows: RowGroup[], averageFontHeight: number): string {
  const blockGap = averageFontHeight * 2.2;
  const lines: string[] = [];
  let previousY: number | null = null;

  for (const row of rows) {
    if (previousY !== null && previousY - row.y > blockGap) {
      lines.push(''); // separación de bloque/sección
    }
    lines.push(row.spans.map(s => s.str).join(' ').replace(/\s+/g, ' ').trim());
    previousY = row.y;
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

interface ColumnGutter {
  start: number;
  end: number;
}

/**
 * Busca una franja vertical vacía (sin texto) de al menos `minWidth` unidades,
 * situada dentro del 20%–80% del ancho de página, con al menos `minRowsPerSide`
 * renglones con texto a cada lado. Devuelve la franja más ancha que califica.
 */
export function findColumnGutter(
  items: readonly PdfTextItemLike[],
  pageWidth: number,
  minRowsPerSide = 3
): ColumnGutter | null {
  const spans = normalizeItems(items).filter(s => /\p{L}|\d/u.test(s.str));
  if (spans.length < minRowsPerSide * 2 || pageWidth <= 0) return null;

  // Intervalos de cobertura horizontal, fusionados
  const intervals = spans
    .map(s => [Math.max(0, s.x), Math.min(pageWidth, s.x + s.width)] as [number, number])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);

  const merged: Array<[number, number]> = [];
  for (const [a, b] of intervals) {
    const last = merged[merged.length - 1];
    if (last && a <= last[1] + 2) {
      last[1] = Math.max(last[1], b);
    } else {
      merged.push([a, b]);
    }
  }

  // Franjas vacías entre coberturas consecutivas (incluye bordes de página)
  const gaps: Array<[number, number]> = [];
  let cursor = 0;
  for (const [a, b] of merged) {
    if (a > cursor) gaps.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < pageWidth) gaps.push([cursor, pageWidth]);

  const minWidth = Math.max(0.045 * pageWidth, 14);
  let best: ColumnGutter | null = null;

  for (const [start, end] of gaps) {
    if (end - start < minWidth) continue;
    const center = (start + end) / 2;
    if (center < 0.2 * pageWidth || center > 0.8 * pageWidth) continue;

    const left = spans.filter(s => s.x + s.width <= start + 1);
    const right = spans.filter(s => s.x >= end - 1);
    if (left.length === 0 || right.length === 0) continue;

    const leftRows = groupRows(left).length;
    const rightRows = groupRows(right).length;
    if (leftRows >= minRowsPerSide && rightRows >= minRowsPerSide) {
      if (!best || end - start > best.end - best.start) {
        best = { start, end };
      }
    }
  }

  return best;
}

/** Texto en orden de lectura normal (una columna), con saltos de línea. */
export function reconstructText(items: readonly PdfTextItemLike[]): string {
  const spans = normalizeItems(items);
  if (spans.length === 0) return '';
  const avgHeight = median(spans.map(s => s.height));
  return rowsToText(groupRows(spans), avgHeight);
}

/** Texto por bloques: primero toda la columna izquierda, después la derecha. */
export function reconstructColumnText(items: readonly PdfTextItemLike[], gutter: ColumnGutter): string {
  const spans = normalizeItems(items);
  if (spans.length === 0) return '';
  const avgHeight = median(spans.map(s => s.height));

  const left = spans.filter(s => s.x + s.width <= gutter.start + 1 || (s.x < gutter.start && s.x + s.width <= gutter.end));
  const leftSet = new Set(left);
  const right = spans.filter(s => !leftSet.has(s));

  const leftText = rowsToText(groupRows(left), avgHeight);
  const rightText = rowsToText(groupRows(right), avgHeight);
  return [leftText, rightText].filter(Boolean).join('\n\n');
}

function computeAlphaRatio(text: string): number {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length === 0) return 0;
  const letters = (clean.match(/\p{L}/gu) || []).length;
  return letters / clean.length;
}

/**
 * Analiza una página del PDF y decide el modo de extracción óptimo.
 * `pageWidth`/`pageHeight` en unidades de PDF sin escalar (getViewport({ scale: 1 })).
 */
export function analyzePdfPage(
  items: readonly PdfTextItemLike[],
  pageWidth: number,
  _pageHeight?: number
): AnalyzedPage {
  const spans = normalizeItems(items);
  const fallback: AnalyzedPage = {
    mode: 'image',
    text: '',
    multiColumn: false,
    columnCount: 1,
    alphaRatio: 0,
  };

  if (spans.length === 0) return fallback;

  const singleColumnText = reconstructText(items);
  const alphaRatio = computeAlphaRatio(singleColumnText);

  if (!isTextLayerCoherent(singleColumnText)) {
    return { ...fallback, text: singleColumnText, alphaRatio };
  }

  const gutter = findColumnGutter(items, pageWidth);
  if (gutter) {
    return {
      mode: 'hybrid',
      text: reconstructColumnText(items, gutter),
      multiColumn: true,
      columnGutter: gutter,
      columnCount: 2,
      alphaRatio,
    };
  }

  return {
    mode: 'text',
    text: singleColumnText,
    multiColumn: false,
    columnCount: 1,
    alphaRatio,
  };
}
