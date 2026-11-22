/**
 * Sanitizador puro de nombres de fuentes tipográficas para el motor PDF.
 * Libre de imports de `@react-pdf/renderer` para evitar arrastrar el runtime PDF
 * al bundle inicial del navegador (el registro de fuentes ocurre bajo demanda en
 * `pdfFontRegistry.ts`).
 */

const VALID_PDF_FONTS = new Set([
  'Helvetica',
  'Helvetica-Bold',
  'Helvetica-Oblique',
  'Helvetica-BoldOblique',
]);

export function sanitizeFontFamilyPure(
  family?: string,
  isBold: boolean = false,
  isItalic: boolean = false,
): string {
  if (!family || typeof family !== 'string') {
    if (isBold && isItalic) return 'Helvetica-BoldOblique';
    return isBold ? 'Helvetica-Bold' : isItalic ? 'Helvetica-Oblique' : 'Helvetica';
  }

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
    family = family.replace(/-Bold(Oblique|Italic)?$|-(Oblique|Italic)$/, '');
  }

  const lower = family.toLowerCase();

  if (lower.includes('times') || (lower.includes('serif') && !lower.includes('sans'))) {
    if (isBold && isItalic) return 'Helvetica-BoldOblique';
    if (isBold) return 'Helvetica-Bold';
    if (isItalic) return 'Helvetica-Oblique';
    return 'Helvetica';
  }

  if (lower.includes('courier') || lower.includes('mono')) {
    if (isBold && isItalic) return 'Helvetica-BoldOblique';
    if (isBold) return 'Helvetica-Bold';
    if (isItalic) return 'Helvetica-Oblique';
    return 'Helvetica';
  }

  if (isBold && isItalic) return 'Helvetica-BoldOblique';
  if (isBold) return 'Helvetica-Bold';
  if (isItalic) return 'Helvetica-Oblique';
  return 'Helvetica';
}

export const sanitizeFontFamily = sanitizeFontFamilyPure;
