/**
 * Motor Puro de Temas Interiores para EditorLee (`editorialInteriorTheme.ts`)
 *
 * Diferencia visualmente los interiores (capítulos, cintillos, subtítulos, tablas y citas)
 * entre las 5 grandes familias de plantillas y aplica la paleta elegida (`coverPaletteKey`),
 * verificando contraste WCAG 2.1 AA (>= 4.5:1) sobre papel blanco.
 */

import { getContrastRatio, hexToRGB, rgbToHex } from '../../../shared/core/pdf-engine/layers/colors/colorSystem';
import { PRESET_COLORS } from '../../../shared/core/pdf-engine/layers/presets/presetRegistry';
import type { ColorPalette } from '../../../shared/core/pdf-engine/layers/presets/presetSchema';
import type { EditorialPresetId, EditorialStructuralNormId } from '../domain/editorialTypes';
import { getEditorialPdfPreset } from './editorialPresets';

export type EditorialInteriorArchetype =
  | 'literario'
  | 'academico_formal'
  | 'cientifico_imryd'
  | 'ejecutivo_proyecto'
  | 'didactico_guia';

export type EditorialChapterHeaderVariant =
  | 'literary_centered_diamond'
  | 'apa_centered_clean'
  | 'imryd_accent_rule'
  | 'executive_left_bar'
  | 'didactic_pill';

export type EditorialSubtitleVariant =
  | 'literary_italic'
  | 'apa_flush_bold'
  | 'accent_left_tick'
  | 'clean_bold';

export type EditorialTableVariant =
  | 'apa'
  | 'executive_solid'
  | 'scientific_clean'
  | 'striped_guide';

export type EditorialQuoteVariant =
  | 'literary_clean'
  | 'apa_indented_clean'
  | 'accent_card';

export interface EditorialInteriorTheme {
  archetype: EditorialInteriorArchetype;
  palette: ColorPalette;
  headingColor: string;
  subtitleColor: string;
  accentColor: string;
  kickerColor: string;
  mutedColor: string;
  ruleColor: string;
  tintBgColor: string;
  tableHeaderBg: string;
  tableHeaderText: string;
  chapterDropTopPt: number;
  chapterHeaderVariant: EditorialChapterHeaderVariant;
  subtitleVariant: EditorialSubtitleVariant;
  tableVariant: EditorialTableVariant;
  quoteVariant: EditorialQuoteVariant;
}

const ARCHETYPE_BY_PRESET: Record<string, EditorialInteriorArchetype> = {
  'libro-ensayo-novela': 'literario',
  'novela-literaria': 'literario',
  'ensayo-editorial': 'literario',
  'tesis-apa7': 'academico_formal',
  'monografia-terciaria': 'academico_formal',
  'trabajo-practico-monografia-tesis': 'academico_formal',
  'articulo-academico': 'cientifico_imryd',
  'cientifico-vancouver': 'cientifico_imryd',
  'informe-proyecto': 'ejecutivo_proyecto',
  'proyecto-tecnico': 'ejecutivo_proyecto',
  'manual-apunte-guia': 'didactico_guia',
  'apunte-estudio': 'didactico_guia',
  'guia-practica': 'didactico_guia',
  'tp-secundaria': 'didactico_guia',
  'documento-libre': 'didactico_guia',
};

export function resolveEditorialInteriorArchetype(presetId?: string): EditorialInteriorArchetype {
  return (presetId && ARCHETYPE_BY_PRESET[presetId]) || 'literario';
}

function mixWithWhite(hex: string, tintWeight: number): string {
  const [r, g, b] = hexToRGB(hex || '#1E293B');
  const w = Math.max(0, Math.min(1, tintWeight));
  return rgbToHex(r + (1 - r) * w, g + (1 - g) * w, b + (1 - b) * w);
}

function ensureReadableInkOnWhite(candidate: string, fallback = '#0F172A'): string {
  if (!candidate || !candidate.startsWith('#')) return fallback;
  if (getContrastRatio('#FFFFFF', candidate) >= 4.5) return candidate;
  const darkened = mixWithWhite('#000000', 0); // Fallback seguro si falla
  if (getContrastRatio('#FFFFFF', fallback) >= 4.5) return fallback;
  return darkened;
}

