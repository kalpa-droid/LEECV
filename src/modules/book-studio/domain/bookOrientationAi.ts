/**
 * Motor de Orientación Inteligente para Libro Folleto (bookOrientationAi.ts)
 *
 * Resuelve el giro de páginas en PDFs escaneados / fotocopias (2 págs/hoja o verticales)
 * en 3 niveles:
 *   1. Capa 0 local (0 ms, sin red): inspecciona la matriz `transform` de PDF.js si hay
 *      capa OCR embebida coherente.
 *   2. Fase 1 — Muestreo rápido IA ([2, 5, 10, 15] adaptativo): envía hasta 4 miniaturas
 *      comprimidas en 1 sola petición y evalúa si hay consenso uniforme (+90°, -90°, 180°, 0°)
 *      o si las hojas están mezcladas para distintos lados.
 *   3. Fase 2 — Escaneo completo asistido por IA (bajo confirmación del usuario cuando
 *      hay orientación mixta): usa lotes de 4 imágenes individuales (≤ 16 págs.) o
 *      grillas 2×2 etiquetadas (hasta 16 págs. por petición en libros largos).
 */

import { executeAiTask } from '../../../shared/core/ai/aiClient';

export type TextTopEdge = 'top' | 'right' | 'bottom' | 'left' | 'unclear';
export type RotationAngleDeg = 0 | 90 | 180 | 270;

export interface PageOrientationSample {
  pdfPage: number;
  textTopEdge: TextTopEdge;
  rotationDeg: RotationAngleDeg | null;
  confidence: 'high' | 'medium' | 'low';
  sampleWords?: string | null;
}

export interface OrientationConsensusResult {
  status: 'uniform' | 'mixed' | 'unclear';
  uniformRotationDeg: RotationAngleDeg | null;
  samples: PageOrientationSample[];
  rightTurnPages: number[];   // +90° (horario / derecha)
  leftTurnPages: number[];    // 270° (-90° antihorario / izquierda)
  upsideDownPages: number[];  // 180°
  uprightPages: number[];     // 0°
  summaryText: string;
}

export interface OrientationBatchSpec {
  mode: 'single' | 'grid2x2';
  /** Cada elemento representa 1 imagen adjunta al request (1 pág en single, hasta 4 en grid2x2). */
  imageGroups: number[][];
}

/**
 * Convierte el borde hacia donde apunta la cabeza de las letras en el giro horario
 * necesario en PDF.js para que el texto quede derecho (cabeza arriba).
 */
export function textTopEdgeToRotationDeg(edge: TextTopEdge): RotationAngleDeg | null {
  switch (edge) {
    case 'top':
      return 0;
    case 'left':
      return 90;  // Cabeza a la izquierda → girar 90° a la derecha (horario)
    case 'bottom':
      return 180; // Patas para arriba → girar 180°
    case 'right':
      return 270; // Cabeza a la derecha → girar 90° a la izquierda (270° horario)
    default:
      return null;
  }
}

/**
 * Selecciona hasta 4 páginas representativas (por defecto [2, 5, 10, 15])
 * adaptándose al total de páginas del PDF y excluyendo páginas eliminadas.
 */
export function selectBookSamplePages(
  totalPages: number,
  deletedPages: ReadonlyArray<number | string> = [],
  preferred: readonly number[] = [2, 5, 10, 15],
): number[] {
  if (!Number.isFinite(totalPages) || totalPages <= 0) return [];
  const deletedSet = new Set(deletedPages.map((p) => Number(String(p).split('_')[0])));
  const activePages: number[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (!deletedSet.has(p)) activePages.push(p);
  }
  if (activePages.length === 0) return [];
  if (activePages.length <= 4) return activePages;

  const validPreferred = preferred.filter((p) => p >= 1 && p <= totalPages && !deletedSet.has(p));
  if (validPreferred.length >= 3) {
    return validPreferred.slice(0, 4);
  }

  // Distribución proporcional evitando la página 1 (suele ser tapa sin texto normal)
  const pool = activePages.length > 4 ? activePages.slice(1) : activePages;
  const result: number[] = [];
  const count = Math.min(4, pool.length);
  for (let i = 0; i < count; i++) {
    const idx = Math.min(pool.length - 1, Math.round((i * (pool.length - 1)) / Math.max(1, count - 1)));
    if (!result.includes(pool[idx])) {
      result.push(pool[idx]);
    }
  }
  return result;
}

