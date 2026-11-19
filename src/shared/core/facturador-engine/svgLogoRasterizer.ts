/**
 * LOGO SVG → PNG
 *
 * @react-pdf/renderer no rasteriza SVGs arbitrarios de forma segura. Al subir
 * un .svg guardamos el original intacto (para el respaldo del pendrive) y
 * generamos en paralelo un PNG transparente de 600 px para el PDF.
 */

const MAX_WIDTH = 600;

export function sanitizeSvg(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let svg = raw.trim();
  if (!svg.startsWith('<svg') && !svg.startsWith('<?xml')) return null;
  // Defensa básica: fuera scripts, foreignObject y manejadores inline.
  svg = svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
  return svg;
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Rasteriza el SVG a PNG transparente. Devuelve `null` si el navegador no
 * puede dibujarlo (el PDF cae al membrete sin logo, sin romper la exportación).
 */
export async function rasterizeSvgToPng(rawSvg: string): Promise<string | null> {
  const svg = sanitizeSvg(rawSvg);
  if (!svg) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const ratio = img.height && img.width ? img.height / img.width : 1;
        const width = Math.min(MAX_WIDTH, img.width || MAX_WIDTH);
        const height = Math.max(1, Math.round(width * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = svgToDataUrl(svg);
  });
}

export function isSvgFile(file: File): boolean {
  return file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
}

export function isPngFile(file: File): boolean {
  return file.type === 'image/png' || /\.png$/i.test(file.name);
}

/** Lee un archivo de imagen como SVG crudo o como dataURL PNG listo para el PDF. */
export async function readLogoFile(file: File): Promise<{ svgRaw?: string; pngDataUrl?: string }> {
  if (isSvgFile(file)) {
    const svgRaw = await file.text();
    const clean = sanitizeSvg(svgRaw);
    if (!clean) throw new Error('svg_invalido');
    const pngDataUrl = await rasterizeSvgToPng(clean);
    return { svgRaw: clean, pngDataUrl: pngDataUrl || undefined };
  }
  if (isPngFile(file)) {
    const pngDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('png_invalido'));
      reader.readAsDataURL(file);
    });
    return { pngDataUrl };
  }
  throw new Error('formato_no_soportado');
}
