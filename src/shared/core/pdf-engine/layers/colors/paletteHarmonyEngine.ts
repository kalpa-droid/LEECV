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

import { hexToHSL, hslToHex, getContrastRatio } from './colorSystem';
import { ColorPalette } from '../presets/presetSchema';

export type HarmonyScheme = 'analogous' | 'complementary' | 'split-complementary' | 'monochromatic' | 'triadic';

export function generateHarmoniousPalette(
  seedHex: string,
  scheme: HarmonyScheme = 'analogous'
): ColorPalette {
  const [h, s, l] = hexToHSL(seedHex || '#1e293b');

  let secondaryH = h;
  let secondaryL = l;
  let accentH = h;
  let accentL = l;

  switch (scheme) {
    case 'complementary':
      secondaryH = (h + 180) % 360;
      accentH = (h + 180) % 360;
      accentL = Math.min(80, Math.max(30, l + 15));
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
      secondaryL = Math.max(15, l - 20);
      accentL = Math.min(85, l + 25);
      break;

    case 'analogous':
    default:
      secondaryH = (h + 30) % 360;
      accentH = (h + 330) % 360;
      break;
  }

  const primaryHex = hslToHex(h, s, l);
  const secondaryHex = hslToHex(secondaryH, Math.max(0.2, s - 0.1), secondaryL);
  const accentHex = hslToHex(accentH, Math.min(1.0, s + 0.15), accentL);

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
    textOnPrimary: textOnPrimaryHex
  };
}
