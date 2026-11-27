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
import { encodeImageFileWithinBudget } from '../../../shared/core/cv-import/pageImageEncoder';
import { localAssetStore } from '../../../shared/core/storage/localAssetStore';
import {
  CanonicalBlock,
  DocumentAST,
  StructureAnalysis,
  StructureAnalysisSchema,
  StructureAuditIssue,
  buildCompactSkeleton,
  buildDeterministicProposalFromAst,
  buildPanoramicDocumentMap,
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
} from './editorialManuscriptChunker';
import {
  extractDocxInClient,
  type DocxExtractedRichBlock,
  type ImportedTocEntry,
} from './docxClientExtractor';
import { extractOdtInClient } from './odtClientExtractor';
import { extractEditorialFromPdfFile } from './pdfEditorialExtractor';

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
  sourceFormat?: 'docx' | 'odt' | 'pdf' | 'text' | 'image';
  richBlocks?: DocxExtractedRichBlock[];
  importedTocEntries?: ImportedTocEntry[];
  ast?: DocumentAST;
  assetUrlMap?: Record<string, string>;
  warnings?: string[];
}

export interface StructureResult {
  sections: EditorialSection[];
  metadata?: { title?: string; subtitle?: string; author?: string };
  legalFields?: {
    institucion?: string;
    catedra?: string;
    docente?: string;
    integrantes?: string;
    tema?: string;
  };
  usedFallbackForChunks: number;
  detectedPresetId?: string;
  recommendedStructuralNormId?: string;
  recommendedBibliographyStyle?: string;
  auditIssues?: StructureAuditIssue[];
  losslessSummary?: {
    totalBlocks: number;
    recoveredBlocks: number;
    preservedTables: number;
    preservedImages: number;
    providerUsed: string;
  };
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const AST_SINGLE_PASS_TOKEN_LIMIT = 45_000;
const AST_WINDOW_BLOCK_CHARS = 58_000;

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

interface RawExtractedPageItem {
  page: number;
  text: string;
  heading?: string | null;
  croppedFigures: Array<{ label: string; bbox: number[]; dataUrl: string }>;
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
  const allImportedTocEntries: ImportedTocEntry[] = [];
  const allWarnings: string[] = [];
  let totalDigital = 0;
  let totalOcr = 0;
  let totalPdfPages = 0;
  let detectedMime: DocumentAST['sourceMime'] = 'text/plain';
  let sourceFormat: ExtractedDocumentStats['sourceFormat'] = 'text';

  for (let i = 0; i < files.length; i++) {
    if (signal?.aborted) throw new Error('Importación cancelada.');
    const file = files[i];
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`"${file.name}" supera el límite de 50 MB por archivo.`);
    }

