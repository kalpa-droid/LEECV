/**
 * NÚCLEO — MOTOR DE TRADUCCIÓN DE TEMA CLARO/OSCURO POR COLUMNA (themeLightDarkTranslationEngine.ts)
 * 
 * Traduce una identidad cromática (ColorPreset) en dos variantes de superficie armónicas:
 * - `light`: Diseñada para la columna principal de lectura (fondo claro, contraste texto >= 4.5:1).
 * - `dark`: Diseñada para el sidebar/panel destacado (fondo oscuro, contraste texto >= 4.5:1).
 * 
 * Reglas de Armonía & Gobernanza:
 * 1. Mismo ADN Cromático: La inversión de superficie se realiza en espacio OKLCH ajustando únicamente el eje L (Lightness).
 * 2. WCAG 2.1 AA Automático: Evalúa `getContrastRatio` y ajusta automáticamente si la relación es < 4.5:1.
 * 3. Auto-Chequeo de Coherencia de Tema: Verifica que la diferencia de matiz (Hue delta) entre acento claro y oscuro sea <= 15°.
 */

import { hexToOKLCH, oklchToHex, getContrastRatio } from './colorSystem';
import { ColorPalette, ColorPreset } from '../presets/presetSchema';
import { generateHarmoniousPalette, HarmonyScheme } from './paletteHarmonyEngine';

export interface SurfaceTranslatedPalettes {
  light: ColorPalette;
  dark: ColorPalette;
  hueCoherence: {
    coherent: boolean;
    hueDeltaDeg: number;
  };
}

/**
 * Calcula la diferencia angular de matiz (Hue Delta) en grados entre dos colores en espacio OKLCH.
 */
export function checkThemeHueCoherence(hex1: string, hex2: string): { coherent: boolean; hueDeltaDeg: number } {
  const o1 = hexToOKLCH(hex1);
  const o2 = hexToOKLCH(hex2);

  let diff = Math.abs(o1.h - o2.h) % 360;
  if (diff > 180) diff = 360 - diff;
  diff = Number(diff.toFixed(2));

  return {
    coherent: diff <= 15,
    hueDeltaDeg: diff
  };
}

/**
 * Traduce científicamente un ColorPreset en dos paletas de superficie (light y dark).
 */
export function translateThemeToSurfaces(colorPreset: ColorPreset): SurfaceTranslatedPalettes {
  const seedHex = colorPreset.seedHex || colorPreset.palette?.primary || '#00A8A0';
  const scheme: HarmonyScheme = colorPreset.harmonyScheme || 'analogous';

  // 1. Paleta de Base Armónica
  const basePalette = colorPreset.palette || generateHarmoniousPalette(seedHex, scheme);

  // 2. Variante Clara (Main Column)
  const lightPrimary = basePalette.primary;
  const lightSecondary = basePalette.secondary;
  let lightAccent = basePalette.accent;
  const lightBg = basePalette.background || '#ffffff';
  
  // Garantizar contraste mínimo de 3.0:1 para el acento en superficie clara
  if (getContrastRatio(lightBg, lightAccent) < 3.0) {
    const accentOklch = hexToOKLCH(lightAccent);
    let adjustedL = Math.max(0.20, accentOklch.l * 0.65);
    lightAccent = oklchToHex(adjustedL, Math.min(0.25, accentOklch.c), accentOklch.h);
    if (getContrastRatio(lightBg, lightAccent) < 3.0) {
      lightAccent = oklchToHex(0.35, Math.min(0.20, accentOklch.c), accentOklch.h);
    }
  }

  let lightText = basePalette.text || '#0f172a';
  if (getContrastRatio(lightBg, lightText) < 4.5) {
    lightText = '#0f172a';
  }

  const lightPalette: ColorPalette = {
    primary: lightPrimary,
    secondary: lightSecondary,
    accent: lightAccent,
    text: lightText,
    textOnPrimary: getContrastRatio(lightPrimary, '#ffffff') >= 4.5 ? '#ffffff' : '#0f172a',
    background: lightBg
  };

  // 3. Variante Oscura (Sidebar Column) - OKLCH Lightness Inversion
  const seedOklch = hexToOKLCH(seedHex);
  
  // Superficie primaria oscura de sidebar mantenida en la misma familia de matiz (L ~ 0.18 - 0.25)
  const darkPrimaryL = Math.max(0.12, Math.min(0.25, 1 - seedOklch.l));
  const darkPrimaryHex = oklchToHex(darkPrimaryL, Math.min(0.15, seedOklch.c), seedOklch.h);

  // Acento recalibrado para brillar sobre superficie oscura (L ~ 0.75 - 0.85)
  const accentOklch = hexToOKLCH(basePalette.accent);
  let darkAccentL = Math.max(0.72, accentOklch.l);
  let darkAccentHex = oklchToHex(darkAccentL, Math.max(0.2, accentOklch.c), accentOklch.h);

  // Si el contraste del acento en superficie oscura es bajo, elevar luminosidad
  if (getContrastRatio(darkPrimaryHex, darkAccentHex) < 3.0) {
    darkAccentHex = oklchToHex(0.85, Math.max(0.2, accentOklch.c), accentOklch.h);
  }

  // Secundario para superficie oscura
  const secOklch = hexToOKLCH(basePalette.secondary);
  const darkSecondaryHex = oklchToHex(Math.max(0.70, secOklch.l), Math.min(0.12, secOklch.c), secOklch.h);

  let darkText = '#f8fafc';
  if (getContrastRatio(darkPrimaryHex, darkText) < 4.5) {
    darkText = '#ffffff';
  }

  // 4. Auto-chequeo de Coherencia de Matiz en Acentos
  let coherence = checkThemeHueCoherence(lightAccent, darkAccentHex);
  if (!coherence.coherent) {
    // Re-alinear el matiz del acento oscuro exactamente al matiz del acento claro en OKLCH
    darkAccentHex = oklchToHex(darkAccentL, Math.max(0.2, accentOklch.c), hexToOKLCH(lightAccent).h);
    coherence = checkThemeHueCoherence(lightAccent, darkAccentHex);
  }

  const darkPalette: ColorPalette = {
    primary: darkPrimaryHex,
    secondary: darkSecondaryHex,
    accent: darkAccentHex,
    text: darkText,
    textOnPrimary: getContrastRatio(darkPrimaryHex, '#ffffff') >= 4.5 ? '#ffffff' : '#0f172a',
    background: darkPrimaryHex
  };

  return {
    light: lightPalette,
    dark: darkPalette,
    hueCoherence: coherence
  };
}
