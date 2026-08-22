import { Preset } from './presetSchema';
import { cvClasicoPreset } from './presets/cv-clasico';
import { modernCorporatePreset } from './presets/modern-corporate';
import { minimalEditorialPreset } from './presets/minimal-editorial';
import { tarjetaPersonalPreset } from './presets/tarjeta-personal';

export const PRESET_REGISTRY: Record<string, Preset> = {
  'cv-clasico': cvClasicoPreset,
  'modern-corporate': modernCorporatePreset,
  'minimal-editorial': minimalEditorialPreset,
  'tarjeta-personal': tarjetaPersonalPreset,
};

export const PRESET_LIST: Preset[] = [
  cvClasicoPreset,
  modernCorporatePreset,
  minimalEditorialPreset,
  tarjetaPersonalPreset,
];

export function getPreset(id: string): Preset {
  return PRESET_REGISTRY[id] || cvClasicoPreset;
}
