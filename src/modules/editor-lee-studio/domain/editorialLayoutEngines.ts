/**
 * Motores puros de maquetación avanzada para EditorLee (sin React/DOM):
 * - Columnas dobles balanceadas con saltos manuales y elementos de ancho completo
 * - Texto rodeando imágenes (wrap-left / wrap-right) y pares lado a lado
 * - Auto-layout de tablas académicas/empresariales (APA, grilla, cebrada)
 */

import type { EditorialRecord } from './editorialTypes';

export type ColumnBand =
  | { kind: 'full'; record: EditorialRecord }
  | { kind: 'two-col'; left: EditorialRecord[]; right: EditorialRecord[] };

function estimateCharsPerLine(widthPt: number, fontSizePt: number): number {
  const avgCharW = Math.max(3.5, fontSizePt * 0.48);
  return Math.max(18, Math.floor(widthPt / avgCharW));
}

export function estimateRecordHeightPt(
  record: EditorialRecord,
  columnWidthPt: number,
  fontSizePt: number,
  lineHeight: number,
): number {
  const linePt = fontSizePt * lineHeight;
  if (record.type === 'image') {
    const pct = Math.min(100, Math.max(25, record.imageWidthPct ?? 80)) / 100;
    return Math.min(260, columnWidthPt * pct * 0.72) + (record.imageCaption ? 22 : 10);
  }
  if (record.type === 'table') {
    const rowCount = (record.tableRows?.length || 0) + 1;
    return rowCount * 22 + 24;
  }
  const text = String(record.content || '');
  const cpl = estimateCharsPerLine(columnWidthPt, fontSizePt);
  const lines = Math.max(1, Math.ceil(text.length / cpl));
  const extraMargin = record.type === 'subtitle' ? 18 : record.type === 'quote' ? 24 : 10;
  return lines * linePt + extraMargin;
}

/**
 * Reparte los bloques de una sección en bandas de ancho completo (`full`) y
 * bandas de 2 columnas (`two-col`) equilibradas por altura estimada.
 */
export function partitionRecordsIntoColumnBands(
  records: EditorialRecord[],
  options: {
    columns: 1 | 2;
    usableWidthPt: number;
    columnGapPt: number;
    fontSizePt: number;
    lineHeight: number;
    spanHeadingsFullWidth?: boolean;
  },
): ColumnBand[] {
  if (options.columns !== 2) {
    return records.map((record) => ({ kind: 'full', record }));
  }

  const colWidthPt = Math.max(120, (options.usableWidthPt - options.columnGapPt) / 2);
  const bands: ColumnBand[] = [];
  let buffer: EditorialRecord[] = [];

  const flushBuffer = () => {
    if (buffer.length === 0) return;

    const manualBreakIdx = buffer.findIndex((r) => r.forceColumnBreakAfter);
    if (manualBreakIdx >= 0 && manualBreakIdx < buffer.length - 1) {
      bands.push({
        kind: 'two-col',
        left: buffer.slice(0, manualBreakIdx + 1),
        right: buffer.slice(manualBreakIdx + 1),
      });
      buffer = [];
      return;
    }

    if (buffer.length === 1) {
      bands.push({ kind: 'two-col', left: [buffer[0]], right: [] });
      buffer = [];
      return;
    }

    const heights = buffer.map((r) =>
      estimateRecordHeightPt(r, colWidthPt, options.fontSizePt, options.lineHeight),
    );
    const totalH = heights.reduce((a, b) => a + b, 0);
    let accLeft = 0;
    let splitIdx = 1;
    let bestDiff = Infinity;

    for (let i = 1; i < buffer.length; i++) {
      accLeft += heights[i - 1];
      const diff = Math.abs(accLeft - (totalH - accLeft));
      if (diff < bestDiff) {
        bestDiff = diff;
        splitIdx = i;
      }
    }

    bands.push({
      kind: 'two-col',
      left: buffer.slice(0, splitIdx),
      right: buffer.slice(splitIdx),
    });
    buffer = [];
  };

  for (const rec of records) {
    const isFull =
      rec.spanFullWidth === true ||
      (options.spanHeadingsFullWidth !== false && rec.type === 'subtitle' && (rec.subtitleLevel ?? 2) <= 2) ||
      (rec.type === 'table' && (rec.tableHeaders?.length || 0) >= 4) ||
      (rec.type === 'image' &&
        (rec.imageLayoutMode === 'full-width' || rec.imageLayoutMode === 'pair-side-by-side'));

    if (isFull) {
      flushBuffer();
      bands.push({ kind: 'full', record: rec });
    } else {
      buffer.push(rec);
    }
  }

  flushBuffer();
  return bands;
}

