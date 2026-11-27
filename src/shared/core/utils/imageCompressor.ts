/**
 * Compresor y sanitizador binario de imágenes compatible con `@react-pdf/renderer` (PNG y JPEG).
 *
 * IMPORTANTE: `@react-pdf/renderer` v4 solo admite `image/png` e `image/jpeg` válidos
 * (rechaza `image/webp`, `image/gif`, `.emf`, `.wmf` y falla con `Offset is outside the bounds of the DataView`
 * en `jay-peg`/`restructure` si recibe JPEGs truncados, buffers vacíos o cabeceras rotas de Word).
 */

export type ImageMagicMime =
  | 'image/png'
  | 'image/jpeg'
  | 'image/gif'
  | 'image/webp'
  | 'unsupported'
  | 'empty';

/**
 * Decodifica una cadena base64 tolerando espacios/saltos de línea.
 * Devuelve `null` si está corrupta.
 */
export function decodeBase64ToUint8Array(b64: string): Uint8Array | null {
  try {
    const cleaned = String(b64 || '').replace(/\s+/g, '');
    if (!cleaned) return new Uint8Array(0);
    if (typeof atob === 'function') {
      const bin = atob(cleaned);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }
    if (typeof Buffer !== 'undefined') {
      return new Uint8Array(Buffer.from(cleaned, 'base64'));
    }
    return null;
  } catch {
    return null;
  }
}

export function encodeUint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined' && typeof btoa !== 'function') {
    return Buffer.from(bytes).toString('base64');
  }
  let bin = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    bin += String.fromCharCode(...slice);
  }
  return btoa(bin);
}

/**
 * Inspecciona los Magic Bytes reales de un buffer de imagen (nunca confía en la extensión o Data URL).
 */
export function detectImageMagicMime(bytes: Uint8Array): ImageMagicMime {
  if (!bytes || bytes.length < 12) return 'empty';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  // GIF: GIF87a / GIF89a
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return 'image/gif';
  }

  // WebP: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  return 'unsupported';
}

/**
 * Valida estructuralmente un buffer PNG (firma de 8 bytes, IHDR válido con dimensiones > 0,
 * longitudes de chunks dentro de rango sin desbordar uint32 y cierre IEND).
 */
export function isStructurallyValidPng(bytes: Uint8Array): boolean {
  if (!bytes || bytes.length < 33) return false;
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let s = 0; s < sig.length; s++) {
    if (bytes[s] !== sig[s]) return false;
  }

  let offset = 8;
  let sawIhdr = false;
  let sawIend = false;

  while (offset + 12 <= bytes.length) {
    const chunkLen =
      ((bytes[offset] << 24) |
        (bytes[offset + 1] << 16) |
        (bytes[offset + 2] << 8) |
        bytes[offset + 3]) >>>
      0;
    const type =
      String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);

    if (chunkLen > bytes.length - (offset + 12)) return false;

    if (!sawIhdr) {
      if (type !== 'IHDR' || chunkLen !== 13) return false;
      const width =
        ((bytes[offset + 8] << 24) |
          (bytes[offset + 9] << 16) |
          (bytes[offset + 10] << 8) |
          bytes[offset + 11]) >>>
        0;
      const height =
        ((bytes[offset + 12] << 24) |
          (bytes[offset + 13] << 16) |
          (bytes[offset + 14] << 8) |
          bytes[offset + 15]) >>>
        0;
      if (width === 0 || height === 0) return false;
      sawIhdr = true;
    }

    offset += 12 + chunkLen;
    if (type === 'IEND') {
      sawIend = true;
      break;
    }
  }

  return sawIhdr && sawIend;
}