/**
 * Capa 0 (Local, 0 ms): intenta deducir la rotación a partir de la matriz `transform`
 * de los TextItem de PDF.js si el escaneo ya contiene texto OCR embebido coherente.
 */
export function detectLocalPageOrientationFromTextItems(
  items: ReadonlyArray<{ str?: string; transform?: number[] | ArrayLike<number> }>,
): { rotationDeg: RotationAngleDeg; wordCount: number } | null {
  if (!Array.isArray(items) || items.length === 0) return null;

  const votes: Record<RotationAngleDeg, number> = { 0: 0, 90: 0, 180: 0, 270: 0 };
  let totalWords = 0;

  for (const item of items) {
    const raw = typeof item?.str === 'string' ? item.str.trim() : '';
    if (!raw) continue;
    const words = (raw.match(/\p{L}{2,}/gu) || []).length;
    if (words === 0) continue;

    const t = item.transform;
    if (!t || t.length < 4) continue;
    const a = Number(t[0]);
    const b = Number(t[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b) || (Math.abs(a) < 1e-4 && Math.abs(b) < 1e-4)) {
      continue;
    }

    // En coordenadas PDF (Y crece hacia arriba):
    // - Texto normal horizontal: a > 0, b ≈ 0 → 0°
    // - Texto vertical con cabeza hacia la izquierda (baseline sube +Y): a ≈ 0, b > 0 → girar +90° horario
    // - Texto vertical con cabeza hacia la derecha (baseline baja -Y): a ≈ 0, b < 0 → girar 270° (-90°)
    // - Texto invertido 180°: a < 0, b ≈ 0 → girar 180°
    let angleVote: RotationAngleDeg = 0;
    if (Math.abs(a) >= Math.abs(b)) {
      angleVote = a >= 0 ? 0 : 180;
    } else {
      angleVote = b >= 0 ? 90 : 270;
    }

    votes[angleVote] += words;
    totalWords += words;
  }

  if (totalWords < 12) return null;

  const entries = (Object.entries(votes) as Array<[string, number]>).sort((x, y) => y[1] - x[1]);
  const [winnerAngle, winnerVotes] = entries[0];
  if (winnerVotes / totalWords >= 0.75) {
    return {
      rotationDeg: Number(winnerAngle) as RotationAngleDeg,
      wordCount: totalWords,
    };
  }
  return null;
}

function formatRotationLabel(deg: RotationAngleDeg): string {
  if (deg === 90) return '90° a la derecha';
  if (deg === 270) return '90° a la izquierda';
  if (deg === 180) return '180° (media vuelta)';
  return 'sin giro (0°)';
}

/**
 * Evalúa si las páginas muestreadas coinciden en un único sentido de giro
 * o si presentan orientaciones mezcladas.
 */
export function evaluateOrientationConsensus(
  samples: readonly PageOrientationSample[],
): OrientationConsensusResult {
  const valid = samples.filter((s) => s.rotationDeg !== null && s.confidence !== 'low');

  const rightTurnPages = valid.filter((s) => s.rotationDeg === 90).map((s) => s.pdfPage);
  const leftTurnPages = valid.filter((s) => s.rotationDeg === 270).map((s) => s.pdfPage);
  const upsideDownPages = valid.filter((s) => s.rotationDeg === 180).map((s) => s.pdfPage);
  const uprightPages = valid.filter((s) => s.rotationDeg === 0).map((s) => s.pdfPage);

  if (valid.length === 0) {
    return {
      status: 'unclear',
      uniformRotationDeg: null,
      samples: [...samples],
      rightTurnPages,
      leftTurnPages,
      upsideDownPages,
      uprightPages,
      summaryText: 'No encontramos suficiente texto legible en las páginas de muestra para decidir el giro.',
    };
  }

  const distinctAngles = Array.from(new Set(valid.map((s) => s.rotationDeg as RotationAngleDeg)));

  if (distinctAngles.length === 1) {
    const angle = distinctAngles[0];
    return {
      status: 'uniform',
      uniformRotationDeg: angle,
      samples: [...samples],
      rightTurnPages,
      leftTurnPages,
      upsideDownPages,
      uprightPages,
      summaryText:
        angle === 0
          ? 'Las páginas muestreadas ya están derechas.'
          : `Todas las muestras coinciden: giro automático de ${formatRotationLabel(angle)}.`,
    };
  }

  const parts: string[] = [];
  if (rightTurnPages.length > 0) parts.push(`pág. ${rightTurnPages.join(', ')} hacia la derecha (+90°)`);
  if (leftTurnPages.length > 0) parts.push(`pág. ${leftTurnPages.join(', ')} hacia la izquierda (-90°)`);
  if (upsideDownPages.length > 0) parts.push(`pág. ${upsideDownPages.join(', ')} patas para arriba (180°)`);
  if (uprightPages.length > 0) parts.push(`pág. ${uprightPages.join(', ')} ya derechas (0°)`);

  return {
    status: 'mixed',
    uniformRotationDeg: null,
    samples: [...samples],
    rightTurnPages,
    leftTurnPages,
    upsideDownPages,
    uprightPages,
    summaryText: `Detectamos páginas giradas para distintos lados (${parts.join(' · ')}).`,
  };
}

