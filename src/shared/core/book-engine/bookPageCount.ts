import { padToMultiple } from './impositionPlanner';

/**
 * Calcula el número exacto de páginas impresas que tendrá el libro final
 * (incluyendo tapas custom y hojas de cortesía en blanco hasta el múltiplo
 * de la capacidad del modo de imposición: 4 cuadernillo, 8 cuarto, 16 octavo,
 * G cut-and-stack). Este número es la fuente de verdad para determinar el
 * consumo de créditos.
 */
export function calculateFinalBookPageCount(
  sourcePageCount: number,
  hasCustomCover: boolean = false,
  hasCustomBackCover: boolean = false,
  capacity: number = 4
): number {
  if (sourcePageCount <= 0) return 0;
  const count = sourcePageCount + (hasCustomCover ? 1 : 0) + (hasCustomBackCover ? 1 : 0);
  return padToMultiple(count, capacity);
}
