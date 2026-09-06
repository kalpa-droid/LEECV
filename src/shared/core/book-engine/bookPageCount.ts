import { padToMultipleOf4 } from './impositionMath';

/**
 * Calcula el número exacto de páginas impresas que tendrá el libro final
 * (incluyendo tapas custom y hojas de cortesía en blanco hasta el múltiplo de 4).
 * Este número es la fuente de verdad para determinar el consumo de créditos.
 */
export function calculateFinalBookPageCount(
  sourcePageCount: number,
  hasCustomCover: boolean = false,
  hasCustomBackCover: boolean = false
): number {
  if (sourcePageCount <= 0) return 0;
  const count = sourcePageCount + (hasCustomCover ? 1 : 0) + (hasCustomBackCover ? 1 : 0);
  return padToMultipleOf4(count);
}
