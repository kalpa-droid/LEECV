/**
 * NÚCLEO — MOTOR DE COLOR CONSCIENTE DE SUPERFICIE (surfaceAwareColorEngine.ts)
 *
 * Calcula y resuelve el color exacto para cualquier rol tipográfico o propósito visual
 * (texto, resalte, adorno) garantizando contraste accesible (WCAG AA) sobre la superficie
 * real en la que se ubica el elemento (sidebar oscuro, tarjeta blanca, banner de sección).
 */

import { translatePaletteForSurface, ResolvedThemeRoles } from './colorSystem';

export type ColorPurpose = 'text' | 'highlight' | 'ornament';

export function resolveColorForRole(
  pdfRole: 'title' | 'subtitle' | 'badge' | 'extra' | 'description' | string,
  purpose: ColorPurpose,
  surfaceBgHex: string,
  rolesColor: ResolvedThemeRoles
): string {
  const surfacePalette = translatePaletteForSurface(rolesColor, surfaceBgHex);

  if (purpose === 'ornament') {
    return surfacePalette.accent;
  }

  if (purpose === 'highlight') {
    return surfacePalette.accent;
  }

  // propósito 'text'
  switch (pdfRole) {
    case 'title':
      return surfacePalette.title;
    case 'subtitle':
      return surfacePalette.subtitle;
    case 'badge':
      return surfacePalette.accent;
    case 'extra':
    case 'description':
    default:
      return surfacePalette.bodyText;
  }
}
