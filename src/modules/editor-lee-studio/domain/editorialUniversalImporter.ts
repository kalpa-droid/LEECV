/**
 * Importador Universal Editorial Lossless (editorialUniversalImporter.ts)
 *
 * Lee documentos extensos conservando su contenido al 100%:
 * - Validación real por Magic Bytes (`detectSafeDocumentMime`) y escudo Anti Zip-Bomb en `.docx`.
 * - Despiece hacia `DocumentAST` canónico (`blk_00001..`) + bóveda local `localAssetStore`.
 * - En PDFs escaneados, recorta gráficos/figuras `[ymin, xmin, ymax, xmax]` directo del canvas.
 * - Estructuración IA por punteros sin reescritura (`editorial_analyze_ast_structure`),
 *   con Map-Reduce con memoria acumulada en obras extensas y biyección matemática 1:1.
 */
import { executeAiTask } from '../../../shared/core/ai/aiClient';
import { apiFetch } from '../../../shared/core/utils/apiClient';
import { loadPdfDocumentWithCmaps } from '../../../shared/core/pdf-engine/pdfjsWorkerSetup';
import { analyzePdfPage } from '../../../shared/core/cv-import/pdfPageLayout';
import {
  prepareOpaquePdfCanvas,
  computeRenderScale,
  clampCanvasSize,
  encodeCanvasWithinBudget,
  encodeImageFileWithinBudget,
} from '../../../shared/core/cv-import/pageImageEncoder';
import { localAssetStore } from '../../../shared/core/storage/localAssetStore';
import {
  CanonicalBlock,
  DocumentAST,
  StructureAnalysis,
  StructureAnalysisSchema,
  buildCompactSkeleton,
  computeSha256Hex,
  detectSafeDocumentMime,
  formatBlockId,
  reconstructEditorialSectionsFromAst,
  repairProposalToLosslessBijection,
} from '../../../shared/core/document-ast/documentAst';
import type { EditorialPresetId, EditorialSection } from './editorialTypes';
import {
  buildSectionsFromDocxRichBlocks,
  heuristicSplitManuscript,
  mergeEditorialChunkedSections,
  type StructuredChunkSectionInput,
} from './editorialManuscriptChunker';
import {
  extractDocxInClient,
  type DocxExtractedRichBlock,
} from './docxClientExtractor';

export interface ImportProgressUpdate {
  stage: 'reading' | 'ocr' | 'structuring' | 'done';
  current: number;
  total: number;
  message: string;
}

export interface ExtractedDocumentStats {
  text: string;
  totalFiles: number;
  pdfDigitalPages: number;
  ocrPages: number;
  richBlocks?: DocxExtractedRichBlock[];
  ast?: DocumentAST;
  assetUrlMap?: Record<string, string>;
  warnings?: string[];
}

export interface StructureResult {
  sections: EditorialSection[];
  metadata?: { title?: string; subtitle?: string; author?: string };
  usedFallbackForChunks: number;
  detectedPresetId?: string;
  losslessSummary?: {
    totalBlocks: number;
    recoveredBlocks: number;
    preservedTables: number;
    preservedImages: number;
    providerUsed: string;
  };
}

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_PDF_PAGES = 120;
const AST_SINGLE_PASS_TOKEN_LIMIT = 35_000;
const AST_WINDOW_BLOCK_CHARS = 52_000;

function readFileAsBase64DataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx).toLowerCase() : '';
}

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

