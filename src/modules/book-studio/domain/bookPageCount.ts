import { padToMultiple } from '../../../shared/kits/print-imposition/impositionPlanner';
import { countBlanksBehindCoverWithOffset } from '../../../shared/kits/print-imposition/impositionMath';
import { countInsertedPagesBeforePdfPage, isDividerPageToken } from './bookDividerCanvas';
import { resolveSeparateCoverPlan } from './bookSeparateCover';
import type { BookPaperSizeId, BookPrintTarget } from './bookPrintProfileEngine';

/**
 * Entrada exacta para replicar el armado real del motor (`procesarComoImagenes`
 * + `processBookImposition`): mismas decisiones, mismo orden.
 */
export interface FinalBookPageCountInput {
  /**
   * Páginas EFECTIVAS del interior (las que el motor copia al nuevo PDF):
   * si hay `pageOrder`, cada registro `N` o `N_parte` es una página; si no,
   * `pdfPageCount`, menos los `deletedPages`, más separadores de capítulos.
   * En modo fotocopia cada split cuenta como página propia (igual que el motor en la práctica).
   */
  sourcePageCount: number;
  /** Tapa = página 1 del PDF original (retiro detrás de tapa aplica). */
  hasSourceCover?: boolean;
  /** Tapa personalizada (upload/plantilla) embebida cuando destino es 'A'. */
  hasCustomCover?: boolean;
  /** Contratapa personalizada (upload/plantilla) embebida cuando destino es 'A'. */
  hasCustomBackCover?: boolean;
  /** Contratapa = última página del PDF original (retiro delante aplica). */
  hasSourceBackCover?: boolean;
  /** Retiro de tapa (checkbox del paso "Tapa"). */
  blankBehindCover?: boolean;
  /** Retiro de contratapa (checkbox del paso "Contratapa"). */
  blankInFrontBackCover?: boolean;
  /**
   * Destino B/C con cubiertas personalizadas: la/s cubierta/s viajan en otro
   * archivo y NO suman al interior (el motor solo rellena a múltiplo de 4).
   */
  separateCover?: boolean;
  /** Referencia de foliado (modo fotocopia): ajusta los blanks de tapa. */
  refPdfPage?: number;
  refBookPage?: number;
  refPageSide?: 'derecha' | 'izquierda';
  /** Páginas insertadas (separadores, blancos) o quitadas antes de la página de referencia: corrimiento de lado. */
  insertedPagesBeforeRef?: number;
  /** Capacidad de pliego (4 cuadernillo). */
  capacity?: number;
}

/** ¿Hay cubiertas personalizadas (upload o plantilla) en el doc? */
export function hasCustomCoverConfig(custom: { type?: string } | null | undefined): boolean {
  if (!custom) return false;
  return custom.type === 'upload' || custom.type === 'template';
}

/**
 * Opciones estructurales que necesita el conteo del libro final. Es un tipo
 * estructural (sin importar BookImpositionOptions) para no atar el módulo
 * de conteo al motor de imposición.
 */
export interface BookFinalPageCountOptions {
  deletedPages?: (number | string)[];
  pageOrder?: (number | string)[];
  sectionDividers?: ReadonlyArray<{ id: string; blankBehind?: boolean }>;
  hasCover?: boolean;
  hasBackCover?: boolean;
  blankBehindCover?: boolean;
  blankInFrontBackCover?: boolean;
  destination?: string;
  customCover?: { type?: string } | null;
  customBackCover?: { type?: string } | null;
  refPdfPage?: number;
  refBookPage?: number;
  refPageSide?: 'derecha' | 'izquierda';
  printTarget?: BookPrintTarget;
  paperSize?: BookPaperSizeId;
  unprintableMarginMm?: number;
  extractPdfCoversWhenSeparate?: boolean;
  paddingPlacement?: 'before-back-cover' | 'after-back-cover';
}