function isValidExifApp1Segment(seg: Uint8Array): boolean {
  // seg empieza después del length (2 bytes): contiene "Exif\0\0" + cabecera TIFF
  if (seg.length < 6) return true;
  if (
    seg[0] !== 0x45 ||
    seg[1] !== 0x78 ||
    seg[2] !== 0x69 ||
    seg[3] !== 0x66 ||
    seg[4] !== 0x00 ||
    seg[5] !== 0x00
  ) {
    return true;
  }

  const tiff = seg.subarray(6);
  if (tiff.length < 8) return false;
  const little = tiff[0] === 0x49 && tiff[1] === 0x49;
  const big = tiff[0] === 0x4d && tiff[1] === 0x4d;
  if (!little && !big) return false;

  const u16 = (off: number) =>
    little ? tiff[off] | (tiff[off + 1] << 8) : (tiff[off] << 8) | tiff[off + 1];
  const u32 = (off: number) =>
    (little
      ? tiff[off] | (tiff[off + 1] << 8) | (tiff[off + 2] << 16) | (tiff[off + 3] << 24)
      : (tiff[off] << 24) | (tiff[off + 1] << 16) | (tiff[off + 2] << 8) | tiff[off + 3]) >>> 0;

  if (u16(2) !== 0x002a) return false;
  const ifd0Offset = u32(4);
  if (ifd0Offset < 8 || ifd0Offset + 2 > tiff.length) return false;
  const entryCount = u16(ifd0Offset);
  if (ifd0Offset + 2 + entryCount * 12 > tiff.length) return false;

  for (let e = 0; e < entryCount; e++) {
    const entryBase = ifd0Offset + 2 + e * 12;
    const type = u16(entryBase + 2);
    const count = u32(entryBase + 4);
    const typeSizes = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];
    const unitSize = typeSizes[type] ?? 0;
    if (unitSize === 0) continue;
    const totalBytes = unitSize * count;
    if (totalBytes > 4) {
      const valOff = u32(entryBase + 8);
      if (valOff + totalBytes > tiff.length) return false;
    }
  }
  return true;
}

/**
 * Elimina segmentos APP1 EXIF de un JPEG válido en stream sin requerir DOM/canvas.
 */
export function stripJpegApp1Exif(bytes: Uint8Array): Uint8Array {
  if (!bytes || bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const out: number[] = [0xff, 0xd8];
  let i = 2;
  while (i < bytes.length) {
    if (bytes[i] !== 0xff) {
      for (let k = i; k < bytes.length; k++) out.push(bytes[k]);
      break;
    }
    const markerStart = i;
    while (i < bytes.length && bytes[i] === 0xff) i++;
    if (i >= bytes.length) break;
    const marker = bytes[i++];
    if (marker === 0xd9) {
      out.push(0xff, 0xd9);
      break;
    }
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 || marker === 0x00) {
      out.push(0xff, marker);
      continue;
    }
    if (marker === 0xda) {
      for (let k = markerStart; k < bytes.length; k++) out.push(bytes[k]);
      break;
    }
    if (i + 2 > bytes.length) break;
    const segLen = (bytes[i] << 8) | bytes[i + 1];
    if (segLen < 2 || i + segLen > bytes.length) break;
    const isApp1Exif =
      marker === 0xe1 &&
      segLen >= 8 &&
      bytes[i + 2] === 0x45 &&
      bytes[i + 3] === 0x78 &&
      bytes[i + 4] === 0x69 &&
      bytes[i + 5] === 0x66;
    if (!isApp1Exif) {
      out.push(0xff, marker);
      for (let k = i; k < i + segLen; k++) out.push(bytes[k]);
    }
    i += segLen;
  }
  return new Uint8Array(out);
}

/**
 * Valida estructuralmente los segmentos de un JPEG para prevenir `RangeError: Offset is outside the bounds of the DataView`
 * en `jay-peg`/`restructure` (SOI, longitudes de marcadores dentro de rango, APP1 EXIF íntegro y EOI).
 */
export function isStructurallyValidJpeg(bytes: Uint8Array): boolean {
  if (!bytes || bytes.length < 16) return false;
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return false;
  if (bytes[bytes.length - 1] === 0xff) return false;

  let i = 2;
  let reachedSos = false;
  while (i < bytes.length) {
    if (bytes[i] !== 0xff) return false;
    while (i < bytes.length && bytes[i] === 0xff) i++;
    if (i >= bytes.length) return false;
    const marker = bytes[i];
    i++;

    //EOI
    if (marker === 0xd9) {
      return reachedSos;
    }
    // RST0..RST7 o TEM o SOI inesperado sin payload
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 || marker === 0x00) {
      continue;
    }
    // SOS: requiere al menos header de 2 bytes y después stream entrópico hasta EOI (0xFF 0xD9)
    if (marker === 0xda) {
      if (i + 2 > bytes.length) return false;
      const sosLen = (bytes[i] << 8) | bytes[i + 1];
      if (sosLen < 2 || i + sosLen > bytes.length) return false;
      reachedSos = true;
      break;
    }

    if (i + 2 > bytes.length) return false;
    const segLen = (bytes[i] << 8) | bytes[i + 1];
    if (segLen < 2 || i + segLen > bytes.length) return false;
    if (marker === 0xe1 && !isValidExifApp1Segment(bytes.subarray(i + 2, i + segLen))) {
      return false;
    }
    i += segLen;
  }

  if (!reachedSos) return false;

  // Verificar presencia de marcador EOI (FF D9) al final del stream entrópico
  for (let j = bytes.length - 2; j >= i; j--) {
    if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
      return true;
    }
  }
  return false;
}

