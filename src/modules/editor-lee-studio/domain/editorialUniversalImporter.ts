/**
 * Importador Universal Editorial (editorialUniversalImporter.ts)
 *
 * Lee documentos extensos de múltiples fuentes conservando su contenido completo:
 * - Texto plano y Markdown (.txt, .md) en el navegador.
 * - Documentos Word, LibreOffice, RTF y HTML (.docx, .odt, .rtf, .html) vía backend.
 * - PDF híbrido: extrae texto directo sin rasterizar cuando hay capa digital legible
 *   (`analyzePdfPage`), y aplica OCR por Visión (`editorial_ocr_page`) únicamente en
 *   páginas escaneadas o sin texto seleccionable.
 * - Imágenes y fotos de apuntes/libros (.png, .jpg, .jpeg, .webp) vía `encodeImageFileWithinBudget`
 *   + OCR por Visión (`editorial_ocr_page`).
 * - Estructuración por fragmentos largos (`splitTextIntoManuscriptChunks`) guardando
 *   progreso incremental capítulo a capítulo.
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
import type { EditorialPresetId, EditorialSection } from './editorialTypes';
import {
  buildSectionsFromDocxRichBlocks,
  countNonWhitespaceChars,
  countSectionRecordsChars,
  splitTextIntoManuscriptChunks,
  mergeEditorialChunkedSections,
  heuristicSplitManuscript,
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
  warnings?: string[];
}

export interface StructureResult {
  sections: EditorialSection[];
  metadata?: { title?: string; subtitle?: string; author?: string };
  usedFallbackForChunks: number;
}

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_PDF_PAGES = 120;

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

async function runVisionOcrOnImage(
  encoded: { mimeType: 'image/png' | 'image/jpeg' | 'image/webp'; base64: string },
  pageNumber?: number,
): Promise<string> {
  const res = await executeAiTask<{ extractedText: string; detectedHeading?: string | null }>({
    taskId: 'editorial_ocr_page',
    payload: {
      images: [encoded],
      pageNumber,
    },
    maxTokens: 2400,
    temperature: 0.1,
  });

  const heading =
    typeof res.data?.detectedHeading === 'string' ? res.data.detectedHeading.trim() : '';
  const body =
    typeof res.data?.extractedText === 'string' ? res.data.extractedText.trim() : '';
  if (!body) return heading ? `# ${heading}` : '';
  return heading && !body.startsWith(heading) ? `# ${heading}\n\n${body}` : body;
}

async function extractTextFromSinglePdf(
  file: File,
  onProgress?: (update: ImportProgressUpdate) => void,
  signal?: AbortSignal,
): Promise<{ text: string; digitalPages: number; ocrPages: number }> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await loadPdfDocumentWithCmaps(buffer);
  const totalPages = Math.min(Number(pdfDoc.numPages) || 0, MAX_PDF_PAGES);
  if (totalPages === 0) {
    throw new Error(`El PDF "${file.name}" no contiene páginas legibles.`);
  }

  const pageTexts: string[] = [];
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
        message: `Leyendo texto digital de "${file.name}" (página ${p} de ${totalPages})...`,
      });
      if (analyzed.text.trim()) {
        pageTexts.push(analyzed.text.trim());
      }
      continue;
    }

    // Página escaneada o trazada como imagen -> OCR por Visión solo donde hace falta
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
    const ocrText = await runVisionOcrOnImage(encoded, p);
    if (ocrText.trim()) {
      pageTexts.push(ocrText.trim());
    }
  }

  return {
    text: pageTexts.join('\n\n'),
    digitalPages,
    ocrPages,
  };
}

/**
 * Extrae el texto íntegro de uno o varios archivos (Word, LibreOffice, PDF, fotos o texto).
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
  const allWarnings: string[] = [];
  let totalDigital = 0;
  let totalOcr = 0;

  for (let i = 0; i < files.length; i++) {
    if (signal?.aborted) throw new Error('Importación cancelada.');
    const file = files[i];
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`"${file.name}" supera el límite de 15 MB por archivo.`);
    }

    const ext = getFileExtension(file.name);

    if (ext === '.txt' || ext === '.md') {
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
      onProgress?.({
        stage: 'reading',
        current: i + 1,
        total: files.length,
        message: `Leyendo Word completo (texto, tablas, imágenes y gráficos) de "${file.name}"...`,
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
      } catch {
        // Fallback al parser del servidor si el XML local falla
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
      const pdfRes = await extractTextFromSinglePdf(file, onProgress, signal);
      totalDigital += pdfRes.digitalPages;
      totalOcr += pdfRes.ocrPages;
      if (pdfRes.text.trim()) segments.push(pdfRes.text.trim());
      allWarnings.push(
        `El archivo PDF "${file.name}" perdió parte de su estructura al importarlo. Si tenés el archivo original de Word, cargalo para conservar títulos, tablas, poemas y notas con mayor fidelidad.`,
      );
      continue;
    }

    if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp') {
      totalOcr++;
      onProgress?.({
        stage: 'ocr',
        current: i + 1,
        total: files.length,
        message: `Leyendo imagen "${file.name}" (${i + 1} de ${files.length})...`,
      });
      const encoded = await encodeImageFileWithinBudget(file);
      const text = await runVisionOcrOnImage(encoded, i + 1);
      if (text.trim()) segments.push(text.trim());
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

  return {
    text: combined,
    totalFiles: files.length,
    pdfDigitalPages: totalDigital,
    ocrPages: totalOcr,
    ...(allRichBlocks.length > 0 ? { richBlocks: allRichBlocks } : {}),
    ...(allWarnings.length > 0 ? { warnings: allWarnings } : {}),
  };
}

/**
 * Envía el texto completo a `editorial_structure` en fragmentos continuos, uniendo capítulos largos
 * y aplicando guardia matemática de retención (>= 92%) + respaldo heurístico local para no perder jamás texto.
 */