/** Suma cuántas páginas reales aportan los separadores de capítulos (1 o 2 si lleva reverso en blanco). */
export function countSectionDividerPages(
  sectionDividers: ReadonlyArray<{ id: string; blankBehind?: boolean }> | undefined
): number {
  if (!Array.isArray(sectionDividers) || sectionDividers.length === 0) return 0;
  return sectionDividers.reduce((acc, div) => acc + (div.blankBehind ? 2 : 1), 0);
}

/**
 * Número de páginas del libro final para un PDF ya subido. Replica el
 * armado real del motor: es la fuente de verdad para el consumo de créditos
 * (Paso 7), la pill de lomo estimado (Paso 6) y el preview de la imposición
 * en el visor. NO devuelve un estimado: devuelve el conteo exacto.
 */
export function computeBookFinalPageCount(
  options: BookFinalPageCountOptions,
  pdfPageCount: number
): number {
  const sourcePageCount = effectiveSourcePageCount(
    pdfPageCount,
    options.deletedPages,
    options.pageOrder,
    options.sectionDividers
  );
  const plan = resolveSeparateCoverPlan(
    {
      destination: (options.destination as 'A' | 'B' | 'C' | undefined) ?? 'A',
      printTarget: options.printTarget,
      paperSize: options.paperSize,
      unprintableMarginMm: options.unprintableMarginMm,
      hasCover: options.hasCover,
      hasBackCover: options.hasBackCover,
      customCover: options.customCover,
      customBackCover: options.customBackCover,
      extractPdfCoversWhenSeparate: options.extractPdfCoversWhenSeparate,
    },
    sourcePageCount
  );

  if (plan.isSeparate) {
    // Tapa y contratapa salen aparte: lo que se extrae del PDF deja de ser interior.
    const removed = (plan.frontSource === 'pdf-first' ? 1 : 0) + (plan.backSource === 'pdf-last' ? 1 : 0);
    return padToMultiple(Math.max(0, sourcePageCount - removed), 4);
  }

  return calculateFinalBookPageCount({
    sourcePageCount,
    hasSourceCover: options.hasCover,
    hasCustomCover: hasCustomCoverConfig(options.customCover),
    hasCustomBackCover: hasCustomCoverConfig(options.customBackCover),
    hasSourceBackCover: options.hasBackCover,
    blankBehindCover: options.blankBehindCover,
    blankInFrontBackCover: options.blankInFrontBackCover,
    separateCover: false,
    refPdfPage: options.refPdfPage,
    refBookPage: options.refBookPage,
    refPageSide: options.refPageSide,
    insertedPagesBeforeRef: countInsertedPagesBeforePdfPage({
      pdfPageCount,
      pageOrder: options.pageOrder,
      sectionDividers: options.sectionDividers as never,
      deletedPages: options.deletedPages,
      refPdfPage: options.refPdfPage ?? 0,
    }),
  });
}

/** Desglose transparente del conteo final (se muestra en los pasos 7 y 8). */
export interface BookPageBreakdown {
  activePdfPages: number;
  dividerPages: number;
  manualBlankPages: number;
  coverPagesInInterior: number;
  frontRetreatBlanks: number;
  backRetreatBlanks: number;
  paddingBlanks: number;
  totalBookPages: number;
  interiorSheets: number;
  separateCoverSheets: number;
  totalSheetsToPrint: number;
}

