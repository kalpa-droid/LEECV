/**
 * Funciones puras de matemática para la imposición de pliegos en libros y folletos.
 * Diseñadas para ser testeables al 100% en Vitest sin depender de DOM o PDF.js.
 */

/**
 * Calcula el total de páginas necesario para completar un múltiplo de 4
 * (indispensable para doblar pliegos sin que queden hojas sueltas).
 */
export function padToMultipleOf4(pageCount: number): number {
  if (pageCount <= 0) return 0;
  return pageCount + ((4 - (pageCount % 4)) % 4);
}

/**
 * Calcula los índices de las páginas izquierda y derecha que se imprimen
 * en una cara de la hoja (frente o dorso) para el armado de libro tipo caballete.
 *
 * @param sheetIndex Índice de cara impresa (0, 1, 2, 3...)
 * @param totalPages Total de páginas (debe ser múltiplo de 4)
 */
export function getBookletPairIndex(
  sheetIndex: number,
  totalPages: number
): { leftIndex: number; rightIndex: number } {
  const isFront = sheetIndex % 2 === 0;
  return {
    leftIndex: isFront ? totalPages - 1 - sheetIndex : sheetIndex,
    rightIndex: isFront ? sheetIndex : totalPages - 1 - sheetIndex,
  };
}

/**
 * Determina el lado natural ('derecha' = impar / frente, 'izquierda' = par / dorso)
 * en que cae una página del PDF antes de insertar hojas en blanco detrás de la tapa.
 * - En modo normal (1 pág/hoja): pág 1 = derecha, pág 2 = izquierda, pág 3 = derecha...
 * - En modo fotocopia (2 págs/hoja): depende de la mitad ('izquierda' o 'derecha') donde
 *   está impreso el número dentro del pliego escaneado.
 */
export function resolveNaturalPdfPageSide(
  refPdfPage: number,
  mode: 'normal' | 'fotocopia' = 'normal',
  fotocopiaHalf?: 'izquierda' | 'derecha'
): 'derecha' | 'izquierda' {
  if (mode === 'fotocopia' && fotocopiaHalf) {
    return fotocopiaHalf;
  }
  return refPdfPage % 2 !== 0 ? 'derecha' : 'izquierda';
}

/**
 * Calcula cuántas hojas en blanco deben insertarse inmediatamente detrás de la tapa,
 * unificando la preferencia del usuario ("retiro de tapa") y la corrección automática
 * de alineación de foliado (impar=derecha, par=izquierda).
 */
export function countBlanksBehindCover(
  blankBehindCoverChecked: boolean,
  refPdfPage: number,
  refBookPage: number,
  refPageSide: 'derecha' | 'izquierda'
): number {
  let count = blankBehindCoverChecked ? 1 : 0;
  if (refPdfPage > 0 && refBookPage > 0) {
    const isBookPageOdd = refBookPage % 2 !== 0;
    const expectedSide = isBookPageOdd ? 'derecha' : 'izquierda';
    const flipped = count % 2 === 1;
    const sideAfterBase = flipped
      ? refPageSide === 'derecha' ? 'izquierda' : 'derecha'
      : refPageSide;
    if (sideAfterBase !== expectedSide) {
      count += 1;
    }
  }
  return count;
}

/**
 * Igual que `countBlanksBehindCover`, pero tiene en cuenta cuántas páginas se
 * insertaron (separadores, blancos manuales) o quitaron ANTES de la página de
 * referencia: si ese corrimiento es impar, la página de referencia cambió de lado.
 * Sin calibración (refPdfPage/refBookPage en 0) NO hace nada extra.
 */
export function countBlanksBehindCoverWithOffset(params: {
  blankBehindCoverChecked: boolean;
  refPdfPage: number;
  refBookPage: number;
  refPageSide: 'derecha' | 'izquierda';
  insertedPagesBeforeRef: number;
}): number {
  const { blankBehindCoverChecked, refPdfPage, refBookPage, refPageSide, insertedPagesBeforeRef } = params;
  if (refPdfPage <= 0 || refBookPage <= 0) {
    return blankBehindCoverChecked ? 1 : 0;
  }
  const parityFlipped = Math.abs(insertedPagesBeforeRef) % 2 === 1;
  const effectiveSide: 'derecha' | 'izquierda' = parityFlipped
    ? refPageSide === 'derecha' ? 'izquierda' : 'derecha'
    : refPageSide;
  return countBlanksBehindCover(blankBehindCoverChecked, refPdfPage, refBookPage, effectiveSide);
}

/**
 * Calcula las hojas en blanco de retiro + relleno a múltiplo de `capacity` cuando
 * hay (o no) una contratapa embebida al final del mismo archivo.
 * Modo "garantizar": el retiro delante de la contratapa asegura AL MENOS una
 * hoja en blanco, pero el relleno a múltiplo de 4 absorbe ese blanco (nunca suma
 * una tanda extra de 4 blancos seguidos).
 */
export function computePaddingPages(
  pagesBeforeBackCover: number,
  hasEmbeddedBackCover: boolean,
  blankInFrontBackCover: boolean,
  capacity = 4,
): { retreatBlanks: number; paddingBlanks: number; totalPages: number } {
  if (pagesBeforeBackCover <= 0 && !hasEmbeddedBackCover) {
    return { retreatBlanks: 0, paddingBlanks: 0, totalPages: 0 };
  }
  const cap = capacity > 0 ? capacity : 4;
  if (!hasEmbeddedBackCover) {
    const paddingBlanks = (cap - (pagesBeforeBackCover % cap)) % cap;
    return { retreatBlanks: 0, paddingBlanks, totalPages: pagesBeforeBackCover + paddingBlanks };
  }
  const withBack = pagesBeforeBackCover + 1;
  const naturalPadding = (cap - (withBack % cap)) % cap;
  // Garantiza al menos 1 blanco delante si el usuario lo pidió; el relleno natural lo absorbe.
  const blanksBeforeBack = blankInFrontBackCover ? Math.max(1, naturalPadding) : naturalPadding;
  const totalBefore = withBack + blanksBeforeBack;
  const extraToCap = (cap - (totalBefore % cap)) % cap;
  const blanksTotal = blanksBeforeBack + extraToCap;
  return {
    retreatBlanks: blankInFrontBackCover ? 1 : 0,
    paddingBlanks: Math.max(0, blanksTotal - (blankInFrontBackCover ? 1 : 0)),
    totalPages: withBack + blanksTotal,
  };
}