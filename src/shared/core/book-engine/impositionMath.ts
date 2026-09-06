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