/**
 * Planifica los lotes para escanear todas las páginas con IA:
 * - Libros de hasta 16 páginas activas: páginas individuales (hasta 4 imágenes por request).
 * - Libros de más de 16 páginas activas: grillas 2×2 (hasta 4 grillas = 16 páginas por request).
 */
export function planFullBookOrientationBatches(activePages: readonly number[]): OrientationBatchSpec[] {
  if (activePages.length === 0) return [];

  if (activePages.length <= 16) {
    const batches: OrientationBatchSpec[] = [];
    for (let i = 0; i < activePages.length; i += 4) {
      const slice = activePages.slice(i, i + 4);
      batches.push({
        mode: 'single',
        imageGroups: slice.map((p) => [p]),
      });
    }
    return batches;
  }

  // Modo grid2x2: cada imagen agrupa hasta 4 páginas, y cada request lleva hasta 4 imágenes (16 págs)
  const cellsPerGrid: number[][] = [];
  for (let i = 0; i < activePages.length; i += 4) {
    cellsPerGrid.push(activePages.slice(i, i + 4));
  }

  const batches: OrientationBatchSpec[] = [];
  for (let i = 0; i < cellsPerGrid.length; i += 4) {
    batches.push({
      mode: 'grid2x2',
      imageGroups: cellsPerGrid.slice(i, i + 4),
    });
  }
  return batches;
}

/** Renderiza una página cruda (rotation 0) en un canvas liviano para inspección de orientación. */
async function renderRawPageCanvas(pdfDoc: any, pageNum: number, targetLongSide = 620): Promise<HTMLCanvasElement> {
  const page = await pdfDoc.getPage(pageNum);
  try {
    const unscaled = page.getViewport({ scale: 1.0, rotation: 0 });
    const longSide = Math.max(unscaled.width, unscaled.height, 1);
    const scale = Math.min(2.0, Math.max(0.5, targetLongSide / longSide));
    const vp = page.getViewport({ scale, rotation: 0 });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(vp.width));
    canvas.height = Math.max(1, Math.floor(vp.height));
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgb(255, 255, 255)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
    }
    return canvas;
  } finally {
    try {
      page.cleanup?.();
    } catch {
      // ignore cleanup errors
    }
  }
}

function canvasToCompressedJpeg(canvas: HTMLCanvasElement, quality = 0.54): { mimeType: 'image/jpeg'; base64: string } {
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const base64 = dataUrl.split(',')[1] || '';
  canvas.width = 0;
  canvas.height = 0;
  return { mimeType: 'image/jpeg', base64 };
}

