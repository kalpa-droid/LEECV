/**
 * Motor de Calibración de Numeración Asistido por IA ("5. Encuentro un número")
 * (bookFoliadoAi.ts)
 *
 * Busca un número de página impreso en las primeras páginas del PDF (oleada 1: [2, 5, 10, 15];
 * oleada 2 si solo hay preliminares/romanos: [20, 25, 30, 40]) y deduce matemáticamente
 * cuál es la Página 1 real del libro (ej. si encuentra el 10 en la pág. 14, retrocede 9 páginas
 * y devuelve la pág. 5 como Página 1 deducida para que la persona confirme o ajuste).
 */

import { executeAiTask } from '../../../shared/core/ai/aiClient';
import { resolveNaturalPdfPageSide } from '../../../shared/kits/print-imposition/impositionMath';
import { selectBookSamplePages } from './bookOrientationAi';

export interface PageNumberDetectionItem {
  pdfPage: number;
  printedNumber?: number | null;
  leftPrintedNumber?: number | null;
  rightPrintedNumber?: number | null;
  romanNumeral?: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface DeducedFirstPageResult {
  found: boolean;
  /** Página del PDF donde comienza la Página 1 (o la primera página numerada si es un capítulo suelto). */
  deducedPdfPage: number;
  /** Número impreso que corresponde a `deducedPdfPage` (normalmente 1; > 1 solo si es un capítulo suelto). */
  deducedBookPage: number;
  /** Lado natural ('derecha' | 'izquierda') para calibrar `countBlanksBehindCover`. */
  deducedSide: 'derecha' | 'izquierda';
  /** En modo fotocopia, qué mitad de `deducedPdfPage` contiene la Página 1. */
  deducedHalf?: 'izquierda' | 'derecha';
  /** Página del PDF donde la IA o el detector vio el número testigo (ej. pág. 14). */
  sourceWitnessPdfPage: number;
  /** Número impreso que vio como testigo (ej. 10). */
  sourceWitnessBookPage: number;
  /** Mitad donde vio el testigo en modo fotocopia. */
  sourceWitnessHalf?: 'izquierda' | 'derecha';
  /** ¿Confirmado por coincidencia matemática entre 2 o más páginas distintas? */
  verifiedByMultiplePages: boolean;
  /** ¿El PDF empieza en un número mayor a 1 (ej. capítulo suelto que arranca en pág. 41)? */
  isExcerptStart: boolean;
  /** Explicación en lenguaje sencillo para mostrar en la tarjeta de confirmación. */
  explanationText: string;
}

function isValidFolioNumber(n: unknown, totalPages: number): n is number {
  if (typeof n !== 'number' || !Number.isInteger(n) || n <= 0) return false;
  // Evitar confundir años (1900..2100) con páginas en documentos de menos de 1500 hojas
  if (totalPages < 1500 && n >= 1900 && n <= 2100) return false;
  return n <= Math.max(5000, totalPages * 4);
}

/**
 * Capa 0 (Local, 0 ms): busca números de página aislados en las franjas superior (top 16%)
 * e inferior (bottom 16%) de la capa de texto de PDF.js.
 */
export function extractHeaderFooterNumberFromTextItems(
  items: ReadonlyArray<{ str?: string; transform?: number[] | ArrayLike<number>; width?: number }>,
  pageWidth: number,
  pageHeight: number,
  mode: 'normal' | 'fotocopia' = 'normal',
): {
  printedNumber: number | null;
  leftPrintedNumber: number | null;
  rightPrintedNumber: number | null;
} {
  if (!Array.isArray(items) || items.length === 0 || pageWidth <= 0 || pageHeight <= 0) {
    return { printedNumber: null, leftPrintedNumber: null, rightPrintedNumber: null };
  }

  const topBandY = pageHeight * 0.84;
  const bottomBandY = pageHeight * 0.16;
  const midX = pageWidth / 2;

  const parseCandidate = (raw: string): number | null => {
    const cleaned = raw.trim().replace(/^[—–\-·•|[\]()]+|[—–\-·•|[\]()]+$/g, '').trim();
    const m = cleaned.match(/^(?:p[aá]g(?:ina)?\.?\s*)?(\d{1,4})$/i);
    if (!m) return null;
    const num = parseInt(m[1], 10);
    if (num >= 1900 && num <= 2100) return null;
    return num > 0 ? num : null;
  };

  let leftCandidate: number | null = null;
  let rightCandidate: number | null = null;
  let singleCandidate: number | null = null;

  for (const item of items) {
    const str = typeof item?.str === 'string' ? item.str.trim() : '';
    if (!str || str.length > 18) continue;
    const t = item.transform;
    if (!t || t.length < 6) continue;
    const x = Number(t[4]);
    const y = Number(t[5]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    if (y < bottomBandY || y > topBandY) {
      const num = parseCandidate(str);
      if (num === null) continue;
      singleCandidate = num;
      const centerX = x + (Number(item.width) || 0) / 2;
      if (centerX < midX) {
        leftCandidate = num;
      } else {
        rightCandidate = num;
      }
    }
  }

  return {
    printedNumber: mode === 'normal' ? singleCandidate : null,
    leftPrintedNumber: mode === 'fotocopia' ? leftCandidate : null,
    rightPrintedNumber: mode === 'fotocopia' ? rightCandidate : null,
  };
}

/**
 * Deduce la Página 1 del libro a partir de los números impresos encontrados
 * en las páginas de muestra.
 * Pura (sin DOM, sin red): 100% testeable en Vitest.
 */
export function deduceFirstBookPage(params: {
  detections: readonly PageNumberDetectionItem[];
  totalPages: number;
  mode?: 'normal' | 'fotocopia';
  deletedPages?: ReadonlyArray<number | string>;
}): DeducedFirstPageResult | null {
  const { detections, totalPages, mode = 'normal', deletedPages = [] } = params;
  if (!Number.isFinite(totalPages) || totalPages <= 0 || detections.length === 0) {
    return null;
  }

  const deletedSet = new Set(deletedPages.map((p) => Number(String(p).split('_')[0])));
  const activePages: number[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (!deletedSet.has(p)) activePages.push(p);
  }
  if (activePages.length === 0) return null;

  interface CandidateDeduction {
    key: string;
    deducedPdfPage: number;
    deducedBookPage: number;
    deducedSide: 'derecha' | 'izquierda';
    deducedHalf?: 'izquierda' | 'derecha';
    witnessPdfPage: number;
    witnessBookPage: number;
    witnessHalf?: 'izquierda' | 'derecha';
    isExcerptStart: boolean;
    score: number;
  }

  const candidates: CandidateDeduction[] = [];

  for (const det of detections) {
    if (det.confidence === 'low') continue;
    const ordIdx = activePages.indexOf(Number(det.pdfPage));
    if (ordIdx === -1) continue;
    const weight = det.confidence === 'high' ? 2 : 1;

    if (mode === 'fotocopia') {
      const halves: Array<{ half: 'izquierda' | 'derecha'; num: number | null | undefined; offset: number }> = [
        { half: 'izquierda', num: det.leftPrintedNumber ?? det.printedNumber, offset: 1 },
        { half: 'derecha', num: det.rightPrintedNumber, offset: 2 },
      ];

      for (const h of halves) {
        if (!isValidFolioNumber(h.num, totalPages)) continue;
        const logicalWitness = ordIdx * 2 + h.offset; // 1-indexado
        const logicalStart = logicalWitness - (h.num - 1);

        if (logicalStart >= 1 && logicalStart <= activePages.length * 2) {
          const targetSheetIdx = Math.floor((logicalStart - 1) / 2);
          const deducedPdfPage = activePages[targetSheetIdx];
          const deducedHalf: 'izquierda' | 'derecha' = logicalStart % 2 === 1 ? 'izquierda' : 'derecha';
          candidates.push({
            key: `${deducedPdfPage}:${deducedHalf}:1`,
            deducedPdfPage,
            deducedBookPage: 1,
            deducedSide: deducedHalf,
            deducedHalf,
            witnessPdfPage: det.pdfPage,
            witnessBookPage: h.num,
            witnessHalf: h.half,
            isExcerptStart: false,
            score: weight,
          });
        } else if (logicalStart < 1) {
          const firstLogicalBookNum = h.num - (logicalWitness - 1);
          if (firstLogicalBookNum > 1) {
            const deducedPdfPage = activePages[0];
            candidates.push({
              key: `${deducedPdfPage}:izquierda:${firstLogicalBookNum}`,
              deducedPdfPage,
              deducedBookPage: firstLogicalBookNum,
              deducedSide: 'izquierda',
              deducedHalf: 'izquierda',
              witnessPdfPage: det.pdfPage,
              witnessBookPage: h.num,
              witnessHalf: h.half,
              isExcerptStart: true,
              score: weight,
            });
          }
        }
      }
    } else {
      const num = det.printedNumber;
      if (!isValidFolioNumber(num, totalPages)) continue;
      const ord = ordIdx + 1; // 1-indexado entre páginas activas
      const ordStart = ord - (num - 1);

      if (ordStart >= 1 && ordStart <= activePages.length) {
        const deducedPdfPage = activePages[ordStart - 1];
        const deducedSide = resolveNaturalPdfPageSide(deducedPdfPage, 'normal');
        candidates.push({
          key: `${deducedPdfPage}:normal:1`,
          deducedPdfPage,
          deducedBookPage: 1,
          deducedSide,
          witnessPdfPage: det.pdfPage,
          witnessBookPage: num,
          isExcerptStart: false,
          score: weight,
        });
      } else if (ordStart < 1) {
        const firstBookNum = num - (ord - 1);
        if (firstBookNum > 1) {
          const deducedPdfPage = activePages[0];
          const deducedSide = resolveNaturalPdfPageSide(deducedPdfPage, 'normal');
          candidates.push({
            key: `${deducedPdfPage}:normal:${firstBookNum}`,
            deducedPdfPage,
            deducedBookPage: firstBookNum,
            deducedSide,
            witnessPdfPage: det.pdfPage,
            witnessBookPage: num,
            isExcerptStart: true,
            score: weight,
          });
        }
      }
    }
  }

  if (candidates.length === 0) return null;

  // Agrupar por clave de deducción para premiar coincidencia entre múltiples páginas
  const grouped = new Map<
    string,
    { totalScore: number; count: number; representative: CandidateDeduction }
  >();
  for (const c of candidates) {
    const existing = grouped.get(c.key);
    if (existing) {
      existing.totalScore += c.score + 3; // bonus por verificación cruzada
      existing.count += 1;
      // Preferir como testigo el más cercano a la página 1
      if (c.witnessBookPage < existing.representative.witnessBookPage) {
        existing.representative = c;
      }
    } else {
      grouped.set(c.key, { totalScore: c.score, count: 1, representative: c });
    }
  }

  const sorted = Array.from(grouped.values()).sort(
    (a, b) =>
      b.totalScore - a.totalScore ||
      a.representative.witnessBookPage - b.representative.witnessBookPage,
  );
  const winner = sorted[0];
  const rep = winner.representative;
  const verified = winner.count >= 2;

  let explanationText: string;
  if (rep.isExcerptStart) {
    explanationText = `Encontramos el número ${rep.witnessBookPage} en la pág. ${rep.witnessPdfPage} del PDF. Este archivo parece empezar en la página impresa ${rep.deducedBookPage} (en la pág. ${rep.deducedPdfPage} de tu PDF).`;
  } else if (rep.witnessBookPage === 1) {
    const halfText = rep.deducedHalf ? ` (mitad ${rep.deducedHalf})` : '';
    explanationText = `Encontramos directamente el número 1 en la pág. ${rep.deducedPdfPage} de tu PDF${halfText}.`;
  } else {
    const stepsBack = rep.witnessBookPage - 1;
    const halfText = rep.deducedHalf ? ` (mitad ${rep.deducedHalf})` : '';
    explanationText = `Vimos el número ${rep.witnessBookPage} en la pág. ${rep.witnessPdfPage} del PDF y retrocedimos ${stepsBack} página(s) → deducimos que la Página 1 del libro es la pág. ${rep.deducedPdfPage} de tu PDF${halfText}.`;
  }

  return {
    found: true,
    deducedPdfPage: rep.deducedPdfPage,
    deducedBookPage: rep.deducedBookPage,
    deducedSide: rep.deducedSide,
    deducedHalf: rep.deducedHalf,
    sourceWitnessPdfPage: rep.witnessPdfPage,
    sourceWitnessBookPage: rep.witnessBookPage,
    sourceWitnessHalf: rep.witnessHalf,
    verifiedByMultiplePages: verified,
    isExcerptStart: rep.isExcerptStart,
    explanationText,
  };
}

/**
 * Compone una imagen nítida y liviana (< 35 KB) que apila la franja superior (top 22%)
 * y la franja inferior (bottom 22%) de la página para que la IA lea folios pequeños con nitidez.
 */
async function renderHeaderFooterStripImage(params: {
  pdfDoc: any;
  pageNum: number;
  rotationDeg: number;
  mode: 'normal' | 'fotocopia';
  splitOffsetPct?: number;
}): Promise<{ mimeType: 'image/jpeg'; base64: string }> {
  const { pdfDoc, pageNum, rotationDeg, mode, splitOffsetPct = 50 } = params;
  const page = await pdfDoc.getPage(pageNum);

  try {
    const unscaled = page.getViewport({ scale: 1.0, rotation: rotationDeg });
    const targetWidth = 1040;
    const scale = Math.min(2.4, Math.max(1.0, targetWidth / Math.max(1, unscaled.width)));
    const vp = page.getViewport({ scale, rotation: rotationDeg });

    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = Math.max(1, Math.floor(vp.width));
    fullCanvas.height = Math.max(1, Math.floor(vp.height));
    const fullCtx = fullCanvas.getContext('2d');
    if (fullCtx) {
      fullCtx.fillStyle = 'rgb(255, 255, 255)';
      fullCtx.fillRect(0, 0, fullCanvas.width, fullCanvas.height);
      await page.render({ canvasContext: fullCtx, viewport: vp }).promise;
    }

    const bandH = Math.max(60, Math.round(fullCanvas.height * 0.22));
    const stripCanvas = document.createElement('canvas');
    stripCanvas.width = fullCanvas.width;
    stripCanvas.height = bandH * 2 + 24;
    const ctx = stripCanvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = 'rgb(255, 255, 255)';
      ctx.fillRect(0, 0, stripCanvas.width, stripCanvas.height);

      // Banda superior (top 22%)
      ctx.drawImage(fullCanvas, 0, 0, fullCanvas.width, bandH, 0, 0, fullCanvas.width, bandH);

      // Barra divisoria central
      ctx.fillStyle = 'rgb(30, 41, 59)';
      ctx.fillRect(0, bandH, stripCanvas.width, 24);
      ctx.fillStyle = 'rgb(255, 255, 255)';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`Pág. PDF #${pageNum} — ↑ ARRIBA   |   ↓ ABAJO`, 12, bandH + 16);

      // Banda inferior (bottom 22%)
      ctx.drawImage(
        fullCanvas,
        0,
        Math.max(0, fullCanvas.height - bandH),
        fullCanvas.width,
        bandH,
        0,
        bandH + 24,
        fullCanvas.width,
        bandH,
      );

      // Si es fotocopia, marcar la división central izquierda / derecha
      if (mode === 'fotocopia') {
        const splitX = Math.round((stripCanvas.width * splitOffsetPct) / 100);
        ctx.strokeStyle = 'rgb(220, 38, 38)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(splitX, 0);
        ctx.lineTo(splitX, stripCanvas.height);
        ctx.stroke();
      }
    }

    fullCanvas.width = 0;
    fullCanvas.height = 0;

    const dataUrl = stripCanvas.toDataURL('image/jpeg', 0.68);
    stripCanvas.width = 0;
    stripCanvas.height = 0;
    return {
      mimeType: 'image/jpeg',
      base64: dataUrl.split(',')[1] || '',
    };
  } finally {
    try {
      page.cleanup?.();
    } catch {
      // ignore
    }
  }
}

