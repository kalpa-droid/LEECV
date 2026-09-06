/**
 * Extrae el color promedio de los píxeles en las 4 esquinas de una imagen JPG
 * para sugerir ese color como fondo de tarjeta en 1-clic.
 */
export function extractDominantCornerColor(imageDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('#ffffff');
        return;
      }
      ctx.drawImage(img, 0, 0);
      try {
        const corners = [
          ctx.getImageData(0, 0, 1, 1).data,
          ctx.getImageData(Math.max(0, img.width - 1), 0, 1, 1).data,
          ctx.getImageData(0, Math.max(0, img.height - 1), 1, 1).data,
          ctx.getImageData(Math.max(0, img.width - 1), Math.max(0, img.height - 1), 1, 1).data,
        ];
        const avgR = Math.round(corners.reduce((sum, c) => sum + c[0], 0) / 4);
        const avgG = Math.round(corners.reduce((sum, c) => sum + c[1], 0) / 4);
        const avgB = Math.round(corners.reduce((sum, c) => sum + c[2], 0) / 4);

        // Convertir RGB a Hex
        const toHex = (n: number) => n.toString(16).padStart(2, '0');
        resolve(`#${toHex(avgR)}${toHex(avgG)}${toHex(avgB)}`);
      } catch (_e) {
        resolve('#ffffff');
      }
    };
    img.onerror = () => resolve('#ffffff');
    img.src = imageDataUrl;
  });
}
