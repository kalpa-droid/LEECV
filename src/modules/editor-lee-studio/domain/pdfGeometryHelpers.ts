/**
 * Algoritmos geométricos puros para desarme de PDFs editoriales (`pdfGeometryHelpers.ts`):
 * - Agrupación tipográfica de spans en renglones con tamaño (pt), negrita, cursiva y centrado.
 * - Limpieza de encabezados/pies repetidos en páginas consecutivas y números de página sueltos.
 * - Lectura XY-Cut multi-columna preservando banners a ancho completo.
 * - Detección de tablas geométricas por alineación de columnas X.
 * - Seguimiento de matriz CTM sobre `page.getOperatorList()` para localizar imágenes y clústeres de diagramas vectoriales.
 */

export interface RawPdfTextItem {
  str: string;
  transform: number[] | ArrayLike<number>;
  width?: number;
  height?: number;
  fontName?: string;
  hasEOL?: boolean;
}

export interface PdfFontStyleMeta {
  bold: boolean;
  italic: boolean;
}

export interface PdfRichSpan {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  bold: boolean;
  italic: boolean;
  hasEOL: boolean;
}

export interface PdfRichLine {
  y: number;
  xMin: number;
  xMax: number;
  fontSizePt: number;
  bold: boolean;
  italic: boolean;
  centered: boolean;
  text: string;
  spans: PdfRichSpan[];
}

export interface NormalizedBbox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
  kind: 'image' | 'diagram';
}

