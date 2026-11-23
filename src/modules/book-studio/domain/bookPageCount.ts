import { padToMultiple } from '../../../shared/kits/print-imposition/impositionPlanner';
import { countBlanksBehindCover } from '../../../shared/kits/print-imposition/impositionMath';
import { isDividerPageToken } from './bookDividerCanvas';

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
  return calculateFinalBookPageCount({
    sourcePageCount: effectiveSourcePageCount(
      pdfPageCount,
      options.deletedPages,
      options.pageOrder,
      options.sectionDividers
    ),
    hasSourceCover: options.hasCover,
    hasCustomCover: hasCustomCoverConfig(options.customCover),
    hasCustomBackCover: hasCustomCoverConfig(options.customBackCover),
    hasSourceBackCover: options.hasBackCover,
    blankBehindCover: options.blankBehindCover,
    blankInFrontBackCover: options.blankInFrontBackCover,
    separateCover:
      (options.destination ?? 'A') !== 'A' &&
      (hasCustomCoverConfig(options.customCover) || hasCustomCoverConfig(options.customBackCover)),
    refPdfPage: options.refPdfPage,
    refBookPage: options.refBookPage,
    refPageSide: options.refPageSide,
  });
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
    capacity: targetCapacity = 4,
  } = input;

  if (sourcePageCount <= 0) return 0;
  if (targetCapacity <= 0) return 0;

  let count = sourcePageCount;

  // Destino B/C con cubiertas personalizadas: nada de cubiertas en el interior.
  if (separateCover) {
    if (hasSourceCover) {
      count += countBlanksBehindCover(blankBehindCover, refPdfPage, refBookPage, refPageSide);
    }
    return padToMultiple(count, targetCapacity);
  }

  // Tapa: la del PDF (página 1, ya incluida en sourcePageCount) agrega su retiro;
  // la personalizada suma 1 página y su retiro va detrás de esa página.
  if (wantCustomCover) {
    count += 1;
    const effectiveRef = refPdfPage > 0 ? refPdfPage + 1 : refPdfPage;
    count += countBlanksBehindCover(blankBehindCover, effectiveRef, refBookPage, refPageSide);
  } else if (hasSourceCover) {
    count += countBlanksBehindCover(blankBehindCover, refPdfPage, refBookPage, refPageSide);
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
