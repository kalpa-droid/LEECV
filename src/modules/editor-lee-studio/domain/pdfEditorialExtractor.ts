/**
 * Extractor editorial nativo para archivos PDF (`pdfEditorialExtractor.ts`).
 *
 * Combina análisis geométrico/tipográfico en navegador (`pdfjs-dist`) con asistencia
 * multimodal selectiva (`editorial_assist_complex_objects`) solo cuando hay páginas escaneadas,
 * tablas ambiguas o diagramas/figuras recortadas que requieren comprensión semántica.
 */

import { executeAiTask } from '../../../shared/core/ai/aiClient';
import { ensurePdfjsWorkerConfigured, loadPdfDocumentWithCmaps } from '../../../shared/core/pdf-engine/pdfjsWorkerSetup';
import { analyzePdfPage } from '../../../shared/core/cv-import/pdfPageLayout';
import {
  prepareOpaquePdfCanvas,
  computeRenderScale,
  clampCanvasSize,
  encodeCanvasWithinBudget,
} from '../../../shared/core/cv-import/pageImageEncoder';
import { sanitizeImageDataUrlForPdf } from '../../../shared/core/utils/imageCompressor';
import { detectSafeDocumentMime } from '../../../shared/core/document-ast/documentAst';
import type { DocxExtractedRichBlock, ImportedTocEntry } from './docxClientExtractor';
import {
  detectTablesInPageLines,
  extractVisualRegionsFromOperatorList,
  groupSpansIntoRichLines,
  medianNumber,
  normalizePdfRichSpans,
  orderPageLinesXyCut,
  stripRepeatedHeadersAndFooters,
  type PdfFontStyleMeta,
  type PdfRichLine,
} from './pdfGeometryHelpers';

const FOLIO_LINE_RE = /^(?:p[aá]g(?:ina)?\.?\s*)?\d{1,4}(?:\s*(?:de|\/)\s*\d{1,4})?$/i;
const SCANNER_STAMP_RE =
  /^(?:scanned\s+(?:by|with)\s+.+|escaneado\s+con\s+.+|camscanner|adobe\s+scan|tapscanner|microsoft\s+lens|genius\s+scan)$/i;
const PUA_OR_CONTROL_RE = /[\uE000-\uF8FF\uFFFD\u0000-\u001F\u007F-\u009F]/g;

export function hasUsableEditorialDigitalText(
  lines: PdfRichLine[],
  pageHeightPt?: number,
): boolean {
  if (!Array.isArray(lines) || lines.length === 0) return false;

  const usableLines: string[] = [];
  for (const ln of lines) {
    const t = String(ln?.text || '').replace(/\s+/g, ' ').trim();
    if (!t) continue;
    if (FOLIO_LINE_RE.test(t) || SCANNER_STAMP_RE.test(t)) continue;
    if (
      pageHeightPt &&
      pageHeightPt > 0 &&
      t.length <= 40 &&
      (ln.y >= pageHeightPt * 0.91 || ln.y <= pageHeightPt * 0.11)
    ) {
      continue;
    }
    usableLines.push(t);
  }

  if (usableLines.length === 0) return false;

  const combinedRaw = usableLines.join(' ');
  const rawNoWs = combinedRaw.replace(/\s+/g, '');
  if (!rawNoWs) return false;

  const brokenCount = (rawNoWs.match(PUA_OR_CONTROL_RE) || []).length;
  if (brokenCount / rawNoWs.length > 0.15) return false;

  const cleaned = combinedRaw.replace(PUA_OR_CONTROL_RE, '').replace(/\s+/g, ' ').trim();
  const cleanNoWs = cleaned.replace(/\s+/g, '');
  if (!(cleanNoWs.length >= 12 || (usableLines.length >= 2 && cleanNoWs.length >= 6))) {
    return false;
  }

  const letters = cleanNoWs.match(/\p{L}/gu) || [];
  const digits = cleanNoWs.match(/\d/g) || [];
  if (letters.length < 4) return false;

  const readableScore = (letters.length + digits.length * 0.5) / cleanNoWs.length;
  if (readableScore < 0.55) return false;

  const words = cleaned.split(/\s+/).filter(Boolean);
  const avgWordLen = words.reduce((acc, w) => acc + w.length, 0) / Math.max(1, words.length);
  if (avgWordLen > 18) return false;

  return true;
}

