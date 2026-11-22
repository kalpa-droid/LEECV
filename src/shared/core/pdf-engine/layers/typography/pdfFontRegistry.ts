import { Font } from '@react-pdf/renderer';
import { sanitizeFontFamilyPure } from './fontSanitizer';

/**
 * NÚCLEO — REGISTRO Y HIGIENE TIPOGRÁFICA PARA PDF (@react-pdf/renderer)
 *
 * Registra fuentes seguras y proporciona sanitización determinista para evitar
 * el error: "Font family not registered: cursive. Please register it calling Font.register() method."
 */

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
export function sanitizeFontFamily(
  family?: string,
  isBold: boolean = false,
  isItalic: boolean = false,
): string {
  initPdfFonts();
  return sanitizeFontFamilyPure(family, isBold, isItalic);
}
