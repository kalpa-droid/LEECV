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
  'Times-Roman',
  'Times-Bold',
  'Times-Italic',
  'Times-BoldItalic',
]);

const DYNAMIC_REGISTERED_FONTS = new Set<string>();

export function registerDynamicFontFamily(family: string): void {
  if (family && typeof family === 'string') {
    DYNAMIC_REGISTERED_FONTS.add(family.trim());
  }
}

export function isDynamicFontRegistered(family?: string): boolean {
  return Boolean(family && DYNAMIC_REGISTERED_FONTS.has(family.trim()));
}

function resolveHelveticaVariant(isBold: boolean, isItalic: boolean): string {
  if (isBold && isItalic) return 'Helvetica-BoldOblique';
  if (isBold) return 'Helvetica-Bold';
  if (isItalic) return 'Helvetica-Oblique';
  return 'Helvetica';
}

function resolveTimesVariant(isBold: boolean, isItalic: boolean): string {
  if (isBold && isItalic) return 'Times-BoldItalic';
  if (isBold) return 'Times-Bold';
  if (isItalic) return 'Times-Italic';
  return 'Times-Roman';
}

export function sanitizeFontFamilyPure(
  family?: string,
  isBold: boolean = false,
  isItalic: boolean = false,
): string {
  if (!family || typeof family !== 'string') {
    return resolveHelveticaVariant(isBold, isItalic);
  }

  if (DYNAMIC_REGISTERED_FONTS.has(family.trim())) {
    return family.trim();
  }

  if (VALID_PDF_FONTS.has(family)) {
    const isTimesFamily = family.startsWith('Times');
    const familyWantsBoldItalic = /BoldOblique|BoldItalic/.test(family);
    const familyWantsBold = /-Bold$/.test(family);
    const familyWantsItalic = /Oblique$|Italic$/.test(family) && !familyWantsBoldItalic;
    const requestMatchesFamily =
      (isBold && isItalic && familyWantsBoldItalic) ||
      (isBold && !isItalic && familyWantsBold) ||
      (!isBold && isItalic && familyWantsItalic) ||
      (!isBold && !isItalic && !familyWantsBold && !familyWantsItalic && !familyWantsBoldItalic);

    if (requestMatchesFamily) return family;
    return isTimesFamily
      ? resolveTimesVariant(isBold, isItalic)
      : resolveHelveticaVariant(isBold, isItalic);
  }

  const lower = family.toLowerCase();

  if (
    lower.includes('times') ||
    lower.includes('georgia') ||
    lower.includes('garamond') ||
    lower.includes('tinos') ||
    lower.includes('computer modern') ||
    lower.includes('lora') ||
    (lower.includes('serif') && !lower.includes('sans'))
  ) {
    return resolveTimesVariant(isBold, isItalic);
  }

  if (lower.includes('courier') || lower.includes('mono')) {
    return resolveHelveticaVariant(isBold, isItalic);
  }

  return resolveHelveticaVariant(isBold, isItalic);
}

export const sanitizeFontFamily = sanitizeFontFamilyPure;