export function computeBookPageBreakdown(
  options: BookFinalPageCountOptions,
  pdfPageCount: number
): BookPageBreakdown {
  const sourcePageCount = effectiveSourcePageCount(
    pdfPageCount,
    options.deletedPages,
    options.pageOrder,
    options.sectionDividers
  );
  const dividerPages = countSectionDividerPages(options.sectionDividers);
  const manualBlankPages = (options.pageOrder || []).filter(
    (id) => !isDividerPageToken(id) && String(id).startsWith('blank')
  ).length;
  const activePdfPages = Math.max(0, sourcePageCount - dividerPages - manualBlankPages);
  const total = computeBookFinalPageCount(options, pdfPageCount);

  const plan = resolveSeparateCoverPlan(
    {
      destination: (options.destination as 'A' | 'B' | 'C' | undefined) ?? 'A',
      printTarget: options.printTarget,
      paperSize: options.paperSize,
      unprintableMarginMm: options.unprintableMarginMm,
      hasCover: options.hasCover,
      hasBackCover: options.hasBackCover,
      customCover: options.customCover,
      customBackCover: options.customBackCover,
      extractPdfCoversWhenSeparate: options.extractPdfCoversWhenSeparate,
    },
    sourcePageCount
  );

  let coverPagesInInterior = 0;
  let frontRetreatBlanks = 0;
  let backRetreatBlanks = 0;
  let used = sourcePageCount;

  if (plan.isSeparate) {
    used -= (plan.frontSource === 'pdf-first' ? 1 : 0) + (plan.backSource === 'pdf-last' ? 1 : 0);
  } else {
    const customFront = hasCustomCoverConfig(options.customCover);
    const customBack = hasCustomCoverConfig(options.customBackCover);
    const inserted = countInsertedPagesBeforePdfPage({
      pdfPageCount,
      pageOrder: options.pageOrder,
      sectionDividers: options.sectionDividers as never,
      deletedPages: options.deletedPages,
      refPdfPage: options.refPdfPage ?? 0,
    });
    const retreatFor = (effectiveRef: number) =>
      countBlanksBehindCoverWithOffset({
        blankBehindCoverChecked: options.blankBehindCover !== false,
        refPdfPage: effectiveRef,
        refBookPage: options.refBookPage ?? 0,
        refPageSide: options.refPageSide ?? 'derecha',
        insertedPagesBeforeRef: inserted,
      });
    if (customFront) {
      coverPagesInInterior += 1;
      const ref = (options.refPdfPage ?? 0) > 0 ? (options.refPdfPage ?? 0) + 1 : options.refPdfPage ?? 0;
      frontRetreatBlanks = retreatFor(ref);
    } else if (options.hasCover) {
      frontRetreatBlanks = retreatFor(options.refPdfPage ?? 0);
    }
    if (customBack) {
      coverPagesInInterior += 1;
      backRetreatBlanks = options.blankInFrontBackCover !== false ? 1 : 0;
    } else if (options.hasBackCover) {
      backRetreatBlanks = options.blankInFrontBackCover !== false ? 1 : 0;
    }
    used += coverPagesInInterior + frontRetreatBlanks + backRetreatBlanks;
  }

  const paddingBlanks = Math.max(0, total - used);
  const separateCoverSheets = plan.isSeparate ? 1 : 0;
  const interiorSheets = total / 2;
  return {
    activePdfPages,
    dividerPages,
    manualBlankPages,
    coverPagesInInterior,
    frontRetreatBlanks,
    backRetreatBlanks,
    paddingBlanks,
    totalBookPages: total,
    interiorSheets,
    separateCoverSheets,
    totalSheetsToPrint: interiorSheets + separateCoverSheets,
  };
}

/**
 * Páginas efectivas del interior según el motor:
 *  - pageOrder definido y no vacío: cada registro no-divider aporta una página (los
 *    borrados se aplican sobre el número base del registro; las hojas 'blank...' suman 1).
 *  - Si no: pdfPageCount menos deletedPages.
 *  - Más las páginas aportadas por `sectionDividers` (+1 o +2 con hoja blanca detrás).
 */
