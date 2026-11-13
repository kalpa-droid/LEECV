/**
 * Convierte una página (PDF rasterizado o foto/escaneo) a una imagen en base64
 * que entra seguro dentro del límite de tamaño de pedido de Vercel para funciones
 * serverless (4.5 MB, fijo por la plataforma).
 *
 * Estrategia (V2.10):
 * - Fondo BLANCO OPACO obligatorio antes de dibujar: los PDF sin fondo sólido
 *   (exportados de Figma/Illustrator o con transparencias) quedaban con fondo
 *   NEGRO al pasar a JPEG y las letras oscuras desaparecían.
 * - Páginas digitales nítidas (render de PDF): intentar primero WebP de alta
 *   calidad (conserva bordes tipográficos sin artefactos JPEG) y aceptarla bajo
 *   1.2 MB; si no entra, PNG bajo presupuesto; si tampoco, JPEG escalonado
 *   [0.88, 0.78, 0.65, 0.48].
 * - Fotos y escaneos: JPEG escalonado (mismo presupuesto 2.5 MB).
 * - Fotos sacadas con el celular: se respeta la orientación EXIF
 *   (`imageOrientation: 'from-image'`) y se aplica una mejora SUAVE de contraste
 *   (estiramiento 2%–98% de luminancia, nunca binarización dura).
 * - Tope 1920 px de lado mayor (≈165–180 PPP en hoja común A4): debajo de ese
 *   rango sufren las fuentes de 7–9 pt; por arriba de ~2048 px no mejora la
 *   lectura pero crece el base64 y puede chocar con el techo de 4 MB de Groq Vision.
 */

export const MAX_IMAGE_DIMENSION = 1920;
export const MAX_PAGE_PAYLOAD_BYTES = 2_500_000;
/** Páginas digitales aceptan WebP solo bajo este peso; si no, cae a PNG/JPEG. */
export const MAX_DIGITAL_WEBP_BYTES = 1_200_000;
export const WEBP_DIGITAL_QUALITY = 0.9;
export const RENDER_TARGET_LONG_SIDE = 1920;

export const JPEG_QUALITY_STEPS = [0.88, 0.78, 0.65, 0.48] as const;

export type EncodedImageMime = 'image/jpeg' | 'image/png' | 'image/webp';
export interface EncodedImage {
  base64: string;
  mimeType: EncodedImageMime;
}

/** Tamaño aproximado en bytes que ocupa una cadena base64 (sin el prefijo "data:...,"). */
export function estimateBase64Bytes(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

/**
 * Escala para rasterizar un PDF: apunta a ~1920 px de lado mayor,
 * con piso 1.5 (no degradar páginas chicas) y techo 2.6.
 * `width`/`height` en unidades PDF sin escalar (getViewport({ scale: 1 })).
 */
export function computeRenderScale(
  width: number,
  height: number,
  targetLongSide = RENDER_TARGET_LONG_SIDE,
  minScale = 1.5,
  maxScale = 2.6
): number {
  const longSide = Math.max(width, height);
  if (!Number.isFinite(longSide) || longSide <= 0) return minScale;
  return Math.min(maxScale, Math.max(minScale, targetLongSide / longSide));
}

/** Redimensiona un archivo de imagen (foto de cámara, JPG/PNG/WebP) a un canvas, sin superar maxDimension. */
export async function fileToScaledCanvas(
  file: File,
  maxDimension = MAX_IMAGE_DIMENSION,
  options: { enhanceContrast?: boolean } = {}
): Promise<HTMLCanvasElement> {
  // imageOrientation: 'from-image' respeta fotos verticales sacadas con celular
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const canvas = scaleToCanvas(bitmap, bitmap.width, bitmap.height, maxDimension);
    if (options.enhanceContrast !== false) {
      applySoftContrast(canvas);
    }
    return canvas;
  } finally {
    bitmap.close();
  }
}

