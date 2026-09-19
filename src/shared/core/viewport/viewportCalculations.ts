export interface FitScaleOptions {
  safetyPaddingPx?: number;
  minScale?: number;
  maxScale?: number;
}

/**
 * Algoritmo puro de cálculo de escala de Auto-Fit basado en dimensiones reales.
 * Retorna `null` si las dimensiones del contenedor aún no han sido obtenidas por el DOM.
 */
export function calculateFitScale(
  containerWidth: number,
  containerHeight: number,
  docWidthPx: number,
  docHeightPx: number,
  options: FitScaleOptions = {}
): number | null {
  if (!containerWidth || containerWidth <= 0 || !docWidthPx || docWidthPx <= 0) {
    return null;
  }
  const defaultPadding = containerWidth < 768 ? 12 : 32;
  const padding = options.safetyPaddingPx ?? defaultPadding;
  const availableWidth = Math.max(150, containerWidth - padding);
  const scaleByWidth = availableWidth / docWidthPx;
  const min = options.minScale ?? 0.2;
  const max = options.maxScale ?? 2.5;

  return Number(Math.min(Math.max(scaleByWidth, min), max).toFixed(2));
}

/**
 * Calcula el desplazamiento de scroll ideal para centrar horizontalmente y alinear arriba.
 */
export function calculateCenteredScroll(
  containerWidth: number,
  containerHeight: number,
  scaledDocWidth: number,
  scaledDocHeight: number
): { scrollLeft: number; scrollTop: number } {
  return {
    scrollLeft: Math.max(0, Math.round((scaledDocWidth - containerWidth) / 2)),
    scrollTop: 0
  };
}