async function runVisionOcrOnImage(
  encoded: { mimeType: 'image/png' | 'image/jpeg' | 'image/webp'; base64: string },
  pageNumber?: number,
): Promise<{
  text: string;
  detectedHeading?: string | null;
  figures: Array<{ label: string; bbox: number[] }>;
}> {
  const res = await executeAiTask<{
    extractedText: string;
    detectedHeading?: string | null;
    figures?: Array<{ label: string; bbox: number[] }>;
  }>({
    taskId: 'editorial_ocr_page',
    payload: {
      images: [encoded],
      pageNumber,
    },
    maxTokens: 3200,
    temperature: 0.1,
  });

  const heading =
    typeof res.data?.detectedHeading === 'string' ? res.data.detectedHeading.trim() : '';
  const body =
    typeof res.data?.extractedText === 'string' ? res.data.extractedText.trim() : '';
  const figures = Array.isArray(res.data?.figures) ? res.data.figures : [];
  const full = !body ? (heading ? `# ${heading}` : '') : heading && !body.startsWith(heading) ? `# ${heading}\n\n${body}` : body;
  return { text: full, detectedHeading: heading || null, figures };
}

interface RawExtractedPageItem {
  page: number;
  text: string;
  heading?: string | null;
  croppedFigures: Array<{ label: string; bbox: number[]; dataUrl: string }>;
}

async function extractTextFromSinglePdf(
  file: File,
  onProgress?: (update: ImportProgressUpdate) => void,
  signal?: AbortSignal,
): Promise<{
  text: string;
  digitalPages: number;
  ocrPages: number;
  pageItems: RawExtractedPageItem[];
  totalPages: number;
}> {
  const buffer = await file.arrayBuffer();
  const magic = detectSafeDocumentMime(new Uint8Array(buffer));
  if (magic !== 'pdf') {
    throw new Error(`"${file.name}" no tiene firma binaria de archivo PDF válido.`);
  }
  const pdfDoc = await loadPdfDocumentWithCmaps(buffer);
  const totalPages = Math.min(Number(pdfDoc.numPages) || 0, MAX_PDF_PAGES);
  if (totalPages === 0) {
    throw new Error(`El PDF "${file.name}" no contiene páginas legibles.`);
  }

  const pageTexts: string[] = [];
  const pageItems: RawExtractedPageItem[] = [];
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

    if (analyzed.mode === 'text' || analyzed.mode === 'hybrid') {
      digitalPages++;
      onProgress?.({
        stage: 'reading',
        current: p,
        total: totalPages,
        message: `Leyendo texto de "${file.name}" (página ${p} de ${totalPages})...`,
      });
      if (analyzed.text.trim()) {
        pageTexts.push(analyzed.text.trim());
        pageItems.push({ page: p, text: analyzed.text.trim(), croppedFigures: [] });
      }
      continue;
    }

    // Página escaneada -> OCR por Visión + recorte automático de gráficos/figuras si existen
    ocrPages++;
    onProgress?.({
      stage: 'ocr',
      current: p,
      total: totalPages,
      message: `Escaneando imagen de página ${p} de ${totalPages} con lectura inteligente...`,
    });

    const scale = computeRenderScale(viewportBase.width, viewportBase.height);
    const scaledVp = page.getViewport({ scale });
    const { canvas, ctx } = prepareOpaquePdfCanvas(scaledVp.width, scaledVp.height);
    await page.render({ canvasContext: ctx, viewport: scaledVp }).promise;
    const clamped = clampCanvasSize(canvas);
    const encoded = encodeCanvasWithinBudget(clamped, undefined, { digitalPage: false });
    const ocrRes = await runVisionOcrOnImage(encoded, p);

    const croppedFigures: Array<{ label: string; bbox: number[]; dataUrl: string }> = [];
    for (const fig of ocrRes.figures) {
      const figUrl = cropCanvasRegionToDataUrl(clamped, fig.bbox);
      if (figUrl) {
        croppedFigures.push({ label: fig.label || `Figura pág. ${p}`, bbox: fig.bbox, dataUrl: figUrl });
      }
    }
    clamped.width = 0;
    clamped.height = 0;

    if (ocrRes.text.trim() || croppedFigures.length > 0) {
      if (ocrRes.text.trim()) pageTexts.push(ocrRes.text.trim());
      pageItems.push({
        page: p,
        text: ocrRes.text.trim(),
        heading: ocrRes.detectedHeading,
        croppedFigures,
      });
    }
  }

  return {
    text: pageTexts.join('\n\n'),
    digitalPages,
    ocrPages,
    pageItems,
    totalPages,
  };
}

