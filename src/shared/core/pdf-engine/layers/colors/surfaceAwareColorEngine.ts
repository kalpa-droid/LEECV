/**
 * NÚCLEO — MOTOR DE COLOR CONSCIENTE DE SUPERFICIE (surfaceAwareColorEngine.ts)
 *
 * Calcula y resuelve el color exacto para cualquier rol tipográfico o propósito visual
 * (texto, resalte, adorno) garantizando contraste accesible (WCAG AA) sobre la superficie
 * real en la que se ubica el elemento (sidebar oscuro, tarjeta blanca, banner de sección).
 */

import { translatePaletteForSurface, ResolvedThemeRoles, hexToRGB, rgbToHex, hexToHSL, hslToHex } from './colorSystem';

export type ColorPurpose = 'text' | 'highlight' | 'ornament';

export function compositeOverBackground(colorStr: string, parentBgHex: string = '#ffffff'): string {
  if (!colorStr || colorStr === 'transparent') {
    return parentBgHex && parentBgHex.startsWith('#') ? parentBgHex : '#ffffff';
  }

  const cleanParent = parentBgHex && parentBgHex.startsWith('#') ? parentBgHex : '#ffffff';

  const rgbaMatch = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/i);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1], 10);
    const g = parseInt(rgbaMatch[2], 10);
    const b = parseInt(rgbaMatch[3], 10);
    const alpha = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1.0;

    if (alpha >= 0.99) {
      return rgbToHex(r / 255, g / 255, b / 255);
    }

    const [pr, pg, pb] = hexToRGB(cleanParent).map(c => Math.round(c * 255));
    const outR = Math.round(r * alpha + pr * (1 - alpha));
    const outG = Math.round(g * alpha + pg * (1 - alpha));
    const outB = Math.round(b * alpha + pb * (1 - alpha));

    return rgbToHex(outR / 255, outG / 255, outB / 255);
  }

  if (colorStr.startsWith('#')) {
    return colorStr;
  }

  return cleanParent;
}

/**
 * MOTOR HSL — Calcula el fondo sutil de los contenedores de registro (cards / tarjetas personales)
 * según el sector en el que habitan (columna clara u oscura).
 * 
 * Fórmula Algorítmica HSL:
 * - Columna Clara (Main): Monocromático Pastel HSL(H, 20%, 94%) derivado del matiz del tema.
 * - Columna Oscura (Sidebar): Monocromático Sombra HSL(H, max(0.10, S - 0.15), max(0.08, L - 0.08)).
 */
export function resolveSubtleCardBackground(
  sectorRole: 'sidebar' | 'main',
  rolesColor: ResolvedThemeRoles
): string {
  if (sectorRole === 'main') {
    // 1. Matiz HSL del color base del tema
    const [h] = hexToHSL(rolesColor.primary);
    // 2. Monocromático Pastel armónico: Mantener H, S=20%, L=94%
    return hslToHex(h, 0.20, 0.94);
  }

  // Columna Oscura (Sidebar)
  const [h, s, l] = hexToHSL(rolesColor.primary);
  const shadowS = Math.max(0.10, s - 0.15);
  const shadowL = Math.max(0.08, l - 0.08);
  return hslToHex(h, shadowS, shadowL);
}

export function resolveColorForRole(
  pdfRole: 'title' | 'subtitle' | 'badge' | 'extra' | 'description' | string,
  purpose: ColorPurpose,
  surfaceBgHex: string,
  rolesColor: ResolvedThemeRoles,
  parentBgHex?: string
): string {
  const actualSurfaceHex = compositeOverBackground(surfaceBgHex, parentBgHex || '#ffffff');
  const surfacePalette = translatePaletteForSurface(rolesColor, actualSurfaceHex);

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