/** Compone hasta 4 páginas en una grilla 2×2 de 1040×1040 px con etiqueta "Pág. X" visible. */
async function renderGrid2x2Image(
  pdfDoc: any,
  pages: readonly number[],
): Promise<{ mimeType: 'image/jpeg'; base64: string }> {
  const cellSize = 520;
  const grid = document.createElement('canvas');
  grid.width = cellSize * 2;
  grid.height = cellSize * 2;
  const ctx = grid.getContext('2d');
  if (!ctx) throw new Error('No se pudo inicializar el lienzo de compresión.');

  ctx.fillStyle = 'rgb(241, 245, 249)';
  ctx.fillRect(0, 0, grid.width, grid.height);

  for (let idx = 0; idx < Math.min(4, pages.length); idx++) {
    const pageNum = pages[idx];
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x0 = col * cellSize;
    const y0 = row * cellSize;

    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillRect(x0 + 4, y0 + 4, cellSize - 8, cellSize - 8);

    const pageCanvas = await renderRawPageCanvas(pdfDoc, pageNum, cellSize - 32);
    const scale = Math.min((cellSize - 24) / pageCanvas.width, (cellSize - 42) / pageCanvas.height);
    const drawW = Math.round(pageCanvas.width * scale);
    const drawH = Math.round(pageCanvas.height * scale);
    const dx = x0 + Math.round((cellSize - drawW) / 2);
    const dy = y0 + 26 + Math.round((cellSize - 32 - drawH) / 2);
    ctx.drawImage(pageCanvas, dx, dy, drawW, drawH);
    pageCanvas.width = 0;
    pageCanvas.height = 0;

    // Etiqueta superior de celda
    ctx.fillStyle = 'rgb(15, 23, 42)';
    ctx.fillRect(x0 + 6, y0 + 6, 92, 20);
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`Pág. ${pageNum}`, x0 + 14, y0 + 20);
  }

  return canvasToCompressedJpeg(grid, 0.54);
}

/**
 * Fase 1: Analiza las páginas de muestra ([2, 5, 10, 15]) combinando Capa 0 local
 * y 1 llamada de Visión IA con imágenes muy comprimidas.
 */
export async function analyzeSampleOrientationWithAi(params: {
  pdfDoc: any;
  totalPages: number;
  deletedPages?: ReadonlyArray<number | string>;
}): Promise<OrientationConsensusResult> {
  const { pdfDoc, totalPages, deletedPages = [] } = params;
  const samplePages = selectBookSamplePages(totalPages, deletedPages, [2, 5, 10, 15]);
  if (samplePages.length === 0) {
    return evaluateOrientationConsensus([]);
  }

  const localSamples: PageOrientationSample[] = [];
  const pagesNeedingVision: number[] = [];

  for (const pageNum of samplePages) {
    try {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const local = detectLocalPageOrientationFromTextItems(textContent?.items || []);
      try { page.cleanup?.(); } catch { /* ignore */ }
      if (local) {
        const edgeMap: Record<RotationAngleDeg, TextTopEdge> = {
          0: 'top',
          90: 'left',
          180: 'bottom',
          270: 'right',
        };
        localSamples.push({
          pdfPage: pageNum,
          textTopEdge: edgeMap[local.rotationDeg],
          rotationDeg: local.rotationDeg,
          confidence: 'high',
        });
      } else {
        pagesNeedingVision.push(pageNum);
      }
    } catch {
      pagesNeedingVision.push(pageNum);
    }
  }

  if (pagesNeedingVision.length === 0) {
    return evaluateOrientationConsensus(localSamples);
  }

  const encodedImages: Array<{ mimeType: 'image/jpeg'; base64: string }> = [];
  const itemsPayload: Array<{ mode: 'single'; pages: number[] }> = [];

  for (const pageNum of pagesNeedingVision) {
    const c = await renderRawPageCanvas(pdfDoc, pageNum, 620);
    encodedImages.push(canvasToCompressedJpeg(c, 0.54));
    itemsPayload.push({ mode: 'single', pages: [pageNum] });
  }

  const aiRes = await executeAiTask<{
    pages: Array<{
      pdfPage: number;
      textTopEdge: TextTopEdge;
      confidence: 'high' | 'medium' | 'low';
      sampleWords?: string | null;
    }>;
  }>({
    taskId: 'book_detect_orientation',
    payload: {
      images: encodedImages,
      items: itemsPayload,
    },
    maxTokens: 900,
    temperature: 0.1,
  });

  const aiPages = Array.isArray(aiRes.data?.pages) ? aiRes.data.pages : [];
  const visionSamples: PageOrientationSample[] = pagesNeedingVision.map((pageNum, idx) => {
    const match = aiPages.find((p) => Number(p.pdfPage) === pageNum) || aiPages[idx];
    const edge: TextTopEdge = match?.textTopEdge || 'unclear';
    return {
      pdfPage: pageNum,
      textTopEdge: edge,
      rotationDeg: textTopEdgeToRotationDeg(edge),
      confidence: match?.confidence || 'low',
      sampleWords: match?.sampleWords ?? null,
    };
  });

  const combined = [...localSamples, ...visionSamples].sort((a, b) => a.pdfPage - b.pdfPage);
  return evaluateOrientationConsensus(combined);
}

