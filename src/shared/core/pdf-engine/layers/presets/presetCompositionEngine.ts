/**
 * NÚCLEO — MOTOR DE COMPOSICIÓN DE PRESET (presetCompositionEngine.ts)
 * 
 * Unifica los 4 motores armónicos anteriores (jerarquía tipográfica, acento semántico,
 * armonía cromática HSL y arquetipos de maquetación) en una única función declarativa `composePreset`.
 * 
 * Permite que definir un preset nuevo o modificar uno existente requiera únicamente 5 decisiones
 * de diseño de alto nivel en lugar de declarar cientos de hex y tokens desarticulados.
 */

import { Preset } from './presetSchema';
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
  fontFamily?: string;
  recordScaleRatios?: RecordScaleRatios;
  basePreset: Preset; // Estructura geométrica y sectores base
}

export function composePreset(seed: PresetSeed): Preset {
  const generatedPalette = generateHarmoniousPalette(seed.seedHex, seed.harmonyScheme || 'analogous');

  return {
    ...seed.basePreset,
    id: seed.id,
    name: seed.name,
    pageCategory: seed.pageCategory || seed.basePreset.pageCategory,
    pageSizeId: seed.pageSizeId || seed.basePreset.pageSizeId,
    marginPresetId: seed.marginPresetId || seed.basePreset.marginPresetId,
    palette: generatedPalette,
    paletteSeed: {
      seedHex: seed.seedHex,
      harmonyScheme: seed.harmonyScheme || 'analogous'
    },
    typography: {
      ...seed.basePreset.typography,
      fontFamily: seed.fontFamily || seed.basePreset.typography.fontFamily,
      recordScaleRatios: seed.recordScaleRatios || seed.basePreset.typography.recordScaleRatios
    }
  };
}
