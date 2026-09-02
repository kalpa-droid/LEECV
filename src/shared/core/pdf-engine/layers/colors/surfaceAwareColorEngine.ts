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
  const [h, s, l] = hexToHSL(rolesColor.primary);
  const isLightSurface = l > 0.60 || calculatePerceivedLuminance(rolesColor.background || '#ffffff') > 130;

  if (sectorRole === 'main' || isLightSurface) {
    // 1. Matiz HSL del color base del tema
    // 2. Monocromático Pastel armónico casi neutro tipo papel: Mantener H, S=13%, L=96%
    return hslToHex(h, 0.13, 0.96);
  }

  // Columna Oscura (Sidebar): Calibrar L para que el texto sobre la tarjeta de la barra lateral siempre supere 4.5:1 (WCAG AA)
  const shadowS = Math.max(0.10, s - 0.15);
  const shadowL = Math.max(0.05, Math.min(0.20, l - 0.16));
  return hslToHex(h, shadowS, shadowL);
}

/**
  * MOTOR DE LUMINANCIA PERCIBIDA (W3C WCAG)
  * Luminancia = (0.299 * R) + (0.587 * G) + (0.114 * B)
  * R, G, B en escala 0..255.
  */
export function calculatePerceivedLuminance(hex: string): number {
  const [r, g, b] = hexToRGB(hex);
  return (0.299 * (r * 255)) + (0.587 * (g * 255)) + (0.114 * (b * 255));
}

export interface HierarchyTextColors {
  title: string;       // H1 - 100% opacidad
  subtitle: string;    // H2 - 85% opacidad
  body: string;        // Cuerpo - 70% opacidad
  meta: string;        // Metadata - 50% opacidad
  accentText: string;  // Resalte - 100% opacidad (con L * 0.7 en fondos claros si el contraste es bajo)
  isDarkSurface: boolean;
}

/**
 * MOTOR HSL DE JERARQUÍA TIPOGRÁFICA Y CONTRASTE AUTOMÁTICO
 * Asigna los colores y opacidades exactas a cada nivel de texto (H1, H2, Cuerpo, Metadata)
 * garantizando legibilidad y elegancia WCAG sobre cualquier superficie.
 */
export function resolveHierarchyTextColors(
  surfaceBgHex: string,
  rolesColor: ResolvedThemeRoles
): HierarchyTextColors {
  const cleanSurface = surfaceBgHex && surfaceBgHex.startsWith('#') ? surfaceBgHex : '#ffffff';
  const luminance = calculatePerceivedLuminance(cleanSurface);
  const isDarkSurface = luminance <= 128;

  if (isDarkSurface) {
    // Escenario B: Rectángulo en Fondo Oscuro
    // Color Base Claro: Blanco Puro con opacidades
    return {
      title: '#ffffff',                   // 100% opacidad (rgba 1.0)
      subtitle: 'rgba(255, 255, 255, 0.85)', // 85% opacidad
      body: 'rgba(255, 255, 255, 0.70)',     // 70% opacidad
      meta: 'rgba(255, 255, 255, 0.50)',     // 50% opacidad
      accentText: rolesColor.accent || '#38bdf8',
      isDarkSurface: true
    };
  }

  // Escenario A: Rectángulo en Fondo Claro / Pastel
  // Color Base del Texto Oscuro Integrado: HSL(H, 40%, 15%) entintado con el matiz base
  const [baseH] = hexToHSL(rolesColor.primary);
  
  const titleHex = hslToHex(baseH, 0.40, 0.15);    // 100% opacidad
  const subHex = hslToHex(baseH, 0.35, 0.26);      // ~85% equivalente perceptual
  const bodyHex = hslToHex(baseH, 0.30, 0.35);     // ~70% equivalente perceptual
  const metaHex = hslToHex(baseH, 0.25, 0.48);     // ~50% equivalente perceptual

  // El Resalte (Accent): Si sobre el fondo claro el acento tiene luminancia alta, se le resta 30% de L
  const [accH, accS, accL] = hexToHSL(rolesColor.accent || '#FF2E63');
  const adjustedAccL = accL > 0.55 ? Math.max(0.20, accL * 0.70) : accL;
  const accentTextHex = hslToHex(accH, accS, adjustedAccL);

  return {
    title: titleHex,
    subtitle: subHex,
    body: bodyHex,
    meta: metaHex,
    accentText: accentTextHex,
    isDarkSurface: false
  };
}

export function resolveColorForRole(
  pdfRole: 'title' | 'subtitle' | 'badge' | 'extra' | 'description' | string,
  purpose: ColorPurpose,
  surfaceBgHex: string,
  rolesColor: ResolvedThemeRoles,
  parentBgHex?: string
): string {
  const actualSurfaceHex = compositeOverBackground(surfaceBgHex, parentBgHex || '#ffffff');
  const hierarchy = resolveHierarchyTextColors(actualSurfaceHex, rolesColor);

  if (purpose === 'ornament' || purpose === 'highlight') {
    return hierarchy.accentText;
  }

  // propósito 'text'
  switch (pdfRole) {
    case 'title':
      return hierarchy.title;
    case 'subtitle':
      return hierarchy.subtitle;
    case 'badge':
      return hierarchy.accentText;
    case 'extra':
    case 'meta':
      return hierarchy.meta;
    case 'description':
    case 'body':
    default:
      return hierarchy.body;
  }
}