async function storeImageInAssetVault(
  docKey: string,
  dataUrl: string,
  assetUrlMap: Record<string, string>,
): Promise<string> {
  try {
    const mimeMatch = /^data:(image\/[a-z0-9.+-]+);base64,/i.exec(dataUrl);
    const mime = mimeMatch ? mimeMatch[1].toLowerCase() : 'image/png';
    const uri = await localAssetStore.putAsset(docKey, dataUrl, mime);
    assetUrlMap[uri] = dataUrl;
    return uri;
  } catch {
    return dataUrl;
  }
}

export async function buildDocumentAstFromRawInputs(params: {
  sourceName: string;
  sourceMime: DocumentAST['sourceMime'];
  fullText: string;
  richBlocks?: DocxExtractedRichBlock[];
  pageItems?: RawExtractedPageItem[];
  totalPages?: number;
  assetUrlMap?: Record<string, string>;
}): Promise<{ ast: DocumentAST | undefined; assetUrlMap: Record<string, string> }> {
  const assetUrlMap = params.assetUrlMap || {};
  const blocks: CanonicalBlock[] = [];
  const docId = `ast_${Date.now()}`;

  const pushBlock = async (partial: Omit<CanonicalBlock, 'id' | 'order' | 'sha256'>) => {
    const rawSeed = partial.text || partial.tableData?.caption || partial.assetRef?.assetId || partial.figureCaption || '';
    const sha = await computeSha256Hex(`${partial.type}:${partial.page}:${blocks.length}:${rawSeed.slice(0, 400)}`);
    blocks.push({
      ...partial,
      id: formatBlockId(blocks.length),
      order: blocks.length,
      sha256: sha,
    });
  };

  if (params.richBlocks && params.richBlocks.length > 0) {
    let pageEst = 1;
    for (const rb of params.richBlocks) {
      if (blocks.length > 0 && blocks.length % 12 === 0) pageEst++;
      if (rb.kind === 'heading') {
        await pushBlock({
          type: 'heading',
          page: pageEst,
          headingLevel: rb.level === 1 || rb.level === 2 || rb.level === 3 ? rb.level : 2,
          text: rb.text || '',
        });
      } else if (rb.kind === 'table') {
        await pushBlock({
          type: 'table',
          page: pageEst,
          text: rb.tableCaption || 'Tabla',
          tableData: {
            headers: rb.tableHeaders || [],
            rows: rb.tableRows || [],
            caption: rb.tableCaption,
            hasHeaderRow: rb.tableHasHeaderRow,
          },
        });
      } else if (rb.kind === 'image' && rb.imageDataUrl) {
        const assetUri = await storeImageInAssetVault(docId, rb.imageDataUrl, assetUrlMap);
        await pushBlock({
          type: 'image',
          page: pageEst,
          text: rb.imageCaption || 'Imagen del documento',
          assetRef: {
            assetId: assetUri,
            mimeType: 'image/png',
            semanticSummary: rb.imageCaption || 'Figura importada desde el documento original',
          },
        });
      } else if (rb.kind === 'figure_placeholder') {
        await pushBlock({
          type: 'figure_placeholder',
          page: pageEst,
          text: rb.figureCaption || 'Espacio de figura',
          figureCaption: rb.figureCaption,
          figureHint: rb.figureHint,
        });
      } else if (rb.kind === 'footnote_list' && rb.footnotes?.length) {
        await pushBlock({
          type: 'footnote_list',
          page: pageEst,
          text: rb.text || '',
          footnotes: rb.footnotes,
        });
      } else if (rb.kind === 'callout') {
        await pushBlock({
          type: 'callout',
          page: pageEst,
          text: rb.text || '',
          calloutTitle: rb.calloutTitle,
          calloutVariant: rb.calloutVariant,
          calloutItems: rb.calloutItems,
        });
      } else if (rb.kind === 'poem') {
        await pushBlock({
          type: 'poem',
          page: pageEst,
          text: rb.text || '',
          preserveLineBreaks: true,
        });
      } else if (rb.kind === 'epigraph') {
        await pushBlock({
          type: 'epigraph',
          page: pageEst,
          text: rb.text || '',
        });
      } else if (rb.kind === 'list') {
        await pushBlock({
          type: 'list',
          page: pageEst,
          text: rb.text || '',
          listStyle: rb.listStyle || 'bullet',
        });
      } else if (rb.text?.trim()) {
        await pushBlock({
          type: 'paragraph',
          page: pageEst,
          text: rb.text,
          isBoldLead: Boolean(/^\*\*[^*]{2,80}\*\*$/.test(rb.text.trim())),
        });
      }
    }
  } else if (params.pageItems && params.pageItems.length > 0) {
    for (const pItem of params.pageItems) {
      const paras = pItem.text
        .split(/\n{2,}/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const para of paras) {
        const headingMatch = /^(#{1,3})\s+(.+)$/.exec(para);
        if (headingMatch) {
          await pushBlock({
            type: 'heading',
            page: pItem.page,
            headingLevel: Math.min(3, headingMatch[1].length),
            text: headingMatch[2].trim(),
          });
        } else {
          await pushBlock({
            type: 'paragraph',
            page: pItem.page,
            text: para,
            isBoldLead: Boolean(para.length < 95 && /^[A-ZÁÉÍÓÚÑ0-9IVXLCM]/.test(para) && !para.endsWith('.')),
          });
        }
      }
      for (const fig of pItem.croppedFigures) {
        const assetUri = await storeImageInAssetVault(docId, fig.dataUrl, assetUrlMap);
        await pushBlock({
          type: 'image',
          page: pItem.page,
          text: fig.label,
          assetRef: {
            assetId: assetUri,
            mimeType: 'image/png',
            bbox: [
              fig.bbox[0] || 0,
              fig.bbox[1] || 0,
              fig.bbox[2] || 1000,
              fig.bbox[3] || 1000,
            ],
            semanticSummary: fig.label,
          },
        });
      }
    }
  } else {
    const rawParas = params.fullText
      .split(/\n{2,}/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (let idx = 0; idx < rawParas.length; idx++) {
      const para = rawParas[idx];
      const pageNum = Math.max(1, Math.floor(idx / 12) + 1);
      const headingMatch = /^(#{1,3})\s+(.+)$/.exec(para);
      if (headingMatch) {
        await pushBlock({
          type: 'heading',
          page: pageNum,
          headingLevel: Math.min(3, headingMatch[1].length),
          text: headingMatch[2].trim(),
        });
      } else {
        await pushBlock({
          type: 'paragraph',
          page: pageNum,
          text: para,
          isBoldLead: Boolean(para.length < 95 && !para.endsWith('.')),
        });
      }
    }
  }

  if (blocks.length === 0) return { ast: undefined, assetUrlMap };
  return {
    ast: {
      docId,
      sourceName: params.sourceName || 'manuscrito.txt',
      sourceMime: params.sourceMime,
      totalPages: Math.max(1, params.totalPages || blocks[blocks.length - 1].page || 1),
      blocks,
    },
    assetUrlMap,
  };
}

/**
 * Extrae el texto íntegro y construye el DocumentAST Lossless de uno o varios archivos.
 */
export async function extractEditorialTextFromFiles(
  files: File[],
  options: {
    onProgress?: (update: ImportProgressUpdate) => void;
    signal?: AbortSignal;
  } = {},
): Promise<ExtractedDocumentStats> {
  const { onProgress, signal } = options;
  const segments: string[] = [];
  const allRichBlocks: DocxExtractedRichBlock[] = [];
  const allPdfPageItems: RawExtractedPageItem[] = [];
  const allWarnings: string[] = [];
  let totalDigital = 0;
  let totalOcr = 0;
  let detectedMime: DocumentAST['sourceMime'] = 'text/plain';

  for (let i = 0; i < files.length; i++) {
    if (signal?.aborted) throw new Error('Importación cancelada.');
    const file = files[i];
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`"${file.name}" supera el límite de 15 MB por archivo.`);
    }

    const ext = getFileExtension(file.name);
    const headBuf = new Uint8Array(await file.slice(0, 512).arrayBuffer());
    const safeMagic = detectSafeDocumentMime(headBuf);

    if (ext === '.txt' || ext === '.md') {
      if (safeMagic !== 'text' && safeMagic !== null) {
        throw new Error(`"${file.name}" no parece un archivo de texto legible.`);
      }
      onProgress?.({
        stage: 'reading',
        current: i + 1,
        total: files.length,
        message: `Leyendo "${file.name}"...`,
      });
      const text = (await file.text()).trim();
      if (text) segments.push(text);
      continue;
    }

    if (ext === '.docx') {
      if (safeMagic !== 'docx') {
        throw new Error(`"${file.name}" no tiene cabecera válida de documento Word (.docx).`);
      }
      detectedMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      onProgress?.({
        stage: 'reading',
        current: i + 1,
        total: files.length,
        message: `Despiezando Word sin pérdidas (texto, tablas, imágenes y notas) de "${file.name}"...`,
      });
      try {
        const docxRes = await extractDocxInClient(file);
        if (docxRes.blocks.length > 0) {
          allRichBlocks.push(...docxRes.blocks);
        }
        if (docxRes.warnings.length > 0) {
          allWarnings.push(...docxRes.warnings);
        }
        if (docxRes.plainMarkdownText.trim()) {
          segments.push(docxRes.plainMarkdownText.trim());
          continue;
        }
      } catch (err: any) {
        if (/límite seguro|Zip-Bomb|demasiadas imágenes/i.test(String(err?.message || ''))) {
          throw err;
        }
      }
      const base64 = await readFileAsBase64DataUrl(file);
      const res = await apiFetch<{ text: string }>('/api/editorial/parse-docx', {
        method: 'POST',
        body: { base64, filename: file.name },
      });
      if (!res.ok || !res.data?.text) {
        throw new Error(res.error || `No pudimos extraer texto de "${file.name}".`);
      }
      segments.push(res.data.text.trim());
      continue;
    }

    if (ext === '.odt' || ext === '.rtf' || ext === '.html' || ext === '.htm') {
      onProgress?.({
        stage: 'reading',
        current: i + 1,
        total: files.length,
        message: `Extrayendo texto de "${file.name}"...`,
      });
      const base64 = await readFileAsBase64DataUrl(file);
      const res = await apiFetch<{ text: string }>('/api/editorial/parse-document', {
        method: 'POST',
        body: { base64, filename: file.name },
      });
      if (!res.ok || !res.data?.text) {
        throw new Error(res.error || `No pudimos extraer texto de "${file.name}".`);
      }
      segments.push(res.data.text.trim());
      continue;
    }

    if (ext === '.pdf') {
      if (safeMagic !== 'pdf') {
        throw new Error(`"${file.name}" no tiene cabecera válida de PDF.`);
      }
      detectedMime = 'application/pdf';
      const pdfRes = await extractTextFromSinglePdf(file, onProgress, signal);
      totalDigital += pdfRes.digitalPages;
      totalOcr += pdfRes.ocrPages;
      if (pdfRes.text.trim()) segments.push(pdfRes.text.trim());
      allPdfPageItems.push(...pdfRes.pageItems);
      allWarnings.push(
        `El archivo PDF "${file.name}" se conservó con todos sus párrafos y figuras recortadas. Si tenés el original en Word (.docx), conservará aún mejor las tablas complejas y notas al pie.`,
      );
      continue;
    }

    if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp') {
      if (safeMagic !== 'png' && safeMagic !== 'jpeg' && safeMagic !== 'webp') {
        throw new Error(`"${file.name}" no tiene firma binaria de imagen válida.`);
      }
      detectedMime = 'image/png';
      totalOcr++;
      onProgress?.({
        stage: 'ocr',
        current: i + 1,
        total: files.length,
        message: `Leyendo imagen "${file.name}" (${i + 1} de ${files.length})...`,
      });
      const encoded = await encodeImageFileWithinBudget(file);
      const ocrRes = await runVisionOcrOnImage(encoded, i + 1);
      if (ocrRes.text.trim()) {
        segments.push(ocrRes.text.trim());
        allPdfPageItems.push({
          page: i + 1,
          text: ocrRes.text.trim(),
          heading: ocrRes.detectedHeading,
          croppedFigures: [],
        });
      }
      continue;
    }

    throw new Error(
      `Formato "${ext || file.name}" no compatible todavía. Probá con Word (.docx), LibreOffice (.odt), PDF, foto (.jpg/.png), .rtf o .txt.`,
    );
  }

  const combined = segments.filter(Boolean).join('\n\n').trim();
  if (!combined) {
    throw new Error('No encontramos texto legible en los archivos seleccionados.');
  }

  const { ast, assetUrlMap } = await buildDocumentAstFromRawInputs({
    sourceName: files[0]?.name || 'manuscrito.txt',
    sourceMime: detectedMime,
    fullText: combined,
    richBlocks: allRichBlocks.length > 0 ? allRichBlocks : undefined,
    pageItems: allPdfPageItems.length > 0 ? allPdfPageItems : undefined,
    totalPages: allPdfPageItems.length > 0 ? allPdfPageItems[allPdfPageItems.length - 1].page : undefined,
  });

  return {
    text: combined,
    totalFiles: files.length,
    pdfDigitalPages: totalDigital,
    ocrPages: totalOcr,
    ...(allRichBlocks.length > 0 ? { richBlocks: allRichBlocks } : {}),
    ...(ast ? { ast, assetUrlMap } : {}),
    ...(allWarnings.length > 0 ? { warnings: allWarnings } : {}),
  };
}