export async function structureManuscriptInChunks(params: {
  fullText: string;
  richBlocks?: DocxExtractedRichBlock[];
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
      };
    }
  }

  const chunks = splitTextIntoManuscriptChunks(fullText, 3800);
  if (chunks.length === 0) {
    return { sections: [], usedFallbackForChunks: 0 };
  }

  let sectionsAcc: EditorialSection[] = [];
  let detectedMetadata: StructureResult['metadata'] | undefined;
  let fallbackCount = 0;
  let aiQuotaExhausted = false;

  for (let idx = 0; idx < chunks.length; idx++) {
    if (signal?.aborted) break;

    const previousSectionTitle =
      sectionsAcc.length > 0 ? sectionsAcc[sectionsAcc.length - 1].title : undefined;

    onProgress?.({
      stage: 'structuring',
      current: idx + 1,
      total: chunks.length,
      message:
        chunks.length === 1
          ? 'Organizando capítulos y apartados con IA...'
          : `Detectando capítulos y secciones (parte ${idx + 1} de ${chunks.length})...`,
    });

    if (aiQuotaExhausted) {
      fallbackCount++;
      sectionsAcc = mergeEditorialChunkedSections(
        sectionsAcc,
        heuristicSplitManuscript(chunks[idx]),
      );
      onPartialSections?.(sectionsAcc, detectedMetadata);
      continue;
    }

    try {
      const res = await executeAiTask<{
        sections: StructuredChunkSectionInput[];
        metadata?: { title?: string; subtitle?: string; author?: string };
      }>({
        taskId: 'editorial_structure',
        payload: {
          manuscriptText: chunks[idx],
          presetId,
          chunkIndex: idx,
          totalChunks: chunks.length,
          previousSectionTitle,
        },
        maxTokens: 8192,
        temperature: 0.15,
      });

      if (res.data?.metadata && !detectedMetadata) {
        detectedMetadata = res.data.metadata;
      }

      const incomingSections = Array.isArray(res.data?.sections) ? res.data.sections : [];
      const inputChars = countNonWhitespaceChars(chunks[idx]);
      const outputChars = countSectionRecordsChars(incomingSections);
      const retainedEnough = incomingSections.length > 0 && outputChars >= inputChars * 0.90;

      if (retainedEnough) {
        sectionsAcc = mergeEditorialChunkedSections(sectionsAcc, incomingSections);
      } else {
        fallbackCount++;
        sectionsAcc = mergeEditorialChunkedSections(
          sectionsAcc,
          heuristicSplitManuscript(chunks[idx]),
        );
      }
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (/429|cuota|límite diario|rate.?limit/i.test(msg)) {
        aiQuotaExhausted = true;
      }
      fallbackCount++;
      sectionsAcc = mergeEditorialChunkedSections(
        sectionsAcc,
        heuristicSplitManuscript(chunks[idx]),
      );
    }

    onPartialSections?.(sectionsAcc, detectedMetadata);
  }

  onProgress?.({
    stage: 'done',
    current: chunks.length,
    total: chunks.length,
    message: `Listo: ${sectionsAcc.length} secciones organizadas en tu barra lateral.`,
  });

  return {
    sections: sectionsAcc,
    metadata: detectedMetadata,
    usedFallbackForChunks: fallbackCount,
  };
}