    const ext = getFileExtension(file.name);
    const headBuf = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
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
      sourceFormat = 'docx';
      onProgress?.({
        stage: 'reading',
        current: i + 1,
        total: files.length,
        message: `Despiezando Word sin pérdidas (texto, tablas, ecuaciones, imágenes y notas) de "${file.name}"...`,
      });
      try {
        const docxRes = await extractDocxInClient(file);
        if (docxRes.blocks.length > 0) {
          allRichBlocks.push(...docxRes.blocks);
        }
        if (docxRes.importedTocEntries?.length) {
          allImportedTocEntries.push(...docxRes.importedTocEntries);
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

    if (ext === '.odt') {
      detectedMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      sourceFormat = 'odt';
      onProgress?.({
        stage: 'reading',
        current: i + 1,
        total: files.length,
        message: `Despiezando LibreOffice (.odt) sin pérdidas de "${file.name}"...`,
      });
      try {
        const odtRes = await extractOdtInClient(file);
        if (odtRes.blocks.length > 0) allRichBlocks.push(...odtRes.blocks);
        if (odtRes.importedTocEntries?.length) allImportedTocEntries.push(...odtRes.importedTocEntries);
        if (odtRes.warnings.length > 0) allWarnings.push(...odtRes.warnings);
        if (odtRes.plainMarkdownText.trim()) {
          segments.push(odtRes.plainMarkdownText.trim());
          continue;
        }
      } catch {
        // Fallback al parser del servidor si falla descompresión local
      }
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

    if (ext === '.rtf' || ext === '.html' || ext === '.htm') {
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
      sourceFormat = 'pdf';
      const pdfRes = await extractEditorialFromPdfFile(file, { onProgress, signal });
      totalDigital += pdfRes.digitalPages;
      totalOcr += pdfRes.ocrPages;
      totalPdfPages += pdfRes.totalPages;
      if (pdfRes.blocks.length > 0) allRichBlocks.push(...pdfRes.blocks);
      if (pdfRes.importedTocEntries.length > 0) allImportedTocEntries.push(...pdfRes.importedTocEntries);
      if (pdfRes.warnings.length > 0) allWarnings.push(...pdfRes.warnings);
      if (pdfRes.plainMarkdownText.trim()) segments.push(pdfRes.plainMarkdownText.trim());
      continue;
    }

    if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp') {
      if (safeMagic !== 'png' && safeMagic !== 'jpeg' && safeMagic !== 'webp') {
        throw new Error(`"${file.name}" no tiene firma binaria de imagen válida.`);
      }
      detectedMime = 'image/png';
      sourceFormat = 'image';
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
  if (!combined && allRichBlocks.length === 0) {
    throw new Error('No encontramos texto legible en los archivos seleccionados.');
  }

  const { ast, assetUrlMap } = await buildDocumentAstFromRawInputs({
    sourceName: files[0]?.name || 'manuscrito.txt',
    sourceMime: detectedMime,
    fullText: combined || 'Documento con contenido visual',
    richBlocks: allRichBlocks.length > 0 ? allRichBlocks : undefined,
    pageItems: allPdfPageItems.length > 0 ? allPdfPageItems : undefined,
    totalPages:
      totalPdfPages > 0
        ? totalPdfPages
        : allPdfPageItems.length > 0
          ? allPdfPageItems[allPdfPageItems.length - 1].page
          : undefined,
  });

  return {
    text: combined,
    totalFiles: files.length,
    pdfDigitalPages: totalDigital,
    ocrPages: totalOcr,
    sourceFormat,
    ...(allRichBlocks.length > 0 ? { richBlocks: allRichBlocks } : {}),
    ...(allImportedTocEntries.length > 0 ? { importedTocEntries: allImportedTocEntries } : {}),
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
  sourceFormat?: 'docx' | 'odt' | 'pdf' | 'text' | 'image';
  richBlocks?: DocxExtractedRichBlock[];
  importedTocEntries?: ImportedTocEntry[];
  ast?: DocumentAST;
  assetUrlMap?: Record<string, string>;
  presetId?: EditorialPresetId;
  onProgress?: (update: ImportProgressUpdate) => void;
  onPartialSections?: (sectionsSoFar: EditorialSection[], metadata?: StructureResult['metadata']) => void;
  signal?: AbortSignal;
}): Promise<StructureResult> {
  const { fullText, sourceFormat, richBlocks, importedTocEntries, presetId, onProgress, onPartialSections, signal } = params;

  // Vía determinística Zero-Loss cuando el Word (.docx) trae encabezados OOXML reales (Heading 1/2)
  if (
    sourceFormat === 'docx' &&
    richBlocks &&
    richBlocks.some((b) => b.kind === 'heading' && typeof b.text === 'string' && b.text.trim().length > 0)
  ) {
    const richSections = buildSectionsFromDocxRichBlocks(richBlocks);
    if (richSections.length > 0) {
      const firstLine = richSections[0]?.title;
      const meta = firstLine && firstLine !== 'Cuerpo principal' ? { title: firstLine } : undefined;
      const docxAudit: StructureAuditIssue[] = [];
      const seenDocxTitles = new Map<string, string>();
      richSections.forEach((sec) => {
        const norm = sec.title.trim().toLowerCase();
        if (sec.records.length === 0) {
          docxAudit.push({
            type: 'empty_section',
            title: `Apartado sin contenido: "${sec.title}"`,
            detail: 'Este capítulo apareció sin bloques debajo en el Word original.',
          });
        }
        if (norm.length >= 4) {
          if (seenDocxTitles.has(norm)) {
            docxAudit.push({
              type: 'duplicate_heading',
              title: `Título repetido: "${sec.title}"`,
              detail: 'Podés unir estos apartados o renombrar uno desde el listado.',
            });
          } else {
            seenDocxTitles.set(norm, sec.title);
          }
        }
      });
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
        ...(docxAudit.length > 0 ? { auditIssues: docxAudit } : {}),
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

  const panoramicMap = buildPanoramicDocumentMap(workingAst, { importedTocEntries });
  const estimatedTokens = Math.ceil(panoramicMap.length / 4);
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
    const winMap =
      windows.length === 1
        ? panoramicMap
        : buildPanoramicDocumentMap(winAst, {
            importedTocEntries: wIdx === 0 ? importedTocEntries : undefined,
          });

    onProgress?.({
      stage: 'structuring',
      current: wIdx + 1,
      total: windows.length,
      message:
        windows.length === 1
          ? 'Analizando el mapa completo de la obra sin perder ninguna palabra, tabla ni imagen...'
          : `Analizando estructura sin pérdidas (parte ${wIdx + 1} de ${windows.length})...`,
    });

    try {
      const useLongRoute = windows.length === 1 && estimatedTokens > 25_000;
      const res = await executeAiTask<any>({
        taskId: useLongRoute ? 'editorial_analyze_ast_structure_long' : 'editorial_analyze_ast_structure',
        payload: {
          skeleton: winMap,
          currentPresetId: presetId || 'libro-ensayo-novela',
          sourceName: winAst.sourceName,
          totalPages: winAst.totalPages,
          runningState,
        },
        maxTokens: 8192,
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
          auditIssues: [
            ...(mergedProposal.auditIssues || []),
            ...(repaired.auditIssues || []),
          ].slice(0, 12),
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
      // Respaldo determinista multi-capítulo real sobre los bloques exactos de la ventana (0 pérdida)
      const detProposal = buildDeterministicProposalFromAst(winAst, {
        importedTocEntries: wIdx === 0 ? importedTocEntries : undefined,
      });
      const { repaired } = repairProposalToLosslessBijection(winAst, detProposal);
      if (!mergedProposal) {
        mergedProposal = repaired;
      } else {
        mergedProposal.proposedSections.push(...repaired.proposedSections);
        mergedProposal.auditIssues = [
          ...(mergedProposal.auditIssues || []),
          ...(repaired.auditIssues || []),
        ];
      }
    }

    if (mergedProposal) {
      const partial = reconstructEditorialSectionsFromAst(workingAst, mergedProposal, {
        assetUrlMap,
      }) as unknown as EditorialSection[];
      onPartialSections?.(
        partial,
        mergedProposal.extractedMetadata
          ? {
              title: mergedProposal.extractedMetadata.title ?? undefined,
              subtitle: mergedProposal.extractedMetadata.subtitle ?? undefined,
              author: mergedProposal.extractedMetadata.author ?? undefined,
            }
          : undefined,
      );
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

  const cleanMeta = mergedProposal?.extractedMetadata
    ? {
        title: mergedProposal.extractedMetadata.title ?? undefined,
        subtitle: mergedProposal.extractedMetadata.subtitle ?? undefined,
        author: mergedProposal.extractedMetadata.author ?? undefined,
      }
    : undefined;

  const cleanLegal = mergedProposal?.extractedLegalFields
    ? {
        ...(mergedProposal.extractedLegalFields.institucion
          ? { institucion: mergedProposal.extractedLegalFields.institucion }
          : {}),
        ...(mergedProposal.extractedLegalFields.catedra
          ? { catedra: mergedProposal.extractedLegalFields.catedra }
          : {}),
        ...(mergedProposal.extractedLegalFields.docente
          ? { docente: mergedProposal.extractedLegalFields.docente }
          : {}),
        ...(mergedProposal.extractedLegalFields.integrantes
          ? { integrantes: mergedProposal.extractedLegalFields.integrantes }
          : {}),
        ...(mergedProposal.extractedLegalFields.tema
          ? { tema: mergedProposal.extractedLegalFields.tema }
          : {}),
      }
    : undefined;

  return {
    sections: finalSections,
    metadata: cleanMeta,
    legalFields: cleanLegal,
    usedFallbackForChunks: fallbackCount,
    detectedPresetId: mergedProposal?.detectedPresetId ?? undefined,
    recommendedStructuralNormId: mergedProposal?.recommendedStructuralNormId ?? undefined,
    recommendedBibliographyStyle: mergedProposal?.recommendedBibliographyStyle ?? undefined,
    auditIssues: mergedProposal?.auditIssues ?? undefined,
    losslessSummary: {
      totalBlocks: workingAst.blocks.length,
      recoveredBlocks: recoveredCount,
      preservedTables: workingAst.blocks.filter((b) => b.type === 'table').length,
      preservedImages: workingAst.blocks.filter((b) => b.type === 'image' || b.type === 'diagram' || b.type === 'chart').length,
      providerUsed,
    },
  };
}
