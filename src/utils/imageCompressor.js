/**
 * Image Compressor Utility using HTML5 Canvas
 * Converts base64 / blob images to lightweight WebP format automatically
 */
export const compressToWebP = (imageSrc, maxWidth = 1000, quality = 0.8) => {
  return new Promise((resolve) => {
    if (!imageSrc || typeof imageSrc !== 'string' || !imageSrc.startsWith('data:image')) {
      resolve(imageSrc);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const webpDataUrl = canvas.toDataURL('image/webp', quality);
        resolve(webpDataUrl);
      } catch {
        resolve(imageSrc);
      }
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
};

/**
 * Optimizes an entire CV data object by compressing all image assets to WebP
 */
export const optimizeCVImagesToWebP = async (cvData) => {
  if (!cvData) return cvData;

  const copy = JSON.parse(JSON.stringify(cvData));

  // 1. Optimize Profile Photo
  if (copy.personalInfo?.profilePhoto) {
    copy.personalInfo.profilePhoto = await compressToWebP(copy.personalInfo.profilePhoto, 600, 0.8);
  }

  // 2. Optimize Signature
  if (copy.signature?.dataUrl) {
    copy.signature.dataUrl = await compressToWebP(copy.signature.dataUrl, 800, 0.85);
  }

  // 3. Optimize Scanned Certificate Photos
  if (Array.isArray(copy.certificatesScanned)) {
    copy.certificatesScanned = await Promise.all(
      copy.certificatesScanned.map(async (cert) => {
        if (cert.image) {
          const webpImage = await compressToWebP(cert.image, 1000, 0.75);
          return { ...cert, image: webpImage };
        }
        return cert;
      })
    );
  }

  return copy;
};
