import { Preset } from './presetSchema';
import { cvClasicoPreset } from './presets/cv-clasico';
import { tarjetaPersonalPreset } from './presets/tarjeta-personal';

export const PRESET_REGISTRY: Record<string, Preset> = {
  'cv-clasico': cvClasicoPreset,
  'tarjeta-personal': tarjetaPersonalPreset,
};

export const PRESET_LIST: Preset[] = [
  cvClasicoPreset,
  tarjetaPersonalPreset,
];

export function getPreset(id: string): Preset {
  return PRESET_REGISTRY[id] || cvClasicoPreset;
}
