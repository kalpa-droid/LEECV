/**
 * Compresor de imágenes compatible con @react-pdf/renderer (PNG y JPEG).
 *
 * IMPORTANTE: `@react-pdf/renderer` v4 solo admite `image/png` e `image/jpeg`
 * (rechaza `image/webp` e `image/gif`). Por eso:
 * - Si `preserveAlpha` es true o el origen es PNG/WebP/GIF con posible transparencia (ej. firmas),
 *   exporta `image/png`.
 * - En fotos y certificados escaneados exporta `image/jpeg` liviano con fondo blanco seguro.
 */
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

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width || 1;
      let height = img.height || 1;

      if (width > maxWidth) {
        height = Math.max(1, Math.round((height * maxWidth) / width));
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageSrc);
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
        resolve(outDataUrl);
      } catch {
        canvas.width = 0;
        canvas.height = 0;
        resolve(imageSrc);
      }
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
};

/**
 * Convierte cualquier Data URL `image/webp` o `image/gif` heredada (de CVs guardados previamente
 * o extraída de documentos `.docx`) a `image/png` compatible con `@react-pdf/renderer`.
 */
export const ensurePdfCompatibleImageDataUrl = (
  imageSrc: string,
  maxWidth = 1400,
): Promise<string> => {
  if (
    !imageSrc ||
    typeof imageSrc !== 'string' ||
    !/^data:image\/(?:webp|gif|bmp)\b/i.test(imageSrc)
  ) {
    return Promise.resolve(imageSrc);
  }
  return compressToWebP(imageSrc, maxWidth, 0.88, { preserveAlpha: true });
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