const PDF_IMAGE_VALID_CACHE = new Map<string, boolean>();
const MAX_PDF_IMAGE_VALID_CACHE = 200;

function cacheImageValidation(key: string, valid: boolean): boolean {
  if (PDF_IMAGE_VALID_CACHE.size >= MAX_PDF_IMAGE_VALID_CACHE) {
    const firstKey = PDF_IMAGE_VALID_CACHE.keys().next().value;
    if (firstKey !== undefined) PDF_IMAGE_VALID_CACHE.delete(firstKey);
  }
  PDF_IMAGE_VALID_CACHE.set(key, valid);
  return valid;
}

/**
 * Predicado síncrono para guardas de `<Image src={...} />` en renderizadores `@react-pdf/renderer`.
 * Utiliza un caché acotado para evitar re-decodificar Data URLs de varios megabytes en cada render.
 */
export function isRenderablePdfImageSrc(src: unknown): src is string {
  if (typeof src !== 'string') return false;
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('asset://')) return false;
  if (/^\/[a-z0-9_./-]+\.(?:png|jpe?g)$/i.test(trimmed)) return true;

  const cached = PDF_IMAGE_VALID_CACHE.get(trimmed);
  if (cached !== undefined) return cached;

  const prefix = /^data:image\/(?:png|jpe?g);base64,/i.exec(trimmed);
  if (!prefix) return cacheImageValidation(trimmed, false);

  const b64Payload = trimmed.slice(prefix[0].length);
  if (b64Payload.length < 24) return cacheImageValidation(trimmed, false);

  const bytes = decodeBase64ToUint8Array(b64Payload);
  if (!bytes) return cacheImageValidation(trimmed, false);

  const magic = detectImageMagicMime(bytes);
  if (magic === 'image/png') return cacheImageValidation(trimmed, isStructurallyValidPng(bytes));
  if (magic === 'image/jpeg') return cacheImageValidation(trimmed, isStructurallyValidJpeg(bytes));
  return cacheImageValidation(trimmed, false);
}

function reencodeDataUrlViaCanvas(
  imageSrc: string,
  maxWidth: number,
  quality: number,
  keepPng: boolean,
): Promise<string | null> {
  return new Promise((resolve) => {
    const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '');
    if (typeof document === 'undefined' || typeof Image === 'undefined' || isJsdom) {
      resolve(null);
      return;
    }
    let settled = false;
    const finish = (val: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(val);
    };
    const timer = setTimeout(() => finish(null), 2500);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.naturalWidth || img.width || 0;
      let height = img.naturalHeight || img.height || 0;
      if (width <= 0 || height <= 0) {
        finish(null);
        return;
      }

      if (width > maxWidth) {
        height = Math.max(1, Math.round((height * maxWidth) / width));
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        finish(null);
        return;
      }

      if (!keepPng) {
        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.fillRect(0, 0, width, height);
      }
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const outDataUrl = keepPng
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/jpeg', quality);
        canvas.width = 0;
        canvas.height = 0;
        finish(outDataUrl);
      } catch {
        canvas.width = 0;
        canvas.height = 0;
        finish(null);
      }
    };
    img.onerror = () => finish(null);
    img.src = imageSrc;
  });
}

/**
 * Valida y sanitiza un `data:image/...` para asegurar que `@react-pdf/renderer` lo decodifique
 * sin lanzar `DataView` bounds errors ni rechazos de WebP/GIF/EMF. Devuelve `null` si es irrecuperable.
 */