/**
 * Fase 2: Escanea todas las páginas activas del PDF con imágenes ultra-comprimidas
 * (en lotes de 4 o grillas 2×2 de hasta 16 páginas por llamada) y devuelve el mapa
 * completo de rotaciones `Record<number, number>`.
 */
export async function analyzeFullBookOrientationWithAi(params: {
  pdfDoc: any;
  totalPages: number;
  deletedPages?: ReadonlyArray<number | string>;
  knownSamples?: ReadonlyArray<PageOrientationSample>;
  fallbackAngleDeg?: RotationAngleDeg;
  signal?: AbortSignal;
  onProgress?: (donePages: number, totalActivePages: number) => void;
}): Promise<{
  rotations: Record<number, number>;
  lowConfidencePages: number[];
}> {
  const {
    pdfDoc,
    totalPages,
    deletedPages = [],
    knownSamples = [],
    fallbackAngleDeg = 90,
    signal,
    onProgress,
  } = params;

  const deletedSet = new Set(deletedPages.map((p) => Number(String(p).split('_')[0])));
  const rotations: Record<number, number> = {};
  const lowConfidencePages: number[] = [];

  const knownMap = new Map<number, PageOrientationSample>();
  for (const s of knownSamples) {
    if (s.rotationDeg !== null && s.confidence !== 'low') {
      knownMap.set(s.pdfPage, s);
      rotations[s.pdfPage] = s.rotationDeg;
    }
  }

  const remainingPages: number[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (!deletedSet.has(p) && !knownMap.has(p)) {
      remainingPages.push(p);
    }
  }

  const totalActive = remainingPages.length + knownMap.size;
  let processed = knownMap.size;
  onProgress?.(processed, totalActive);

  const batches = planFullBookOrientationBatches(remainingPages);

  for (const batch of batches) {
    if (signal?.aborted) throw new Error('Análisis de orientación cancelado.');

    const images: Array<{ mimeType: 'image/jpeg'; base64: string }> = [];
    const items: Array<{ mode: 'single' | 'grid2x2'; pages: number[] }> = [];
    const batchPagesFlat: number[] = [];

    for (const group of batch.imageGroups) {
      batchPagesFlat.push(...group);
      if (batch.mode === 'grid2x2' && group.length > 1) {
        images.push(await renderGrid2x2Image(pdfDoc, group));
        items.push({ mode: 'grid2x2', pages: group });
      } else {
        const c = await renderRawPageCanvas(pdfDoc, group[0], 560);
        images.push(canvasToCompressedJpeg(c, 0.5));
        items.push({ mode: 'single', pages: [group[0]] });
      }
    }

    try {
      const res = await executeAiTask<{
        pages: Array<{
          pdfPage: number;
          textTopEdge: TextTopEdge;
          confidence: 'high' | 'medium' | 'low';
        }>;
      }>({
        taskId: 'book_detect_orientation',
        payload: { images, items },
        maxTokens: 1600,
        temperature: 0.1,
      });

      const returned = Array.isArray(res.data?.pages) ? res.data.pages : [];
      for (const pageNum of batchPagesFlat) {
        const entry = returned.find((r) => Number(r.pdfPage) === pageNum);
        const deg = entry ? textTopEdgeToRotationDeg(entry.textTopEdge) : null;
        if (deg !== null && entry?.confidence !== 'low') {
          rotations[pageNum] = deg;
        } else {
          rotations[pageNum] = fallbackAngleDeg;
          lowConfidencePages.push(pageNum);
        }
      }
    } catch {
      for (const pageNum of batchPagesFlat) {
        rotations[pageNum] = fallbackAngleDeg;
        lowConfidencePages.push(pageNum);
      }
    }

    processed += batchPagesFlat.length;
    onProgress?.(processed, totalActive);
  }

  return { rotations, lowConfidencePages };
}