export interface PdfEditorialProgress {
  stage: 'reading' | 'ocr' | 'structuring' | 'done';
  current: number;
  total: number;
  message: string;
}

export interface PdfEditorialExtractionResult {
  plainMarkdownText: string;
  blocks: DocxExtractedRichBlock[];
  importedTocEntries: ImportedTocEntry[];
  warnings: string[];
  digitalPages: number;
  ocrPages: number;
  totalPages: number;
}

const MAX_PDF_PAGES = 120;

function cropCanvasRegionToDataUrl(
  sourceCanvas: HTMLCanvasElement,
  bbox: number[],
): string | null {
  if (!Array.isArray(bbox) || bbox.length < 4 || typeof document === 'undefined') return null;
  const [ymin, xmin, ymax, xmax] = bbox.map((v) => Math.max(0, Math.min(1000, Number(v) || 0)));
  if (ymax <= ymin + 15 || xmax <= xmin + 15) return null;

  const sx = Math.floor((xmin / 1000) * sourceCanvas.width);
  const sy = Math.floor((ymin / 1000) * sourceCanvas.height);
  const sw = Math.max(24, Math.floor(((xmax - xmin) / 1000) * sourceCanvas.width));
  const sh = Math.max(24, Math.floor(((ymax - ymin) / 1000) * sourceCanvas.height));

  const outCanvas = document.createElement('canvas');
  outCanvas.width = sw;
  outCanvas.height = sh;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = 'rgb(255, 255, 255)';
  ctx.fillRect(0, 0, sw, sh);
  ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
  try {
    const dataUrl = outCanvas.toDataURL('image/png');
    outCanvas.width = 0;
    outCanvas.height = 0;
    return dataUrl;
  } catch {
    outCanvas.width = 0;
    outCanvas.height = 0;
    return null;
  }
}

async function runVisionOcrSafe(
  encoded: { mimeType: 'image/png' | 'image/jpeg' | 'image/webp'; base64: string },
  pageNumber: number,
): Promise<{
  text: string;
  detectedHeading: string | null;
  figures: Array<{ label: string; bbox: number[] }>;
} | null> {
  try {
    const res = await executeAiTask<{
      extractedText: string;
      detectedHeading?: string | null;
      figures?: Array<{ label: string; bbox: number[] }>;
    }>({
      taskId: 'editorial_ocr_page',
      payload: { images: [encoded], pageNumber },
      maxTokens: 3200,
      temperature: 0.1,
    });
    const heading = typeof res.data?.detectedHeading === 'string' ? res.data.detectedHeading.trim() : '';
    const body = typeof res.data?.extractedText === 'string' ? res.data.extractedText.trim() : '';
    const figures = Array.isArray(res.data?.figures) ? res.data.figures : [];
    const text = !body
      ? heading
        ? `# ${heading}`
        : ''
      : heading && !body.startsWith(heading)
        ? `# ${heading}\n\n${body}`
        : body;
    return { text, detectedHeading: heading || null, figures };
  } catch {
    return null;
  }
}