export function medianNumber(values: number[], fallback = 11): number {
  if (!values.length) return fallback;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function normalizePdfRichSpans(
  items: readonly RawPdfTextItem[],
  fontStyles?: Record<string, PdfFontStyleMeta>,
): PdfRichSpan[] {
  const spans: PdfRichSpan[] = [];
  for (const item of items || []) {
    if (!item || typeof item.str !== 'string') continue;
    if (!item.str.trim()) continue;
    const t = item.transform;
    if (!t || t.length < 6) continue;
    const x = Number(t[4]);
    const y = Number(t[5]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    const scaleY = Math.hypot(Number(t[2]) || 0, Number(t[3]) || 0);
    const height = Math.abs(Number(item.height) || scaleY) || 10;
    const width = Number.isFinite(item.width as number)
      ? Math.max(0, Number(item.width))
      : Math.max(1, height * item.str.length * 0.52);

    const fontName = String(item.fontName || '');
    const styleMeta = fontName ? fontStyles?.[fontName] : undefined;
    const bold = Boolean(styleMeta?.bold || /bold|black|heavy|semibold|demi/i.test(fontName));
    const italic = Boolean(styleMeta?.italic || /italic|oblique|slant/i.test(fontName));

    spans.push({ str: item.str, x, y, width, height, bold, italic, hasEOL: Boolean(item.hasEOL) });
  }
  return spans;
}

export function groupSpansIntoRichLines(
  spans: PdfRichSpan[],
  pageWidth: number,
): PdfRichLine[] {
  if (!spans.length) return [];
  const tol = Math.max(2, medianNumber(spans.map((s) => s.height), 11) * 0.55);
  const sorted = [...spans].sort((a, b) => b.y - a.y || a.x - b.x);
  const groups: Array<{ y: number; spans: PdfRichSpan[] }> = [];

  for (const sp of sorted) {
    const cur = groups.length > 0 ? groups[groups.length - 1] : null;
    if (
      cur &&
      Math.abs(cur.y - sp.y) <= tol &&
      !(cur.spans.length > 0 && cur.spans[cur.spans.length - 1].hasEOL)
    ) {
      cur.spans.push(sp);
      cur.y = (cur.y * (cur.spans.length - 1) + sp.y) / cur.spans.length;
    } else {
      groups.push({ y: sp.y, spans: [sp] });
    }
  }

  return groups
    .map((g) => {
      g.spans.sort((a, b) => a.x - b.x);
      let text = '';
      let prevEnd = g.spans[0].x;
      let boldChars = 0;
      let italicChars = 0;
      let totalChars = 0;
      for (let i = 0; i < g.spans.length; i++) {
        const s = g.spans[i];
        const clean = s.str.replace(/\s+/g, ' ');
        if (i > 0) {
          const gap = s.x - prevEnd;
          if (gap > Math.max(1.5, s.height * 0.16) && !text.endsWith(' ') && !clean.startsWith(' ')) {
            text += ' ';
          }
        }
        text += clean;
        prevEnd = s.x + s.width;
        const len = clean.trim().length;
        totalChars += len;
        if (s.bold) boldChars += len;
        if (s.italic) italicChars += len;
      }
      const xMin = g.spans[0].x;
      const xMax = Math.max(...g.spans.map((s) => s.x + s.width));
      const fontSizePt = medianNumber(g.spans.map((s) => s.height), 11);
      const lineCenter = (xMin + xMax) / 2;
      const centered =
        pageWidth > 0 &&
        Math.abs(lineCenter - pageWidth / 2) <= pageWidth * 0.08 &&
        xMax - xMin < pageWidth * 0.72;
      return {
        y: g.y,
        xMin,
        xMax,
        fontSizePt,
        bold: totalChars > 0 && boldChars / totalChars >= 0.7,
        italic: totalChars > 0 && italicChars / totalChars >= 0.7,
        centered,
        text: text.replace(/\s+/g, ' ').trim(),
        spans: g.spans,
      };
    })
    .filter((l) => l.text.length > 0);
}

/**
 * Reordena líneas respetando 2 columnas cuando existe un canal vertical vacío real,
 * manteniendo encabezados/títulos de ancho completo arriba en orden natural.
 */
export function orderPageLinesXyCut(
  lines: PdfRichLine[],
  pageWidth: number,
): PdfRichLine[] {
  if (lines.length < 6 || pageWidth <= 0) return lines;
  const mid = pageWidth / 2;
  const leftOnly = lines.filter((l) => l.xMax <= mid + 6);
  const rightOnly = lines.filter((l) => l.xMin >= mid - 6);
  if (leftOnly.length < 3 || rightOnly.length < 3) return lines;

  // Separar líneas de ancho completo arriba/abajo que cruzan el centro
  const topFullWidth: PdfRichLine[] = [];
  const bodyMixed: PdfRichLine[] = [];
  let enteredCols = false;
  for (const ln of lines) {
    const crossesCenter = ln.xMin < mid - 18 && ln.xMax > mid + 18;
    if (!enteredCols && crossesCenter) {
      topFullWidth.push(ln);
    } else {
      enteredCols = true;
      bodyMixed.push(ln);
    }
  }
  const leftBody = bodyMixed.filter((l) => (l.xMin + l.xMax) / 2 < mid);
  const rightBody = bodyMixed.filter((l) => (l.xMin + l.xMax) / 2 >= mid);
  if (leftBody.length < 3 || rightBody.length < 3) return lines;
  return [...topFullWidth, ...leftBody, ...rightBody];
}

function normalizeHeaderFooterKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b\d+\b/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Detecta y limpia encabezados/pies repetidos entre páginas y folios sueltos en los extremos.
 */
export function stripRepeatedHeadersAndFooters(
  pages: Array<{ page: number; heightPt: number; lines: PdfRichLine[] }>,
): Array<{ page: number; heightPt: number; lines: PdfRichLine[] }> {
  if (pages.length < 3) return pages;

  const keyPageCounts = new Map<string, Set<number>>();
  for (const p of pages) {
    const topThreshold = p.heightPt * 0.9;
    const bottomThreshold = p.heightPt * 0.11;
    for (const ln of p.lines) {
      if (ln.y >= topThreshold || ln.y <= bottomThreshold) {
        const key = normalizeHeaderFooterKey(ln.text);
        if (!key || key.length > 110) continue;
        if (!keyPageCounts.has(key)) keyPageCounts.set(key, new Set());
        keyPageCounts.get(key)!.add(p.page);
      }
    }
  }

  const minRepeatPages = Math.max(3, Math.ceil(pages.length * 0.35));
  const repeatedKeys = new Set<string>();
  for (const [key, set] of keyPageCounts.entries()) {
    if (set.size >= minRepeatPages) repeatedKeys.add(key);
  }

  return pages.map((p) => {
    const topThreshold = p.heightPt * 0.91;
    const bottomThreshold = p.heightPt * 0.11;
    const filtered = p.lines.filter((ln) => {
      const inMarginBand = ln.y >= topThreshold || ln.y <= bottomThreshold;
      if (!inMarginBand) return true;
      if (/^(?:p[aá]g(?:ina)?\.?\s*)?\d{1,4}(?:\s*(?:de|\/)\s*\d{1,4})?$/i.test(ln.text)) {
        return false;
      }
      const key = normalizeHeaderFooterKey(ln.text);
      return !repeatedKeys.has(key);
    });
    return { ...p, lines: filtered };
  });
}

export interface DetectedPdfTable {
  startLineIdx: number;
  endLineIdx: number;
  yTop: number;
  yBottom: number;
  headers: string[];
  rows: string[][];
  isAmbiguous: boolean;
}

/**
 * Detecta tablas reales en una página cuando >= 3 líneas consecutivas tienen >= 2 celdas
 * separadas por huecos horizontales amplios con columnas X alineadas.
 */
export function detectTablesInPageLines(
  lines: PdfRichLine[],
  bodyFontPt: number,
): DetectedPdfTable[] {
  const tables: DetectedPdfTable[] = [];
  const rowCells = lines.map((ln) => {
    const cells: Array<{ xStart: number; text: string }> = [];
    let curText = '';
    let curX = ln.spans[0]?.x ?? ln.xMin;
    let prevEnd = ln.spans[0]?.x ?? ln.xMin;
    const colGapMin = Math.max(18, bodyFontPt * 1.9);

    for (let i = 0; i < ln.spans.length; i++) {
      const sp = ln.spans[i];
      if (i > 0 && sp.x - prevEnd > colGapMin && curText.trim()) {
        cells.push({ xStart: curX, text: curText.trim() });
        curText = sp.str.trim();
        curX = sp.x;
      } else {
        curText = curText ? `${curText} ${sp.str.trim()}` : sp.str.trim();
      }
      prevEnd = sp.x + sp.width;
    }
    if (curText.trim()) cells.push({ xStart: curX, text: curText.trim() });
    return cells;
  });

  let i = 0;
  while (i < lines.length) {
    if (rowCells[i].length < 2) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < lines.length && rowCells[j].length >= 2) {
      const yGap = lines[j - 1].y - lines[j].y;
      if (yGap > bodyFontPt * 3.4) break;
      j++;
    }
    const sliceLen = j - i;
    if (sliceLen >= 3) {
      const sliceCells = rowCells.slice(i, j);
      const colAnchors: number[] = [];
      for (const cells of sliceCells) {
        for (const c of cells) {
          if (!colAnchors.some((ax) => Math.abs(ax - c.xStart) <= 24)) {
            colAnchors.push(c.xStart);
          }
        }
      }
      colAnchors.sort((a, b) => a - b);
      if (colAnchors.length >= 2 && colAnchors.length <= 8) {
        const matrix = sliceCells.map((cells) => {
          const row = new Array(colAnchors.length).fill('');
          for (const c of cells) {
            let bestIdx = 0;
            let bestDist = Infinity;
            colAnchors.forEach((ax, idx) => {
              const d = Math.abs(ax - c.xStart);
              if (d < bestDist) {
                bestDist = d;
                bestIdx = idx;
              }
            });
            row[bestIdx] = row[bestIdx] ? `${row[bestIdx]} ${c.text}` : c.text;
          }
          return row;
        });
        const nonEmptyCols = colAnchors.filter((_, ci) => matrix.some((r) => Boolean(r[ci]))).length;
        if (nonEmptyCols >= 2) {
          tables.push({
            startLineIdx: i,
            endLineIdx: j - 1,
            yTop: lines[i].y,
            yBottom: lines[j - 1].y,
            headers: matrix[0],
            rows: matrix.slice(1),
            isAmbiguous: matrix.some((r) => r.filter(Boolean).length < nonEmptyCols - 1),
          });
        }
      }
    }
    i = j;
  }

  return tables;
}

type Matrix6 = [number, number, number, number, number, number];

function mulMatrix(a: Matrix6, b: Matrix6): Matrix6 {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

function applyPoint(m: Matrix6, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/**
 * Rastrea la matriz de transformación `CTM` sobre `page.getOperatorList()` de `pdf.js`
 * para localizar cajas normalizadas `[0..1000]` de imágenes embebidas y diagramas vectoriales.
 */
export function extractVisualRegionsFromOperatorList(
  opList: { fnArray: number[]; argsArray: any[] },
  ops: Record<string, number>,
  viewport: { width: number; height: number; transform?: number[] },
): NormalizedBbox[] {
  if (!opList?.fnArray || !viewport.width || !viewport.height) return [];

  const initialCtm: Matrix6 =
    Array.isArray(viewport.transform) && viewport.transform.length >= 6
      ? [
          viewport.transform[0],
          viewport.transform[1],
          viewport.transform[2],
          viewport.transform[3],
          viewport.transform[4],
          viewport.transform[5],
        ]
      : [1, 0, 0, -1, 0, viewport.height];

  let ctm: Matrix6 = initialCtm;
  const stack: Matrix6[] = [];
  const rawBoxes: NormalizedBbox[] = [];
  const pathCandidates: NormalizedBbox[] = [];

  const toNormalized = (pts: Array<[number, number]>, kind: 'image' | 'diagram'): NormalizedBbox | null => {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const xminPx = Math.max(0, Math.min(...xs));
    const xmaxPx = Math.min(viewport.width, Math.max(...xs));
    const yminPx = Math.max(0, Math.min(...ys));
    const ymaxPx = Math.min(viewport.height, Math.max(...ys));
    const wRatio = (xmaxPx - xminPx) / viewport.width;
    const hRatio = (ymaxPx - yminPx) / viewport.height;
    if (wRatio < 0.045 || hRatio < 0.035) return null;
    if (wRatio > 0.97 && hRatio > 0.94) return null; // Fondo de página completo
    return {
      xmin: Math.round((xminPx / viewport.width) * 1000),
      xmax: Math.round((xmaxPx / viewport.width) * 1000),
      ymin: Math.round((yminPx / viewport.height) * 1000),
      ymax: Math.round((ymaxPx / viewport.height) * 1000),
      kind,
    };
  };

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i];

    if (fn === ops.save) {
      stack.push(ctm);
    } else if (fn === ops.restore) {
      ctm = stack.pop() || initialCtm;
    } else if (fn === ops.transform && Array.isArray(args) && args.length >= 6) {
      ctm = mulMatrix(ctm, [args[0], args[1], args[2], args[3], args[4], args[5]]);
    } else if (
      fn === ops.paintImageXObject ||
      fn === ops.paintJpegXObject ||
      fn === ops.paintInlineImageXObject
    ) {
      const box = toNormalized(
        [
          applyPoint(ctm, 0, 0),
          applyPoint(ctm, 1, 0),
          applyPoint(ctm, 0, 1),
          applyPoint(ctm, 1, 1),
        ],
        'image',
      );
      if (box) rawBoxes.push(box);
    } else if (fn === ops.constructPath && Array.isArray(args) && Array.isArray(args[1])) {
      const coords = args[1] as number[];
      const pts: Array<[number, number]> = [];
      for (let c = 0; c + 1 < coords.length; c += 2) {
        if (Number.isFinite(coords[c]) && Number.isFinite(coords[c + 1])) {
          pts.push(applyPoint(ctm, coords[c], coords[c + 1]));
        }
      }
      if (pts.length >= 4) {
        const box = toNormalized(pts, 'diagram');
        // Descartar líneas finas horizontales/verticales de subrayado o borde simple
        if (box && box.ymax - box.ymin >= 35 && box.xmax - box.xmin >= 60) {
          pathCandidates.push(box);
        }
      }
    }
  }

  // Agrupar trazos vectoriales cercanos entre sí en clústeres de diagramas (>= 4 trazos)
  const clusters: Array<{ box: NormalizedBbox; count: number }> = [];
  for (const pBox of pathCandidates) {
    const match = clusters.find(
      (c) =>
        pBox.xmin <= c.box.xmax + 35 &&
        pBox.xmax >= c.box.xmin - 35 &&
        pBox.ymin <= c.box.ymax + 35 &&
        pBox.ymax >= c.box.ymin - 35,
    );
    if (match) {
      match.box = {
        xmin: Math.min(match.box.xmin, pBox.xmin),
        ymin: Math.min(match.box.ymin, pBox.ymin),
        xmax: Math.max(match.box.xmax, pBox.xmax),
        ymax: Math.max(match.box.ymax, pBox.ymax),
        kind: 'diagram',
      };
      match.count += 1;
    } else {
      clusters.push({ box: pBox, count: 1 });
    }
  }

  for (const c of clusters) {
    if (c.count >= 4 && c.box.ymax - c.box.ymin >= 70) {
      rawBoxes.push(c.box);
    }
  }

  // Fusionar cajas muy solapadas
  const merged: NormalizedBbox[] = [];
  for (const b of rawBoxes) {
    const dup = merged.find(
      (m) =>
        b.xmin <= m.xmax + 12 &&
        b.xmax >= m.xmin - 12 &&
        b.ymin <= m.ymax + 12 &&
        b.ymax >= m.ymin - 12,
    );
    if (dup) {
      dup.xmin = Math.min(dup.xmin, b.xmin);
      dup.ymin = Math.min(dup.ymin, b.ymin);
      dup.xmax = Math.max(dup.xmax, b.xmax);
      dup.ymax = Math.max(dup.ymax, b.ymax);
      if (b.kind === 'image') dup.kind = 'image';
    } else {
      merged.push({ ...b });
    }
  }

  return merged.sort((a, b) => a.ymin - b.ymin);
}