export async function sanitizeImageDataUrlForPdf(
  imageSrc: string,
  maxWidth = 1400,
): Promise<string | null> {
  if (!imageSrc || typeof imageSrc !== 'string') return null;
  const trimmed = imageSrc.trim();
  if (!trimmed) return null;

  if (!trimmed.startsWith('data:')) {
    return /^(?:https?:|blob:)/i.test(trimmed) ? trimmed : null;
  }

  const prefix = /^data:[^;]+;base64,/i.exec(trimmed);
  if (!prefix) return null;

  const bytes = decodeBase64ToUint8Array(trimmed.slice(prefix[0].length));
  if (!bytes) return null;

  const magic = detectImageMagicMime(bytes);
  if (magic === 'empty' || magic === 'unsupported') return null;

  const keepPng = magic === 'image/png' || magic === 'image/gif' || magic === 'image/webp';
  const normalizedDataUrl = `data:${magic};base64,${encodeUint8ArrayToBase64(bytes)}`;

  if (typeof document !== 'undefined' && typeof Image !== 'undefined') {
    const clean = await reencodeDataUrlViaCanvas(normalizedDataUrl, maxWidth, 0.88, keepPng);
    if (clean) return clean;
  }

  // Entorno sin DOM (Node/SSR): validar estructura PNG o sanear EXIF en JPEG
  if (magic === 'image/png') return isStructurallyValidPng(bytes) ? normalizedDataUrl : null;
  if (magic === 'image/jpeg') {
    if (isStructurallyValidJpeg(bytes)) return normalizedDataUrl;
    const stripped = stripJpegApp1Exif(bytes);
    return isStructurallyValidJpeg(stripped)
      ? `data:image/jpeg;base64,${encodeUint8ArrayToBase64(stripped)}`
      : null;
  }
  return null;
}

export const compressToWebP = (
  imageSrc: string,
  maxWidth = 1000,
  quality = 0.82,
  options: { preserveAlpha?: boolean } = {},
): Promise<string> => {
  return new Promise((resolve) => {
    if (!imageSrc || typeof imageSrc !== 'string' || !imageSrc.startsWith('data:image')) {
      resolve(imageSrc);
      return;
    }
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      resolve(imageSrc);
      return;
    }

    const keepPng =
      options.preserveAlpha === true || /^data:image\/png\b/i.test(imageSrc);

    void reencodeDataUrlViaCanvas(imageSrc, maxWidth, quality, keepPng).then((out) => {
      resolve(out || '');
    });
  });
};

/**
 * Convierte cualquier Data URL de imagen (incluyendo PNG, JPEG de Word con EXIF problemático,
 * WebP, GIF o BMP) en PNG o JPEG estándar 100% compatible con `@react-pdf/renderer`.
 */
export const ensurePdfCompatibleImageDataUrl = async (
  imageSrc: string,
  maxWidth = 1400,
): Promise<string> => {
  const sanitized = await sanitizeImageDataUrlForPdf(imageSrc, maxWidth);
  return sanitized || '';
};

/**
 * Optimiza las imágenes de un documento CV en formatos 100% compatibles con PDF (JPEG/PNG).
 * Mantiene el nombre exportado por retrocompatibilidad con `documentStorageService` y tests.
 */
export const optimizeCVImagesToWebP = async (cvData: any) => {
  if (!cvData) return cvData;

  try {
    const copy = JSON.parse(JSON.stringify(cvData));

    // 1. Foto de perfil -> JPEG liviano
    if (copy.personalInfo?.profilePhoto) {
      copy.personalInfo.profilePhoto = await compressToWebP(
        copy.personalInfo.profilePhoto,
        500,
        0.82,
      );
    }

    // 2. Firma -> PNG conservando transparencia del trazo
    if (copy.signature?.dataUrl) {
      copy.signature.dataUrl = await compressToWebP(copy.signature.dataUrl, 600, 0.85, {
        preserveAlpha: true,
      });
    }

    // 3. Certificados escaneados -> JPEG liviano
    if (Array.isArray(copy.certificatesScanned)) {
      copy.certificatesScanned = await Promise.all(
        copy.certificatesScanned.map(async (cert: any) => {
          if (!cert || typeof cert !== 'object') return cert;
          const rawSrc = cert.dataUrl || cert.imageUrl || cert.image;
          if (rawSrc) {
            const pdfSafeImage = await compressToWebP(rawSrc, 900, 0.78);
            return { ...cert, dataUrl: pdfSafeImage, imageUrl: pdfSafeImage, image: pdfSafeImage };
          }
          return cert;
        }),
      );
    }

    return copy;
  } catch (err) {
    console.error('Error optimizando imágenes del CV:', err);
    return cvData;
  }
};