function classifyHeadingCandidate(
  line: PdfRichLine,
  bodyFontPt: number,
  isFirstPage: boolean,
): number | null {
  const txt = line.text.trim();
  if (!txt || txt.length > 140) return null;
  if (/^[a-z].*[.!?]$/.test(txt)) return null;

  const isAllCaps =
    txt.length >= 4 &&
    txt === txt.toUpperCase() &&
    /[A-ZÁÉÍÓÚÜÑ]/.test(txt) &&
    !/^(?:TEMA|PROYECTO|AUTOR|DOCENTE|INSTITUCI[ÓO]N)\s*:/i.test(txt);
  const numberedTop = /^(?:\d+|[IVXL]{1,5})\.\s+[A-ZÁÉÍÓÚÜÑ]/.test(txt);
  const numberedSub = /^\d+\.\d+(?:\.\d+)?\.?\s+\S/.test(txt);
  const explicitSection = /^(?:CAP[IÍ]TULO|UNIDAD|SECCI[ÓO]N|ANEXO|AP[ÉE]NDICE|PR[ÓO]LOGO|INTRODUCCI[ÓO]N|RESUMEN|ABSTRACT|METODOLOG[IÍ]A|RESULTADOS|DISCUSI[ÓO]N|CONCLUSI[ÓO]N(?:ES)?|BIBLIOGRAF[IÍ]A|REFERENCIAS|GLOSARIO)\b/i.test(
    txt,
  );

  if (line.fontSizePt >= bodyFontPt + 2.4 || (explicitSection && (line.bold || isAllCaps))) {
    return 1;
  }
  if (numberedSub && (line.bold || line.fontSizePt >= bodyFontPt + 0.5)) {
    return 2;
  }
  if (
    (numberedTop && (line.bold || isAllCaps || line.fontSizePt >= bodyFontPt + 0.8)) ||
    (isAllCaps && txt.length <= 85 && !isFirstPage) ||
    (line.bold && line.fontSizePt >= bodyFontPt + 1.1 && !txt.endsWith('.'))
  ) {
    return 1;
  }
  if (line.bold && txt.length <= 90 && !txt.endsWith('.') && !txt.endsWith(':') && !isFirstPage) {
    return 2;
  }
  return null;
}

function isTocLineCandidate(text: string): { title: string; pageLabel?: string } | null {
  const clean = text.trim();
  if (!clean || clean.length > 140) return null;
  const dotMatch = clean.match(/^(.+?)\s*\.{2,}\s*(\d{1,4}|[ivxlcdm]+)$/i);
  if (dotMatch && dotMatch[1].trim().length >= 2) {
    return { title: dotMatch[1].trim(), pageLabel: dotMatch[2] };
  }
  return null;
}

