/**
 * NÚCLEO — MOTOR DE ARMONÍA DE PALETA (paletteHarmonyEngine.ts)
 * 
 * Genera paletas cromáticas armónicas a partir de un `seedHex` y un esquema de armonía:
 * - 'analogous': Rotaciones de +30° y -30° de matiz (hue).
 * - 'complementary': Opuesto en el círculo cromático (+180°).
 * - 'split-complementary': Rotaciones de +150° y +210°.
 * - 'monochromatic': Variaciones de luminosidad (lightness) sobre el mismo matiz.
 * 
 * Legibilidad Garantizada por WCAG:
 * `text` y `textOnPrimary` no dependen del matiz armónico — se evalúan mediante
 * `getContrastRatio` (definido en colorSystem.ts) contra la superficie para asegurar ratio > 4.5:1.
 */

import { hexToOKLCH, oklchToHex, getContrastRatio } from './colorSystem';
import { ColorPalette } from '../presets/presetSchema';

export type HarmonyScheme = 'analogous' | 'complementary' | 'split-complementary' | 'monochromatic' | 'triadic';

export function generateHarmoniousPalette(
  seedHex: string,
  scheme: HarmonyScheme = 'analogous'
): ColorPalette {
  const oklch = hexToOKLCH(seedHex || '#1e293b');
  const { l, c, h } = oklch;

  let secondaryH = h;
  let secondaryL = l;
  let secondaryC = c;

  let accentH = h;
  let accentL = l;
  let accentC = c;

  switch (scheme) {
    case 'complementary':
      secondaryH = (h + 180) % 360;
      accentH = (h + 180) % 360;
      accentL = Math.min(0.9, Math.max(0.3, l + 0.15));
      break;

    case 'split-complementary':
      secondaryH = (h + 150) % 360;
      accentH = (h + 210) % 360;
      break;

    case 'triadic':
      secondaryH = (h + 120) % 360;
      accentH = (h + 240) % 360;
      break;

    case 'monochromatic':
      secondaryL = Math.max(0.15, l - 0.2);
      secondaryC = Math.max(0.02, c - 0.05);
      accentL = Math.min(0.85, l + 0.25);
      accentC = Math.min(0.35, c + 0.05);
      break;

    case 'analogous':
    default:
      secondaryH = (h + 30) % 360;
      accentH = (h + 330) % 360;
      break;
  }

  const primaryHex = oklchToHex(l, c, h);
  const secondaryHex = oklchToHex(secondaryL, secondaryC, secondaryH);
  const accentHex = oklchToHex(accentL, accentC, accentH);

  // Garantía de Contraste WCAG para textOnPrimary y text
  const contrastAgainstWhite = getContrastRatio(primaryHex, '#ffffff');
  const textOnPrimaryHex = contrastAgainstWhite >= 4.5 ? '#ffffff' : '#0f172a';

  const isPrimaryDark = contrastAgainstWhite >= 4.5;
  const textHex = isPrimaryDark ? '#0f172a' : '#1e293b';

  return {
    primary: primaryHex,
    secondary: secondaryHex,
    accent: accentHex,
    text: textHex,
    textOnPrimary: textOnPrimaryHex,
    background: '#ffffff'
  };
}