/**
 * Divide un texto en dos tramos (`sideText` al costado de la imagen y `belowText` debajo)
 * para simular el ajuste "Cuadrado / Estrecho" de Word en `@react-pdf/renderer`.
 */
export function splitTextAroundImage(
  text: string,
  config: {
    usableWidthPt: number;
    imageWidthPct: number;
    imageAspectRatio?: number;
    gapPt: number;
    fontSizePt: number;
    lineHeight: number;
    manualLineAdjust?: number;
  },
): {
  sideText: string;
  belowText: string;
  imageWidthPt: number;
  sideColumnWidthPt: number;
} {
  const pct = Math.min(75, Math.max(20, config.imageWidthPct || 45)) / 100;
  const imageWidthPt = Math.round(config.usableWidthPt * pct);
  const sideColumnWidthPt = Math.max(90, config.usableWidthPt - imageWidthPt - config.gapPt);
  const ratio = config.imageAspectRatio && config.imageAspectRatio > 0 ? config.imageAspectRatio : 0.72;
  const estImgHeightPt = Math.min(260, imageWidthPt * ratio) + 16;

  const linePt = Math.max(10, config.fontSizePt * config.lineHeight);
  const baseLines = Math.max(2, Math.ceil(estImgHeightPt / linePt) + (config.manualLineAdjust || 0));
  const cpl = estimateCharsPerLine(sideColumnWidthPt, config.fontSizePt);
  const targetChars = baseLines * cpl;

  const clean = String(text || '').trim();
  if (!clean || clean.length <= targetChars) {
    return { sideText: clean, belowText: '', imageWidthPt, sideColumnWidthPt };
  }

  let cut = clean.lastIndexOf(' ', targetChars);
  if (cut < Math.floor(targetChars * 0.5)) {
    cut = targetChars;
  }

  return {
    sideText: clean.slice(0, cut).trim(),
    belowText: clean.slice(cut).trim(),
    imageWidthPt,
    sideColumnWidthPt,
  };
}

/**
 * Calcula anchos porcentuales óptimos y alineación automática por columna
 * según el contenido real de encabezados y celdas.
 */
export function computeOptimalTableLayout(
  headers: string[],
  rows: string[][],
  options?: { sectionColumns?: 1 | 2 },
): {
  colWidthsPct: number[];
  colAlignments: ('left' | 'center' | 'right')[];
  suggestedFontSizePt: number;
  suggestSpanFullWidth: boolean;
} {
  const colCount = Math.max(
    headers.length,
    ...rows.map((r) => (Array.isArray(r) ? r.length : 0)),
    1,
  );

  const weights: number[] = [];
  const colAlignments: ('left' | 'center' | 'right')[] = [];

  for (let c = 0; c < colCount; c++) {
    const headerLen = String(headers[c] || '').trim().length;
    const cellValues = rows.map((r) => String(r?.[c] || '').trim()).filter(Boolean);
    const maxCellLen = cellValues.reduce((m, v) => Math.max(m, v.length), 0);
    const avgCellLen =
      cellValues.length > 0
        ? cellValues.reduce((acc, v) => acc + v.length, 0) / cellValues.length
        : 4;

    const numericCount = cellValues.filter((v) =>
      /^[$€+-]?\s*\d+([.,]\d+)?\s*%?$/.test(v),
    ).length;
    const isNumericCol = cellValues.length > 0 && numericCount >= cellValues.length * 0.7;

    colAlignments.push(isNumericCol ? 'right' : 'left');
    const score = Math.max(6, Math.min(48, Math.max(headerLen, avgCellLen * 0.75 + maxCellLen * 0.25)));
    weights.push(score);
  }

  const totalWeight = weights.reduce((a, b) => a + b, 0) || colCount;
  const rawPcts = weights.map((w) => Math.max(10, Math.round((w / totalWeight) * 100)));
  const sum = rawPcts.reduce((a, b) => a + b, 0);
  if (rawPcts.length > 0 && sum !== 100) {
    const maxIdx = rawPcts.indexOf(Math.max(...rawPcts));
    rawPcts[maxIdx] = Math.max(10, rawPcts[maxIdx] + (100 - sum));
  }

  return {
    colWidthsPct: rawPcts,
    colAlignments,
    suggestedFontSizePt: colCount >= 6 ? 8.5 : colCount >= 4 ? 9.5 : 10,
    suggestSpanFullWidth: options?.sectionColumns === 2 && colCount >= 4,
  };
}
