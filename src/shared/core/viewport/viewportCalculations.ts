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

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 2.5;

/** Acota el zoom TOTAL (ajuste automático × zoom del usuario) al rango permitido. */
export function clampZoom(value: number): number {
  return Number(Math.min(Math.max(value, MIN_ZOOM), MAX_ZOOM).toFixed(3));
}

/**
 * Ancho útil (content-box) de un contenedor a partir de su caja completa y su padding.
 * Se mide sobre la caja completa (border-box) y NO sobre `clientWidth`: la caja
 * completa no cambia cuando aparece/desaparece la barra de scroll vertical, así que
 * el ajuste no puede entrar en un ciclo "barra aparece → hoja más chica → barra desaparece".
 */
export function contentBoxWidth(borderBoxWidth: number, paddingLeft: number, paddingRight: number): number {
  return Math.max(0, borderBoxWidth - paddingLeft - paddingRight);
}

/**
 * Zoom con el que se rasteriza el canvas del visor vectorial. Escalonado (por defecto
 * de a 0.25, nunca menor a 1) para que un pellizco continuo NO vuelva a rasterizar
 * las páginas en cada tick: la nitidez cambia por escalones; el tamaño en pantalla, no.
 */
export function quantizeRasterZoom(zoom: number, step = 0.25): number {
  return Math.max(1, Math.ceil(zoom / step - 1e-9) * step);
}