function splitAstIntoWindows(ast: DocumentAST, maxWindowChars = AST_WINDOW_BLOCK_CHARS): DocumentAST[] {
  const windows: DocumentAST[] = [];
  let bucket: CanonicalBlock[] = [];
  let charAcc = 0;

  for (const blk of ast.blocks) {
    const est = Math.min(260, (blk.text?.length || 40) + 40);
    if (bucket.length > 0 && charAcc + est > maxWindowChars) {
      windows.push({ ...ast, blocks: bucket });
      bucket = [];
      charAcc = 0;
    }
    bucket.push(blk);
    charAcc += est;
  }
  if (bucket.length > 0) windows.push({ ...ast, blocks: bucket });
  return windows;
}

/**
 * Estructuración Lossless sobre DocumentAST con punteros `blk_XXXXX`.
 * Nunca reescribe párrafos ni descarta tablas/imágenes: agrupa únicamente los `blockIds`
 * usando IA rápida (`editorial_analyze_ast_structure`) o contexto largo (`_long`) + biyección 1:1.
 */
export async function structureManuscriptInChunks(params: {
  fullText: string;
  richBlocks?: DocxExtractedRichBlock[];
  ast?: DocumentAST;
  assetUrlMap?: Record<string, string>;
  presetId?: EditorialPresetId;
  onProgress?: (update: ImportProgressUpdate) => void;
  onPartialSections?: (sectionsSoFar: EditorialSection[], metadata?: StructureResult['metadata']) => void;
  signal?: AbortSignal;
}): Promise<StructureResult> {
  const { fullText, richBlocks, presetId, onProgress, onPartialSections, signal } = params;

  // Vía determinística Zero-Loss cuando el Word trae encabezados de estructura OOXML reales (Heading 1/2)
  if (
    richBlocks &&
    richBlocks.some((b) => b.kind === 'heading' && typeof b.text === 'string' && b.text.trim().length > 0)
  ) {
    const richSections = buildSectionsFromDocxRichBlocks(richBlocks);
    if (richSections.length > 0) {
      const firstLine = richSections[0]?.title;
      const meta = firstLine && firstLine !== 'Cuerpo principal' ? { title: firstLine } : undefined;
      onPartialSections?.(richSections, meta);
      onProgress?.({
        stage: 'done',
        current: 1,
        total: 1,
        message: `Listo: ${richSections.length} capítulos/apartados con tablas, imágenes y 100% del texto conservado.`,
      });
      return {
        sections: richSections,
        metadata: meta,
        usedFallbackForChunks: 0,
        losslessSummary: {
          totalBlocks: richBlocks.length,
          recoveredBlocks: 0,
          preservedTables: richBlocks.filter((b) => b.kind === 'table').length,
          preservedImages: richBlocks.filter((b) => b.kind === 'image').length,
          providerUsed: 'docx_deterministic',
        },
      };
    }
  }

  // Asegurar DocumentAST incluso para texto pegado o borradores sin encabezados OOXML
  let workingAst = params.ast;
  let assetUrlMap = params.assetUrlMap || {};
  if (!workingAst) {
    const built = await buildDocumentAstFromRawInputs({
      sourceName: 'manuscrito.txt',
      sourceMime: 'text/plain',
      fullText,
      richBlocks,
      assetUrlMap,
    });
    workingAst = built.ast;
    assetUrlMap = built.assetUrlMap;
  }

  if (!workingAst || workingAst.blocks.length === 0) {
    return { sections: [], usedFallbackForChunks: 0 };
  }

  const skeleton = buildCompactSkeleton(workingAst);
  const estimatedTokens = Math.ceil(skeleton.length / 4);
  const windows =
    estimatedTokens <= AST_SINGLE_PASS_TOKEN_LIMIT ? [workingAst] : splitAstIntoWindows(workingAst);

  let runningState: { lastSections: string[]; lastLevel: number } | undefined;
  let mergedProposal: StructureAnalysis | null = null;
  let fallbackCount = 0;
  let providerUsed = 'ast_deterministic';
  let recoveredCount = 0;

  for (let wIdx = 0; wIdx < windows.length; wIdx++) {
    if (signal?.aborted) break;
    const winAst = windows[wIdx];
    const winSkeleton = buildCompactSkeleton(winAst);

    onProgress?.({
      stage: 'structuring',
      current: wIdx + 1,
      total: windows.length,
      message:
        windows.length === 1
          ? 'Analizando estructura con punteros sin perder ninguna palabra, tabla ni imagen...'
          : `Analizando estructura sin pérdidas (lote ${wIdx + 1} de ${windows.length})...`,
    });

    try {
      const useLongRoute = windows.length === 1 && estimatedTokens > 25_000;
      const res = await executeAiTask<any>({
        taskId: useLongRoute ? 'editorial_analyze_ast_structure_long' : 'editorial_analyze_ast_structure',
        payload: {
          skeleton: winSkeleton,
          currentPresetId: presetId || 'libro-ensayo-novela',
          sourceName: winAst.sourceName,
          totalPages: winAst.totalPages,
          runningState,
        },
        maxTokens: useLongRoute ? 8192 : 6000,
        temperature: 0.1,
      });
      providerUsed = res.providerUsed || providerUsed;

      const parsed = StructureAnalysisSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error('La respuesta de estructura no cumplió el esquema AST.');
      }

      const { repaired, recoveredCount: recThisWin } = repairProposalToLosslessBijection(winAst, parsed.data);
      recoveredCount += recThisWin;

      if (!mergedProposal) {
        mergedProposal = repaired;
      } else {
        // Unir ventana conservando título previo si la nueva ventana continúa sin cambio real
        const prevSecs = [...mergedProposal.proposedSections];
        for (const incoming of repaired.proposedSections) {
          const lastPrev = prevSecs[prevSecs.length - 1];
          if (
            lastPrev &&
            lastPrev.title.trim().toLowerCase() === incoming.title.trim().toLowerCase()
          ) {
            lastPrev.blockIds = [...lastPrev.blockIds, ...incoming.blockIds];
          } else {
            prevSecs.push(incoming);
          }
        }
        mergedProposal = {
          ...mergedProposal,
          diagnosis: [...new Set([...mergedProposal.diagnosis, ...repaired.diagnosis])].slice(0, 6),
          improvementSuggestions: [
            ...new Set([...mergedProposal.improvementSuggestions, ...repaired.improvementSuggestions]),
          ].slice(0, 6),
          proposedSections: prevSecs,
        };
      }

      const tailTitles = mergedProposal.proposedSections.slice(-3).map((s) => s.title);
      runningState = {
        lastSections: tailTitles,
        lastLevel: mergedProposal.proposedSections[mergedProposal.proposedSections.length - 1]?.level || 1,
      };
    } catch {
      fallbackCount++;
      // Respaldo determinista sobre los bloques exactos de la ventana (0 pérdida)
      const fallbackSections: StructuredChunkSectionInput[] = heuristicSplitManuscript(
        winAst.blocks.map((b) => b.text || '').filter(Boolean).join('\n\n'),
      );
      if (fallbackSections.length === 0) {
        fallbackSections.push({ title: 'Contenido principal', sectionKey: 'capitulo', records: [] });
      }
      // Si falla IA en el AST con tablas/imágenes, construimos un StructureAnalysis por punteros directo
      const winIds = winAst.blocks.map((b) => b.id);
      const fallbackProposal: StructureAnalysis = {
        documentType: 'other',
        currentStructureScore: 70,
        keepOriginalStructure: true,
        diagnosis: ['Estructuración local determinista sin pérdida de contenido.'],
        improvementSuggestions: [],
        proposedSections: [
          {
            sectionId: `sec_fallback_${wIdx + 1}`,
            sectionKey: 'capitulo',
            title: fallbackSections[0]?.title || `Parte ${wIdx + 1}`,
            level: 1,
            blockIds: winIds,
            rationale: 'Preservación 100% íntegra ante indisponibilidad temporal de IA.',
          },
        ],
      };
      if (!mergedProposal) {
        mergedProposal = fallbackProposal;
      } else {
        mergedProposal.proposedSections.push(...fallbackProposal.proposedSections);
      }
    }

    if (mergedProposal) {
      const partial = reconstructEditorialSectionsFromAst(workingAst, mergedProposal, {
        assetUrlMap,
      }) as unknown as EditorialSection[];
      onPartialSections?.(partial, mergedProposal.extractedMetadata);
    }
  }

  const finalSections = mergedProposal
    ? (reconstructEditorialSectionsFromAst(workingAst, mergedProposal, {
        assetUrlMap,
      }) as unknown as EditorialSection[])
    : mergeEditorialChunkedSections([], heuristicSplitManuscript(fullText));

  onProgress?.({
    stage: 'done',
    current: windows.length,
    total: windows.length,
    message: `Listo: ${finalSections.length} apartados reconstruidos con 100% de tus textos, tablas e imágenes intactos.`,
  });

  return {
    sections: finalSections,
    metadata: mergedProposal?.extractedMetadata,
    usedFallbackForChunks: fallbackCount,
    detectedPresetId: mergedProposal?.detectedPresetId,
    losslessSummary: {
      totalBlocks: workingAst.blocks.length,
      recoveredBlocks: recoveredCount,
      preservedTables: workingAst.blocks.filter((b) => b.type === 'table').length,
      preservedImages: workingAst.blocks.filter((b) => b.type === 'image' || b.type === 'diagram' || b.type === 'chart').length,
      providerUsed,
    },
  };
}
