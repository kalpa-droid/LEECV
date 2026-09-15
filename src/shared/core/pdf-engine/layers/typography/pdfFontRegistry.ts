import { Font } from '@react-pdf/renderer';

/**
 * NÚCLEO — REGISTRO Y HIGIENE TIPOGRÁFICA PARA PDF (@react-pdf/renderer)
 * 
 * Registra fuentes seguras y proporciona sanitización determinista para evitar
 * el error: "Font family not registered: cursive. Please register it calling Font.register() method."
 */

const VALID_PDF_FONTS = new Set([
  'Helvetica',
  'Helvetica-Bold',
  'Helvetica-Oblique',
  'Helvetica-BoldOblique',
]);

let initialized = false;

export function initPdfFonts(): void {
  if (initialized) return;
  try {
    Font.registerHyphenationCallback((word) => [word]);
    initialized = true;
  } catch (_e) {
    // Ignorar si ya está registrado en el entorno
  }
}

/**
 * Sanitiza cualquier nombre de fuente (incluyendo 'cursive', 'sans-serif', etc.)
 * garantizando que NUNCA se pase una fuente no registrada a @react-pdf/renderer.
 */
export function sanitizeFontFamily(family?: string, isBold: boolean = false, isItalic: boolean = false): string {
  initPdfFonts();

  if (!family || typeof family !== 'string') {
    if (isBold && isItalic) return 'Helvetica-BoldOblique';
    return isBold ? 'Helvetica-Bold' : isItalic ? 'Helvetica-Oblique' : 'Helvetica';
  }

  // Si ya es una fuente PDF válida Y coincide exactamente con la variante bold/italic pedida,
  // se devuelve tal cual. Si coincide el nombre pero NO la variante (ej: family='Helvetica'
  // pedido con isItalic=true), no hay que devolverla como está — hay que resolver la variante
  // correcta de esa misma familia base, igual que si nunca hubiera llegado ya "válida".
  if (VALID_PDF_FONTS.has(family)) {
    const familyWantsBoldItalic = /BoldOblique|BoldItalic/.test(family);
    const familyWantsBold = /-Bold$/.test(family);
    const familyWantsItalic = /Oblique$|Italic$/.test(family) && !familyWantsBoldItalic;
    const requestMatchesFamily =
      (isBold && isItalic && familyWantsBoldItalic) ||
      (isBold && !isItalic && familyWantsBold) ||
      (!isBold && isItalic && familyWantsItalic) ||
      (!isBold && !isItalic && !familyWantsBold && !familyWantsItalic && !familyWantsBoldItalic);

    if (requestMatchesFamily) return family;
    // No coincide — se sigue resolviendo con la familia base (sin el sufijo de variante),
    // como cualquier otro nombre de fuente no reconocido.
    family = family.replace(/-Bold(Oblique|Italic)?$|-(Oblique|Italic)$/, '');
  }

  const lower = family.toLowerCase();

  if (lower.includes('times') || (lower.includes('serif') && !lower.includes('sans'))) {
    // Times-* no viene precargada en @react-pdf/font (sólo Helvetica) — hasta
    // registrar archivos reales, cae a Helvetica en vez de romper el render.
    if (isBold && isItalic) return 'Helvetica-BoldOblique';
    if (isBold) return 'Helvetica-Bold';
    if (isItalic) return 'Helvetica-Oblique';
    return 'Helvetica';
  }

  if (lower.includes('courier') || lower.includes('mono')) {
    if (isBold && isItalic) return 'Courier-BoldOblique';
    if (isBold) return 'Courier-Bold';
    if (isItalic) return 'Courier-Oblique';
    return 'Courier';
  }

  // Fallback seguro para sans-serif, cursive, o cualquier fuente no registrada
  if (isBold && isItalic) return 'Helvetica-BoldOblique';
  if (isBold) return 'Helvetica-Bold';
  if (isItalic) return 'Helvetica-Oblique';
  return 'Helvetica';
}
