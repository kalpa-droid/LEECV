import { Preset } from './presetSchema';
import { cvClasicoPreset } from './presets/cv-clasico';
import { modernCorporatePreset } from './presets/modern-corporate';
import { minimalEditorialPreset } from './presets/minimal-editorial';
import { creativeSustentablePreset } from './presets/creative-sustentable';
import { tarjetaPersonalPreset } from './presets/tarjeta-personal';

import { composePreset } from './presetCompositionEngine';
import { PRESET_COLORS, PRESET_TYPOGRAPHY, PRESET_COLUMNS } from './presetCompositionInstances';

// Presets nativos por defecto compilados vía el Motor de Composición
const NATIVE_PRESETS: Preset[] = [
  composePreset({
    seedHex: cvClasicoPreset.palette.primary,
    basePreset: cvClasicoPreset,
    colorPreset: PRESET_COLORS.clasico,
    typographyPreset: PRESET_TYPOGRAPHY.clasica,
    columnLayoutPreset: PRESET_COLUMNS['sidebar-left'],
    id: cvClasicoPreset.id,
    name: cvClasicoPreset.name
  }),
  composePreset({
    seedHex: modernCorporatePreset.palette.primary,
    basePreset: modernCorporatePreset,
    colorPreset: PRESET_COLORS.sobrio,
    typographyPreset: PRESET_TYPOGRAPHY.moderna,
    columnLayoutPreset: PRESET_COLUMNS['sidebar-left'],
    id: modernCorporatePreset.id,
    name: modernCorporatePreset.name
  }),
  composePreset({
    seedHex: minimalEditorialPreset.palette.primary,
    basePreset: minimalEditorialPreset,
    colorPreset: PRESET_COLORS.elegante,
    typographyPreset: PRESET_TYPOGRAPHY.editorial,
    columnLayoutPreset: PRESET_COLUMNS['full-width'],
    id: minimalEditorialPreset.id,
    name: minimalEditorialPreset.name
  }),
  composePreset({
    seedHex: creativeSustentablePreset.palette.primary,
    basePreset: creativeSustentablePreset,
    colorPreset: PRESET_COLORS.joven,
    typographyPreset: PRESET_TYPOGRAPHY.editorial,
    columnLayoutPreset: PRESET_COLUMNS['sidebar-right'],
    id: creativeSustentablePreset.id,
    name: creativeSustentablePreset.name
  }),
  composePreset({
    seedHex: tarjetaPersonalPreset.palette.primary,
    basePreset: tarjetaPersonalPreset,
    id: tarjetaPersonalPreset.id,
    name: tarjetaPersonalPreset.name
  })
];

// Mapa en memoria dinámico
const PRESET_MAP = new Map<string, Preset>();
NATIVE_PRESETS.forEach(p => PRESET_MAP.set(p.id, p));

// Contador de versión y mini pub-sub (15 líneas)
let presetsVersion = 0;
const listeners = new Set<() => void>();

export function subscribeToPresetChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPresetsSnapshot(): number {
  return presetsVersion;
}

function notifyListeners() {
  presetsVersion++;
  listeners.forEach(callback => {
    try {
      callback();
    } catch (err) {
      console.error('Error en suscriptor de presetRegistry:', err);
    }
  });
}

/**
 * Validador de estructura de Preset (Capa de resiliencia anti-corrupción)
 */
export function validatePresetShape(raw: any): raw is Preset {
  if (!raw || typeof raw !== 'object') return false;
  if (typeof raw.id !== 'string' || !raw.id.trim()) return false;
  if (typeof raw.name !== 'string' || !raw.name.trim()) return false;
  if (!raw.palette || typeof raw.palette !== 'object') return false;
  if (!raw.palette.primary || !raw.palette.secondary || !raw.palette.accent) return false;
  if (!raw.typography || typeof raw.typography !== 'object') return false;
  if (!Array.isArray(raw.sectors)) return false;
  return true;
}

/**
 * Registra o actualiza un preset en la memoria global en tiempo de ejecución.
 */
export function registerPresetInMemory(preset: any): boolean {
  if (!validatePresetShape(preset)) {
    console.warn(`⚠️ Preset invalido descartado [id: ${preset?.id}]: Estructura corrupta o incompleta.`, preset);
    return false;
  }

  PRESET_MAP.set(preset.id, preset);
  notifyListeners();
  return true;
}

/**
 * Consulta síncrona instantánea y segura para @react-pdf/renderer y CVPreview.
 */
export function getPreset(id: string): Preset {
  return PRESET_MAP.get(id) || PRESET_MAP.get('cv-clasico') || cvClasicoPreset;
}

/**
 * Devuelve la lista completa de plantillas activas registradas.
 */
export function getAllPresets(): Preset[] {
  return Array.from(PRESET_MAP.values());
}

/**
 * Compatibilidad con exportaciones estáticas previas
 */
export const PRESET_REGISTRY: Record<string, Preset> = new Proxy({}, {
  get(_, prop: string) {
    return PRESET_MAP.get(prop);
  },
  ownKeys() {
    return Array.from(PRESET_MAP.keys());
  },
  getOwnPropertyDescriptor(_, prop: string) {
    if (PRESET_MAP.has(prop)) {
      return { enumerable: true, configurable: true, value: PRESET_MAP.get(prop) };
    }
    return undefined;
  }
});

export const PRESET_LIST: Preset[] = new Proxy([], {
  get(_, prop: string) {
    if (prop === 'length') return PRESET_MAP.size;
    if (prop === 'map') return Array.from(PRESET_MAP.values()).map.bind(Array.from(PRESET_MAP.values()));
    if (prop === 'forEach') return Array.from(PRESET_MAP.values()).forEach.bind(Array.from(PRESET_MAP.values()));
    if (prop === 'filter') return Array.from(PRESET_MAP.values()).filter.bind(Array.from(PRESET_MAP.values()));
    if (prop === 'find') return Array.from(PRESET_MAP.values()).find.bind(Array.from(PRESET_MAP.values()));
    if (Symbol.iterator in Object(prop)) return Array.from(PRESET_MAP.values())[Symbol.iterator];
    const index = Number(prop);
    if (!isNaN(index)) {
      return Array.from(PRESET_MAP.values())[index];
    }
    return (Array.from(PRESET_MAP.values()) as any)[prop];
  }
});

/**
 * Sincroniza dinámicamente plantillas desde presetStorageService (Supabase / localStorage)
 * evitando ciclos de importación estática mediante import() dinámico.
 */
export async function syncPresetsFromStorage(): Promise<Preset[]> {
  try {
    const { fetchPresetsWithFallback } = await import('./presetStorageService');
    const fetchedPresets = await fetchPresetsWithFallback();

    let updatedCount = 0;
    fetchedPresets.forEach(p => {
      if (registerPresetInMemory(p)) {
        updatedCount++;
      }
    });
    console.info(`[presetRegistry] ${updatedCount} preset(s) sincronizados desde storage`);

    return getAllPresets();
  } catch (err) {
    console.warn('Error sincronizando presets desde el storage:', err);
    return getAllPresets();
  }
}