export function effectiveSourcePageCount(
  pdfPageCount: number,
  deletedPages: Array<number | string> | undefined,
  pageOrder: Array<number | string> | undefined,
  sectionDividers?: ReadonlyArray<{ id: string; blankBehind?: boolean }>
): number {
  const deleted = (deletedPages || []).map(Number);
  let baseCount = 0;
  if (pageOrder && pageOrder.length > 0) {
    baseCount = pageOrder.filter((id) => {
      if (isDividerPageToken(id)) return false;
      const str = String(id);
      if (str.startsWith('blank')) return true;
      return !deleted.includes(Number(str.split('_')[0]));
    }).length;
  } else {
    baseCount = Math.max(0, pdfPageCount - deleted.length);
  }
  if (baseCount <= 0 && pdfPageCount <= 0) return 0;
  return baseCount + countSectionDividerPages(sectionDividers);
}

/**
 * Calcula el número exacto de páginas del libro final replicando el armado
 * del motor hoja por hoja: tapas/retiros, contratapa (del PDF, personalizada
 * o ninguna — sin contratapa NO se inventa un retiro), destinos B/C (cubiertas
 * fuera del interior) y relleno a múltiplo de 4. Es la fuente de verdad para
 * el conteo mostrado al usuario y para el consumo de créditos.
 *
 * Firma legada `(sourcePageCount, hasCustomCover, hasCustomBackCover, capacity)`
 * se conserva para compatibilidad con callers viejos.
 */
export function calculateFinalBookPageCount(
  inputOrSourcePageCount: number | FinalBookPageCountInput,
  hasCustomCover = false,
  hasCustomBackCover = false,
  capacity = 4
): number {
  let input: FinalBookPageCountInput;
  if (typeof inputOrSourcePageCount === 'number') {
    input = {
      sourcePageCount: inputOrSourcePageCount,
      hasCustomCover,
      hasCustomBackCover,
      capacity,
    };
  } else {
    input = inputOrSourcePageCount;
  }

  const {
    sourcePageCount,
    hasSourceCover = false,
    hasCustomCover: wantCustomCover = false,
    hasCustomBackCover: wantCustomBackCover = false,
    hasSourceBackCover = false,
    blankBehindCover = true,
    blankInFrontBackCover = true,
    separateCover = false,
    refPdfPage = 0,
    refBookPage = 0,
    refPageSide = 'derecha',
    insertedPagesBeforeRef = 0,
    capacity: targetCapacity = 4,
  } = input;

  const blanksBehind = (effectiveRef: number): number =>
    countBlanksBehindCoverWithOffset({
      blankBehindCoverChecked: blankBehindCover,
      refPdfPage: effectiveRef,
      refBookPage,
      refPageSide,
      insertedPagesBeforeRef,
    });

  if (sourcePageCount <= 0) return 0;
  if (targetCapacity <= 0) return 0;

  let count = sourcePageCount;

  // Destino B/C con cubiertas personalizadas: nada de cubiertas en el interior.
  if (separateCover) {
    if (hasSourceCover) {
      count += blanksBehind(refPdfPage);
    }
    return padToMultiple(count, targetCapacity);
  }

  // Tapa: la del PDF (página 1, ya incluida en sourcePageCount) agrega su retiro;
  // la personalizada suma 1 página y su retiro va detrás de esa página.
  if (wantCustomCover) {
    count += 1;
    const effectiveRef = refPdfPage > 0 ? refPdfPage + 1 : refPdfPage;
    count += blanksBehind(effectiveRef);
  } else if (hasSourceCover) {
    count += blanksBehind(refPdfPage);
  }

  // Contratapa:
  //  - Del PDF: se extrae y re-coloca al final; el retiro va antes del relleno.
  //  - Personalizada (destino A): retiro delante + 1 página de contratapa.
  //  - Ninguna: NO se inyecta hoja en blanco fantasma (fix del retiro).
  if (hasSourceBackCover) {
    count += blankInFrontBackCover ? 1 : 0;
  } else if (wantCustomBackCover) {
    count += (blankInFrontBackCover ? 1 : 0) + 1;
  }

  return padToMultiple(count, targetCapacity);
}