/**
 * Busca progresivamente un número impreso en las páginas [2, 5, 10, 15]
 * (y en [20, 25, 30, 40] si la primera oleada solo tenía preliminares/romanos)
 * y deduce cuál es la Página 1 del libro.
 */
export async function findBookFirstPageWithAi(params: {
  pdfDoc: any;
  totalPages: number;
  mode?: 'normal' | 'fotocopia';
  deletedPages?: ReadonlyArray<number | string>;
  pageRotations?: Record<number, number>;
  pageSplitOffsets?: Record<number, number>;
  onStatus?: (message: string) => void;
}): Promise<DeducedFirstPageResult | null> {
  const {
    pdfDoc,
    totalPages,
    mode = 'normal',
    deletedPages = [],
    pageRotations = {},
    pageSplitOffsets = {},
    onStatus,
  } = params;

  if (!pdfDoc || totalPages <= 0) return null;

  const wave1Pages = selectBookSamplePages(totalPages, deletedPages, [2, 5, 10, 15]);
  if (wave1Pages.length === 0) return null;

  // 1. Capa 0: intento local instantáneo en la capa de texto del PDF
  const localDetections: PageNumberDetectionItem[] = [];
  for (const p of wave1Pages) {
    try {
      const page = await pdfDoc.getPage(p);
      const vp = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();
      const extracted = extractHeaderFooterNumberFromTextItems(
        textContent?.items || [],
        vp.width,
        vp.height,
        mode,
      );
      try { page.cleanup?.(); } catch { /* ignore */ }
      if (
        extracted.printedNumber !== null ||
        extracted.leftPrintedNumber !== null ||
        extracted.rightPrintedNumber !== null
      ) {
        localDetections.push({
          pdfPage: p,
          printedNumber: extracted.printedNumber,
          leftPrintedNumber: extracted.leftPrintedNumber,
          rightPrintedNumber: extracted.rightPrintedNumber,
          confidence: 'high',
        });
      }
    } catch {
      // continuar con Visión IA
    }
  }

  const localDeduction = deduceFirstBookPage({
    detections: localDetections,
    totalPages,
    mode,
    deletedPages,
  });
  if (localDeduction && localDeduction.verifiedByMultiplePages) {
    return localDeduction;
  }

  // 2. Oleada 1 con Visión IA ([2, 5, 10, 15])
  const runVisionWave = async (wavePages: number[], label: string): Promise<PageNumberDetectionItem[]> => {
    onStatus?.(label);
    const images: Array<{ mimeType: 'image/jpeg'; base64: string }> = [];
    for (const p of wavePages) {
      const strip = await renderHeaderFooterStripImage({
        pdfDoc,
        pageNum: p,
        rotationDeg: pageRotations[p] || 0,
        mode,
        splitOffsetPct: pageSplitOffsets[p] ?? 50,
      });
      images.push(strip);
    }

    const res = await executeAiTask<{ detections: PageNumberDetectionItem[] }>({
      taskId: 'book_detect_page_numbers',
      payload: {
        images,
        pages: wavePages,
        mode,
      },
      maxTokens: 900,
      temperature: 0.1,
    });

    return Array.isArray(res.data?.detections) ? res.data.detections : [];
  };

  const wave1Vision = await runVisionWave(
    wave1Pages,
    `Buscando numeración en páginas ${wave1Pages.join(', ')}...`,
  );

  const combinedWave1 = [...localDetections, ...wave1Vision];
  const wave1Result = deduceFirstBookPage({
    detections: combinedWave1,
    totalPages,
    mode,
    deletedPages,
  });
  if (wave1Result) {
    return wave1Result;
  }

  // 3. Oleada 2 ([20, 25, 30, 40]) si el libro es largo y las primeras 15 eran preliminares sin números arábigos
  if (totalPages >= 18) {
    const wave2Candidates = [20, 25, 30, 40].filter(
      (p) => p <= totalPages && !wave1Pages.includes(p),
    );
    const wave2Pages = selectBookSamplePages(totalPages, deletedPages, wave2Candidates).filter(
      (p) => !wave1Pages.includes(p),
    );
    if (wave2Pages.length > 0) {
      const wave2Vision = await runVisionWave(
        wave2Pages,
        `Revisando páginas ${wave2Pages.join(', ')} (después del prólogo)...`,
      );
      const wave2Result = deduceFirstBookPage({
        detections: [...combinedWave1, ...wave2Vision],
        totalPages,
        mode,
        deletedPages,
      });
      if (wave2Result) return wave2Result;
    }
  }

  return null;
}