export function resolveEditorialInteriorTheme(params: {
  presetId?: EditorialPresetId | string;
  design?: Record<string, any>;
  cover?: Record<string, any>;
  structuralNormId?: EditorialStructuralNormId | string;
}): EditorialInteriorTheme {
  const { presetId, design, cover, structuralNormId } = params;
  const archetype = resolveEditorialInteriorArchetype(presetId);
  const presetSpec = getEditorialPdfPreset(presetId);

  const explicitPaletteKey = design?.coverPaletteKey || cover?.coverPaletteKey;
  const manualPaletteOverride = Boolean(design?.manualOverrides?.coverPaletteKey && explicitPaletteKey);
  const palette: ColorPalette =
    (explicitPaletteKey && PRESET_COLORS[explicitPaletteKey]?.palette) || presetSpec.palette;

  const isStrictAcademicNorm = structuralNormId === 'apa7' || structuralNormId === 'mla';
  const useFormalMonochromeInk =
    isStrictAcademicNorm && archetype === 'academico_formal' && !manualPaletteOverride;

  const safePrimary = ensureReadableInkOnWhite(palette.primary, '#0F172A');
  const safeAccent = ensureReadableInkOnWhite(palette.accent || palette.secondary, safePrimary);
  const safeSecondary = ensureReadableInkOnWhite(palette.secondary || palette.primary, '#334155');

  const headingColor = useFormalMonochromeInk ? '#111827' : safePrimary;
  const subtitleColor = useFormalMonochromeInk ? '#111827' : safeSecondary;
  const accentColor = useFormalMonochromeInk ? '#1F2937' : safeAccent;
  const kickerColor = useFormalMonochromeInk ? '#374151' : safeAccent;
  const tintBgColor = mixWithWhite(safeAccent, 0.92);
  const ruleColor = useFormalMonochromeInk ? '#CBD5E1' : mixWithWhite(safeAccent, 0.72);

  const tableHeaderBg = safePrimary;
  const tableHeaderText =
    getContrastRatio(tableHeaderBg, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#0F172A';

  if (archetype === 'literario') {
    return {
      archetype,
      palette,
      headingColor,
      subtitleColor,
      accentColor,
      kickerColor,
      mutedColor: '#64748B',
      ruleColor,
      tintBgColor,
      tableHeaderBg: '#F1F5F9',
      tableHeaderText: '#0F172A',
      chapterDropTopPt: 24,
      chapterHeaderVariant: 'literary_centered_diamond',
      subtitleVariant: 'literary_italic',
      tableVariant: 'apa',
      quoteVariant: 'literary_clean',
    };
  }

  if (archetype === 'academico_formal') {
    return {
      archetype,
      palette,
      headingColor,
      subtitleColor,
      accentColor,
      kickerColor,
      mutedColor: '#475569',
      ruleColor,
      tintBgColor,
      tableHeaderBg: '#F1F5F9',
      tableHeaderText: '#0F172A',
      chapterDropTopPt: 0,
      chapterHeaderVariant: 'apa_centered_clean',
      subtitleVariant: 'apa_flush_bold',
      tableVariant: 'apa',
      quoteVariant: 'apa_indented_clean',
    };
  }

  if (archetype === 'cientifico_imryd') {
    return {
      archetype,
      palette,
      headingColor,
      subtitleColor,
      accentColor,
      kickerColor,
      mutedColor: '#475569',
      ruleColor,
      tintBgColor,
      tableHeaderBg: '#F1F5F9',
      tableHeaderText: '#0F172A',
      chapterDropTopPt: 0,
      chapterHeaderVariant: 'imryd_accent_rule',
      subtitleVariant: 'clean_bold',
      tableVariant: 'scientific_clean',
      quoteVariant: 'apa_indented_clean',
    };
  }

  if (archetype === 'ejecutivo_proyecto') {
    return {
      archetype,
      palette,
      headingColor,
      subtitleColor,
      accentColor,
      kickerColor,
      mutedColor: '#475569',
      ruleColor,
      tintBgColor,
      tableHeaderBg,
      tableHeaderText,
      chapterDropTopPt: 6,
      chapterHeaderVariant: 'executive_left_bar',
      subtitleVariant: 'accent_left_tick',
      tableVariant: 'executive_solid',
      quoteVariant: 'accent_card',
    };
  }

  // didactico_guia
  return {
    archetype,
    palette,
    headingColor,
    subtitleColor,
    accentColor,
    kickerColor,
    mutedColor: '#475569',
    ruleColor,
    tintBgColor,
    tableHeaderBg: tintBgColor,
    tableHeaderText: '#0F172A',
    chapterDropTopPt: 6,
    chapterHeaderVariant: 'didactic_pill',
    subtitleVariant: 'clean_bold',
    tableVariant: 'striped_guide',
    quoteVariant: 'accent_card',
  };
}