/** Nunca agranda una imagen (scale tope 1) y siempre deja al menos 1x1px. Pura, sin DOM: fácil de testear. */
export function computeScaledDimensions(sourceWidth: number, sourceHeight: number, maxDimension: number): { width: number; height: number } {
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

function fillWhite(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
}

function scaleToCanvas(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxDimension: number
): HTMLCanvasElement {
  const { width, height } = computeScaledDimensions(sourceWidth, sourceHeight, maxDimension);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Este navegador no puede procesar imágenes (falta soporte de canvas).');
  fillWhite(ctx, width, height); // transparencia → blanco opaco (crítico para PDF con alpha)
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

/**
 * Si un canvas (una página de PDF ya rasterizada, por ejemplo) es más grande que MAX_IMAGE_DIMENSION,
 * lo reescala conservando el fondo blanco. Para el caso normal (páginas a escala ~2.28) no hace nada.
 */
export function clampCanvasSize(canvas: HTMLCanvasElement, maxDimension = MAX_IMAGE_DIMENSION): HTMLCanvasElement {
  if (Math.max(canvas.width, canvas.height) <= maxDimension) return canvas;
  return scaleToCanvas(canvas, canvas.width, canvas.height, maxDimension);
}

/**
 * Estiramiento suave de contraste: mueve los percentiles 2% y 98% de luminancia
 * a 0 y 255. NUNCA binariza (el texto en escala de grises/color suave se lee
 * mejor que texto blanco/negro puro con bordes serrucho). Si el rango dinámico
 * ya es suficiente (≥60) no toca nada para no acentuar ruido.
 */
export function applySoftContrast(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const { width, height } = canvas;
  if (width <= 0 || height <= 0) return canvas;

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch {
    return canvas; // canvas "tainted" o no legible → devolver sin tocar
  }
  const data = imageData.data;
  const histogram = new Uint32Array(256);
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    const luminance = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    histogram[luminance | 0]++;
    total++;
  }
  if (total === 0) return canvas;

  const lowTarget = total * 0.02;
  const highTarget = total * 0.98;
  let cumulative = 0;
  let low = 0;
  let high = 255;
  for (let i = 0; i < 256; i++) {
    cumulative += histogram[i];
    if (cumulative >= lowTarget) {
      low = i;
      break;
    }
  }
  cumulative = 0;
  for (let i = 0; i < 256; i++) {
    cumulative += histogram[i];
    if (cumulative >= highTarget) {
      high = i;
      break;
    }
  }

  const range = high - low;
  if (range < 60) return canvas; // contraste suficiente; mejora no necesaria

  const scale = 255 / range;
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = (data[i + c] - low) * scale;
      data[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function tryEncode(
  working: HTMLCanvasElement,
  type: 'image/jpeg' | 'image/png' | 'image/webp',
  quality?: number
): { base64: string; bytes: number; mimeType: EncodedImageMime } | null {
  try {
    const dataUrl = quality !== undefined
      ? working.toDataURL(type, quality)
      : working.toDataURL(type);
    const base64 = dataUrl.split(',')[1] || '';
    if (!base64) return null;
    return { base64, bytes: estimateBase64Bytes(base64), mimeType: type };
  } catch {
    return null; // formato no soportado por este navegador (ej. WebP en Safari viejo)
  }
}

/**
 * Codifica un canvas respetando el presupuesto de bytes.
 * - `digitalPage: true` (render de PDF): WebP q0.9 bajo 1.2 MB → PNG bajo 1.2 MB → JPEG escalonado.
 * - `digitalPage: false` (foto/escaneo): JPEG escalonado.
 * Si ni con la calidad más baja entra, achica dimensiones a la mitad e insiste una vez más.
 */
export function encodeCanvasWithinBudget(
  canvas: HTMLCanvasElement,
  maxBytes = MAX_PAGE_PAYLOAD_BYTES,
  options: { digitalPage?: boolean } = {}
): EncodedImage {
  let working = canvas;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (options.digitalPage) {
      const webp = tryEncode(working, 'image/webp', WEBP_DIGITAL_QUALITY);
      if (webp && webp.bytes <= Math.min(MAX_DIGITAL_WEBP_BYTES, maxBytes)) {
        return { base64: webp.base64, mimeType: 'image/webp' };
      }
      const png = tryEncode(working, 'image/png');
      if (png && png.bytes <= Math.min(MAX_DIGITAL_WEBP_BYTES, maxBytes)) {
        return { base64: png.base64, mimeType: 'image/png' };
      }
    }
    for (const quality of JPEG_QUALITY_STEPS) {
      const jpeg = tryEncode(working, 'image/jpeg', quality);
      if (jpeg && jpeg.bytes <= maxBytes) {
        return { base64: jpeg.base64, mimeType: 'image/jpeg' };
      }
    }
    // Ni con la calidad más baja entró: reducir dimensiones a la mitad e intentar de nuevo.
    working = scaleToCanvas(working, working.width, working.height, Math.max(1, Math.floor(Math.max(working.width, working.height) / 2)));
  }

  throw new Error('Esta página es demasiado pesada para enviarla incluso comprimida. Probá con menos zoom o mejor luz, o convertí el archivo a PDF.');
}

/** Atajo para el caso "el usuario subió directamente una foto/imagen" (no un PDF). Aplica mejora suave de contraste. */
export async function encodeImageFileWithinBudget(
  file: File,
  maxDimension = MAX_IMAGE_DIMENSION
): Promise<EncodedImage> {
  const canvas = await fileToScaledCanvas(file, maxDimension, { enhanceContrast: true });
  return encodeCanvasWithinBudget(canvas, MAX_PAGE_PAYLOAD_BYTES, { digitalPage: false });
}
