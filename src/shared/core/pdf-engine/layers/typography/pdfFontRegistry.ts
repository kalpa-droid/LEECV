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
  'Times-Roman',
  'Times-Bold',
  'Times-Italic',
  'Times-BoldItalic',
  'Courier',
  'Courier-Bold',
  'Courier-Oblique',
  'Courier-BoldOblique'
]);

let initialized = false;

export function initPdfFonts(): void {
  if (initialized) return;
  try {
    Font.registerHyphenation((word) => [word]);
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
    return isBold ? 'Helvetica-Bold' : isItalic ? 'Helvetica-Oblique' : 'Helvetica';
  }

  // Si ya es una fuente PDF válida con variante exacta
  if (VALID_PDF_FONTS.has(family)) {
    return family;
  }

  const lower = family.toLowerCase();

  if (lower.includes('times') || lower.includes('serif') && !lower.includes('sans')) {
    if (isBold && isItalic) return 'Times-BoldItalic';
    if (isBold) return 'Times-Bold';
    if (isItalic) return 'Times-Italic';
    return 'Times-Roman';
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
