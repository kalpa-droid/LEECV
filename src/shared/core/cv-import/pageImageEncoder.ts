/**
 * Convierte una página (PDF rasterizado o foto sacada con el celular) a un JPEG en base64
 * que entra seguro dentro del límite de tamaño de pedido de Vercel para funciones serverless
 * (4.5 MB, fijo por la plataforma — ningún ajuste del lado del código lo puede subir).
 *
 * Por qué hace falta esto: una foto de cámara de celular sin procesar suele pesar entre 3 y 12 MB.
 * En base64 eso crece ~33% más. Mandarla tal cual como estaba (`FileReader.readAsDataURL` directo)
 * supera el límite de la plataforma y la función se cae con un error opaco, sin importar cuánto se
 * suba `maxDuration` o cualquier config de tamaño de body — esa config es de Next.js y este
 * proyecto no usa Next.js (son funciones `@vercel/node` puras), así que no hace nada.
 */

/** Lado más largo al que se reduce cualquier imagen antes de mandarla. Alcanza de sobra para que la IA lea el texto. */
export const MAX_IMAGE_DIMENSION = 2000;

/** Margen de seguridad bien por debajo del límite real de 4.5 MB de Vercel (deja lugar al resto del JSON). */
export const MAX_PAGE_PAYLOAD_BYTES = 3_500_000;

const QUALITY_STEPS = [0.82, 0.7, 0.55, 0.4] as const;

/** Tamaño aproximado en bytes que ocupa una cadena base64 (sin el prefijo "data:...,"). */
export function estimateBase64Bytes(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

/** Redimensiona un archivo de imagen (foto de cámara, JPG/PNG) a un canvas, sin superar MAX_IMAGE_DIMENSION. */
export async function fileToScaledCanvas(file: File, maxDimension = MAX_IMAGE_DIMENSION): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  try {
    return scaleToCanvas(bitmap, bitmap.width, bitmap.height, maxDimension);
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
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Si un canvas (una página de PDF ya rasterizada, por ejemplo) es más grande que MAX_IMAGE_DIMENSION,
 * lo reescala. Para el caso normal (páginas de PDF a escala 1.5) esto no hace nada — es la red de
 * seguridad para páginas de formato muy grande (afiches, planos) que igual llegaran a esta función.
 */
export function clampCanvasSize(canvas: HTMLCanvasElement, maxDimension = MAX_IMAGE_DIMENSION): HTMLCanvasElement {
  if (Math.max(canvas.width, canvas.height) <= maxDimension) return canvas;
  return scaleToCanvas(canvas, canvas.width, canvas.height, maxDimension);
}

/**
 * Codifica un canvas a JPEG en base64 (sin el prefijo "data:image/jpeg;base64,"), bajando la
 * calidad en escalones hasta entrar en MAX_PAGE_PAYLOAD_BYTES. Si ni con la calidad más baja
 * entra, achica también las dimensiones a la mitad e insiste una vez más antes de rendirse.
 */
export function encodeCanvasWithinBudget(canvas: HTMLCanvasElement, maxBytes = MAX_PAGE_PAYLOAD_BYTES): string {
  let working = canvas;
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const quality of QUALITY_STEPS) {
      const dataUrl = working.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.split(',')[1] || '';
      if (estimateBase64Bytes(base64) <= maxBytes) return base64;
    }
    // Ni con la calidad más baja entró: reducir dimensiones a la mitad e intentar de nuevo.
    working = scaleToCanvas(working, working.width, working.height, Math.max(1, Math.floor(Math.max(working.width, working.height) / 2)));
  }
  throw new Error('Esta página es demasiado pesada para enviarla incluso comprimida. Probá con menos zoom o mejor luz, o convertí el archivo a PDF.');
}

/** Atajo para el caso "el usuario subió directamente una foto/imagen" (no un PDF). */
export async function encodeImageFileWithinBudget(file: File, maxDimension = MAX_IMAGE_DIMENSION): Promise<string> {
  const canvas = await fileToScaledCanvas(file, maxDimension);
  return encodeCanvasWithinBudget(canvas);
}