export async function extractEditorialFromPdfFile(
  file: File,
  options: {
    onProgress?: (update: PdfEditorialProgress) => void;
    signal?: AbortSignal;
  } = {},
): Promise<PdfEditorialExtractionResult> {
  const { onProgress, signal } = options;
  const buffer = await file.arrayBuffer();
  const magic = detectSafeDocumentMime(new Uint8Array(buffer.slice(0, 1024)));
  if (magic !== 'pdf') {
    throw new Error(`"${file.name}" no tiene firma binaria de archivo PDF válido.`);
  }

  const pdfjsLib = ensurePdfjsWorkerConfigured();
  const pdfDoc = await loadPdfDocumentWithCmaps(buffer);
  const totalPages = Math.min(Number(pdfDoc.numPages) || 0, MAX_PDF_PAGES);
  if (totalPages === 0) {
    throw new Error(`El PDF "${file.name}" no contiene páginas legibles.`);
  }

  const warnings: string[] = [];
  const digitalPagesRaw: Array<{
    page: number;
    widthPt: number;
    heightPt: number;
    lines: PdfRichLine[];
    visualRegions: ReturnType<typeof extractVisualRegionsFromOperatorList>;
  }> = [];
  const ocrPagesData: Array<{
    page: number;
    text: string;
    figures: Array<{ label: string; dataUrl: string }>;
  }> = [];
  let digitalPages = 0;
  let ocrPages = 0;

  for (let p = 1; p <= totalPages; p++) {
    if (signal?.aborted) throw new Error('Lectura cancelada.');
    const page = await pdfDoc.getPage(p);
    const viewportBase = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const analyzed = analyzePdfPage(
      textContent?.items || [],
      viewportBase.width,
      viewportBase.height,
    );

    const fontStyles: Record<string, PdfFontStyleMeta> = {};
    if (textContent?.styles && typeof textContent.styles === 'object') {
      for (const [fKey, fMeta] of Object.entries<any>(textContent.styles)) {
        const fam = String(fMeta?.fontFamily || '');
        fontStyles[fKey] = {
          bold: /bold|black|heavy/i.test(fam),
          italic: /italic|oblique/i.test(fam),
        };
      }
    }

    const richSpans = normalizePdfRichSpans(textContent?.items || [], fontStyles);
    const rawLines = groupSpansIntoRichLines(richSpans, viewportBase.width);
    const orderedLines = orderPageLinesXyCut(rawLines, viewportBase.width);

    if (
      analyzed.mode === 'text' ||
      analyzed.mode === 'hybrid' ||
      hasUsableEditorialDigitalText(orderedLines, viewportBase.height)
    ) {
      digitalPages++;
      onProgress?.({
        stage: 'reading',
        current: p,
        total: totalPages,
        message: `Leyendo estructura, tablas e imágenes de "${file.name}" (página ${p} de ${totalPages})...`,
      });

      let visualRegions: ReturnType<typeof extractVisualRegionsFromOperatorList> = [];
      try {
        const opList = await page.getOperatorList();
        visualRegions = extractVisualRegionsFromOperatorList(
          opList,
          (pdfjsLib as any).OPS || {},
          viewportBase,
        );
      } catch {
        visualRegions = [];
      }

      digitalPagesRaw.push({
        page: p,
        widthPt: viewportBase.width,
        heightPt: viewportBase.height,
        lines: orderedLines,
        visualRegions,
      });
      continue;
    }

    ocrPages++;
    onProgress?.({
      stage: 'ocr',
      current: p,
      total: totalPages,
      message: `Leyendo página escaneada ${p} de ${totalPages}...`,
    });

    try {
      const scale = computeRenderScale(viewportBase.width, viewportBase.height);
      const scaledVp = page.getViewport({ scale });
      const { canvas, ctx } = prepareOpaquePdfCanvas(scaledVp.width, scaledVp.height);
      await page.render({ canvasContext: ctx, viewport: scaledVp }).promise;
      const clamped = clampCanvasSize(canvas);
      const encoded = encodeCanvasWithinBudget(clamped, undefined, { digitalPage: false });
      const ocrRes = await runVisionOcrSafe(encoded, p);
      const figs: Array<{ label: string; dataUrl: string }> = [];
      if (ocrRes) {
        for (const fig of ocrRes.figures) {
          const rawCrop = cropCanvasRegionToDataUrl(clamped, fig.bbox);
          if (rawCrop) {
            const clean = await sanitizeImageDataUrlForPdf(rawCrop);
            if (clean) figs.push({ label: fig.label || `Figura pág. ${p}`, dataUrl: clean });
          }
        }
        ocrPagesData.push({ page: p, text: ocrRes.text, figures: figs });
      } else if (orderedLines.length > 0) {
        digitalPagesRaw.push({
          page: p,
          widthPt: viewportBase.width,
          heightPt: viewportBase.height,
          lines: orderedLines,
          visualRegions: [],
        });
      } else {
        warnings.push(`La página escaneada ${p} no pudo leerse en este intento y se omitió sin detener el resto.`);
      }
      clamped.width = 0;
      clamped.height = 0;
    } catch {
      if (orderedLines.length > 0) {
        digitalPagesRaw.push({
          page: p,
          widthPt: viewportBase.width,
          heightPt: viewportBase.height,
          lines: orderedLines,
          visualRegions: [],
        });
      } else {
        warnings.push(`La página ${p} presentó un problema de lectura puntual y se continuó con el resto.`);
      }
    }
  }

  // Limpiar encabezados/pies repetidos y calcular tamaño tipográfico base real del cuerpo
  const cleanedPagesRaw = stripRepeatedHeadersAndFooters(digitalPagesRaw);
  const rescuedOcrPages = new Set<number>();

  for (const cp of cleanedPagesRaw) {
    if (signal?.aborted) break;
    const rawPageInfo = digitalPagesRaw.find((r) => r.page === cp.page);
    const hasVisualsOnly = Boolean(rawPageInfo && rawPageInfo.visualRegions.length > 0 && cp.lines.length > 0);
    if (hasUsableEditorialDigitalText(cp.lines) || hasVisualsOnly) continue;

    try {
      const page = await pdfDoc.getPage(cp.page);
      const viewportBase = page.getViewport({ scale: 1 });
      onProgress?.({
        stage: 'ocr',
        current: cp.page,
        total: totalPages,
        message: `Recuperando texto escaneado de página ${cp.page} de ${totalPages}...`,
      });
      const scale = computeRenderScale(viewportBase.width, viewportBase.height);
      const scaledVp = page.getViewport({ scale });
      const { canvas, ctx } = prepareOpaquePdfCanvas(scaledVp.width, scaledVp.height);
      await page.render({ canvasContext: ctx, viewport: scaledVp }).promise;
      const clamped = clampCanvasSize(canvas);
      const encoded = encodeCanvasWithinBudget(clamped, undefined, { digitalPage: false });
      const ocrRes = await runVisionOcrSafe(encoded, cp.page);
      if (ocrRes && ocrRes.text.trim()) {
        const figs: Array<{ label: string; dataUrl: string }> = [];
        for (const fig of ocrRes.figures) {
          const rawCrop = cropCanvasRegionToDataUrl(clamped, fig.bbox);
          if (rawCrop) {
            const clean = await sanitizeImageDataUrlForPdf(rawCrop);
            if (clean) figs.push({ label: fig.label || `Figura pág. ${cp.page}`, dataUrl: clean });
          }
        }
        ocrPagesData.push({ page: cp.page, text: ocrRes.text, figures: figs });
        rescuedOcrPages.add(cp.page);
        ocrPages++;
        digitalPages = Math.max(0, digitalPages - 1);
      }
      clamped.width = 0;
      clamped.height = 0;
    } catch {
      // Mantener flujo resiliente si el rescate OCR falla en esta página
    }
  }

  const cleanedPages = cleanedPagesRaw.filter((cp) => !rescuedOcrPages.has(cp.page));
  const allFontSizes = cleanedPages.flatMap((p) => p.lines.map((l) => l.fontSizePt));
  const bodyFontPt = medianNumber(allFontSizes, 11);

  const blocks: DocxExtractedRichBlock[] = [];
  const markdownLines: string[] = [];
  const importedTocEntries: ImportedTocEntry[] = [];
  const complexRegionsQueue: Array<{
    blockIndex: number;
    regionId: string;
    dataUrl: string;
    kind: 'image' | 'diagram' | 'table';
  }> = [];

  const pageMap = new Map<number, (typeof digitalPagesRaw)[number]>();
  digitalPagesRaw.forEach((raw) => {
    if (!rescuedOcrPages.has(raw.page)) pageMap.set(raw.page, raw);
  });
  const cleanedMap = new Map<number, (typeof cleanedPages)[number]>();
  cleanedPages.forEach((cp) => cleanedMap.set(cp.page, cp));
  const ocrMap = new Map<number, (typeof ocrPagesData)[number]>();
  ocrPagesData.forEach((op) => ocrMap.set(op.page, op));

  for (let p = 1; p <= totalPages; p++) {
    const ocrEntry = ocrMap.get(p);
    if (ocrEntry) {
      const paras = ocrEntry.text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
      for (const para of paras) {
        const hm = /^(#{1,3})\s+(.+)$/.exec(para);
        if (hm) {
          blocks.push({ kind: 'heading', level: Math.min(3, hm[1].length), text: hm[2].trim() });
          markdownLines.push(para);
        } else {
          blocks.push({ kind: 'paragraph', text: para });
          markdownLines.push(para);
        }
      }
      for (const fig of ocrEntry.figures) {
        blocks.push({ kind: 'image', imageDataUrl: fig.dataUrl, imageCaption: fig.label });
      }
      continue;
    }

    const rawPage = pageMap.get(p);
    const cleanedPage = cleanedMap.get(p);
    if (!rawPage || !cleanedPage) continue;

    // Recortar imágenes/diagramas detectados en PDF digital solo para páginas que efectivamente tienen regiones visuales
    const croppedVisuals: Array<{ yPdf: number; dataUrl: string; kind: 'image' | 'diagram' }> = [];
    if (rawPage.visualRegions.length > 0 && typeof document !== 'undefined') {
      try {
        const pdfPage = await pdfDoc.getPage(p);
        const vp = pdfPage.getViewport({ scale: 1.8 });
        const { canvas, ctx } = prepareOpaquePdfCanvas(vp.width, vp.height);
        await pdfPage.render({ canvasContext: ctx, viewport: vp }).promise;
        for (const reg of rawPage.visualRegions.slice(0, 6)) {
          const rawCrop = cropCanvasRegionToDataUrl(canvas, [reg.ymin, reg.xmin, reg.ymax, reg.xmax]);
          if (rawCrop) {
            const cleanUrl = await sanitizeImageDataUrlForPdf(rawCrop);
            if (cleanUrl) {
              const yPdf = rawPage.heightPt * (1 - reg.ymin / 1000);
              croppedVisuals.push({ yPdf, dataUrl: cleanUrl, kind: reg.kind });
            }
          }
        }
        canvas.width = 0;
        canvas.height = 0;
      } catch {
        // Continuar sin bloquear si una página falla al recortar
      }
    }

    const lines = cleanedPage.lines;
    const detectedTables = detectTablesInPageLines(lines, bodyFontPt);
    const tableLineSet = new Set<number>();
    detectedTables.forEach((tb) => {
      for (let li = tb.startLineIdx; li <= tb.endLineIdx; li++) tableLineSet.add(li);
    });

    let visualCursor = 0;
    const flushVisualsAbove = (yTarget: number) => {
      while (visualCursor < croppedVisuals.length && croppedVisuals[visualCursor].yPdf >= yTarget) {
        const vis = croppedVisuals[visualCursor++];
        const blkIdx = blocks.length;
        blocks.push({
          kind: 'image',
          imageDataUrl: vis.dataUrl,
          imageCaption: vis.kind === 'diagram' ? `Diagrama o gráfico (pág. ${p})` : `Figura (pág. ${p})`,
        });
        if (complexRegionsQueue.length < 4) {
          complexRegionsQueue.push({
            blockIndex: blkIdx,
            regionId: `reg_${p}_${visualCursor}`,
            dataUrl: vis.dataUrl,
            kind: vis.kind,
          });
        }
      }
    };

    let paraBuffer: string[] = [];
    const flushParagraph = () => {
      if (paraBuffer.length === 0) return;
      const joined = paraBuffer.join(' ').replace(/\s+/g, ' ').trim();
      paraBuffer = [];
      if (!joined) return;
      blocks.push({ kind: 'paragraph', text: joined });
      markdownLines.push(joined);
    };

    let inTocPage = false;
    for (let li = 0; li < lines.length; li++) {
      const ln = lines[li];
      flushVisualsAbove(ln.y);

      const matchingTable = detectedTables.find((t) => t.startLineIdx === li);
      if (matchingTable) {
        flushParagraph();
        blocks.push({
          kind: 'table',
          tableHeaders: matchingTable.headers,
          tableRows: matchingTable.rows,
          tableHasHeaderRow: matchingTable.rows.length > 0,
        });
        markdownLines.push(
          [matchingTable.headers, ...matchingTable.rows].map((r) => r.join(' | ')).join('\n'),
        );
        li = matchingTable.endLineIdx;
        continue;
      }
      if (tableLineSet.has(li)) continue;

      // Detección de índice original del PDF
      if (/^(?:[íi]ndice(?:\s+general)?|tabla\s+de\s+contenidos?|sumario)$/i.test(ln.text)) {
        flushParagraph();
        inTocPage = true;
        continue;
      }
      const tocEntry = isTocLineCandidate(ln.text);
      if (tocEntry || (inTocPage && /\s\d{1,4}$/.test(ln.text))) {
        flushParagraph();
        if (tocEntry) importedTocEntries.push({ ...tocEntry, level: 1 });
        else {
          const m = ln.text.match(/^(.+?)\s+(\d{1,4})$/);
          if (m) importedTocEntries.push({ title: m[1].trim(), pageLabel: m[2], level: 1 });
        }
        continue;
      }
      inTocPage = false;

      // Epígrafe de figura inmediatamente tras imagen recién insertada
      if (
        blocks.length > 0 &&
        blocks[blocks.length - 1].kind === 'image' &&
        /^(?:figura|gr[aá]fico|esquema|cuadro|fuente)\s*\d*[:.\-–—]/i.test(ln.text)
      ) {
        blocks[blocks.length - 1].imageCaption = ln.text;
        continue;
      }

      const headingLvl = classifyHeadingCandidate(ln, bodyFontPt, p === 1);
      if (headingLvl) {
        flushParagraph();
        blocks.push({ kind: 'heading', level: headingLvl, text: ln.text });
        markdownLines.push(`${'#'.repeat(headingLvl)} ${ln.text}`);
        continue;
      }

      // Viñeta o ítem de lista
      if (/^(?:[•\-–—*]|\d+[.)])\s+\S/.test(ln.text)) {
        flushParagraph();
        const isNum = /^\d+[.)]\s/.test(ln.text);
        const cleanItem = ln.text.replace(/^(?:[•\-–—*]|\d+[.)])\s+/, '').trim();
        const prev = blocks[blocks.length - 1];
        if (prev?.kind === 'list' && prev.listStyle === (isNum ? 'numbered' : 'bullet')) {
          prev.text = `${prev.text}\n${cleanItem}`;
        } else {
          blocks.push({ kind: 'list', listStyle: isNum ? 'numbered' : 'bullet', text: cleanItem });
        }
        markdownLines.push(`• ${cleanItem}`);
        continue;
      }

      // Corte de párrafo por salto vertical real o línea previa corta terminada en punto
      const prevLn = li > 0 ? lines[li - 1] : null;
      const verticalGap = prevLn ? prevLn.y - ln.y : 0;
      const shouldStartNewPara =
        paraBuffer.length > 0 &&
        (verticalGap > bodyFontPt * 1.42 ||
          (prevLn && /[.!?:"»)]$/.test(prevLn.text) && prevLn.xMax - prevLn.xMin < rawPage.widthPt * 0.68));
      if (shouldStartNewPara) flushParagraph();

      paraBuffer.push(ln.text);
    }

    flushParagraph();
    flushVisualsAbove(-Infinity);
  }

  // Enriquecimiento multimodal selectivo (1 sola llamada agrupada hasta 4 diagramas/figuras recortadas)
  if (complexRegionsQueue.length > 0) {
    try {
      const imagesPayload = complexRegionsQueue
        .map((r) => {
          const m = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/i.exec(r.dataUrl);
          return m ? { mimeType: m[1] as 'image/png' | 'image/jpeg' | 'image/webp', base64: m[2] } : null;
        })
        .filter((x): x is { mimeType: 'image/png' | 'image/jpeg' | 'image/webp'; base64: string } => x !== null);

      if (imagesPayload.length > 0) {
        const res = await executeAiTask<{
          regions?: Array<{ regionId?: string; semanticSummary?: string }>;
        }>({
          taskId: 'editorial_assist_complex_objects',
          payload: {
            images: imagesPayload,
            regions: complexRegionsQueue.map((r) => ({ regionId: r.regionId, kind: r.kind })),
          },
          maxTokens: 1600,
          temperature: 0.1,
        });
        const items = Array.isArray(res.data?.regions) ? res.data.regions : [];
        items.forEach((item, idx) => {
          const target = complexRegionsQueue[idx];
          if (target && item?.semanticSummary?.trim() && blocks[target.blockIndex]) {
            const existingCap = blocks[target.blockIndex].imageCaption || '';
            if (!existingCap || /^(?:Figura|Diagrama)/i.test(existingCap)) {
              blocks[target.blockIndex].imageCaption = item.semanticSummary.trim();
            }
          }
        });
      }
    } catch {
      // Enriquecimiento opcional no bloqueante
    }
  }

  return {
    plainMarkdownText: markdownLines.join('\n\n').trim(),
    blocks,
    importedTocEntries,
    warnings,
    digitalPages,
    ocrPages,
    totalPages,
  };
}
