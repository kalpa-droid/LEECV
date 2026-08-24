/**
 * NÚCLEO — MOTOR DE COMPOSICIÓN DE PRESET (presetCompositionEngine.ts)
 * 
 * Unifica los 4 motores armónicos anteriores (jerarquía tipográfica, acento semántico,
 * armonía cromática HSL y arquetipos de maquetación) en una única función declarativa `composePreset`.
 * 
 * Permite que definir un preset nuevo o modificar uno existente requiera únicamente 5 decisiones
 * de diseño de alto nivel en lugar de declarar cientos de hex y tokens desarticulados.
 */

import { Preset, ColorPreset, TypographyPreset, ColumnLayoutPreset } from './presetSchema';
import { generateHarmoniousPalette, HarmonyScheme } from '../colors/paletteHarmonyEngine';
import { RecordScaleRatios } from '../typography/typographyHierarchyEngine';

export interface PresetSeed {
  id: string;
  name: string;
  pageCategory?: 'documento' | 'tarjeta' | 'afiche';
  pageSizeId?: string;
  marginPresetId?: string;
  seedHex: string;
  harmonyScheme?: HarmonyScheme;
  colorPreset?: ColorPreset;
  typographyPreset?: TypographyPreset;
  columnLayoutPreset?: ColumnLayoutPreset;
  fontFamily?: string;
  recordScaleRatios?: RecordScaleRatios;
  basePreset: Preset; // Estructura geométrica y sectores base
}

export function composePreset(seed: PresetSeed): Preset {
  const seedHex = seed.colorPreset?.seedHex || seed.seedHex;
  const scheme = seed.colorPreset?.harmonyScheme || seed.harmonyScheme || 'analogous';
  const generatedPalette = seed.colorPreset?.palette || generateHarmoniousPalette(seedHex, scheme);

  return {
    ...seed.basePreset,
    id: seed.id,
    name: seed.name,
    colorPresetId: seed.colorPreset?.id,
    typographyPresetId: seed.typographyPreset?.id,
    columnLayoutPresetId: seed.columnLayoutPreset?.id,
    pageCategory: seed.pageCategory || seed.basePreset.pageCategory,
    pageSizeId: seed.pageSizeId || seed.basePreset.pageSizeId,
    marginPresetId: seed.marginPresetId || seed.basePreset.marginPresetId,
    palette: generatedPalette,
    sectionOrder: seed.columnLayoutPreset?.sectionOrder || seed.basePreset.sectionOrder,
    paletteSeed: {
      seedHex: seedHex,
      harmonyScheme: scheme
    },
    typography: {
      ...(seed.typographyPreset?.typography || seed.basePreset.typography),
      fontFamily: seed.fontFamily || seed.typographyPreset?.typography.fontFamily || seed.basePreset.typography.fontFamily,
      recordScaleRatios: seed.recordScaleRatios || seed.basePreset.typography.recordScaleRatios
    }
  };
}
