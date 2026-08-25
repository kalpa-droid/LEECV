import { supabase } from '../../../lib/supabaseClient';
import { Preset } from './presetSchema';
import { registerPresetInMemory, getAllPresets, validatePresetShape } from './presetRegistry';

const LOCAL_STORAGE_CACHE_KEY = 'antigravity_preset_cache';

/**
 * Guarda presets en la caché local de localStorage.
 */
function savePresetsToLocalStorageCache(presets: Preset[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(presets));
    }
  } catch (err) {
    console.warn('No se pudo guardar caché local de presets en localStorage:', err);
  }
}

/**
 * Lee presets desde la caché local de localStorage.
 */
function loadPresetsFromLocalStorageCache(): Preset[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(validatePresetShape);
          if (valid.length > 0) return valid;
        }
      }
    }
  } catch (err) {
    console.warn('Error leyendo caché local de presets:', err);
  }
  return [];
}

/**
 * Estrategia de Fallback en 3 Niveles:
 * 1. Intenta consultar Supabase.
 * 2. Si falla o no hay red, lee de la caché local de localStorage.
 * 3. Si tampoco hay caché local, cae a la lista de presets nativos de presetRegistry.
 */
export async function fetchPresetsWithFallback(): Promise<Preset[]> {
  // 1. Intenta desde Supabase
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('template_presets')
        .select('config, is_active')
        .eq('is_active', true);

      if (!error && data && data.length > 0) {
        const fetched: Preset[] = data
          .map((row: any) => row.config as Preset)
          .filter(validatePresetShape);

        if (fetched.length > 0) {
          savePresetsToLocalStorageCache(fetched);
          return fetched;
        }
      }
    }
  } catch (err) {
    console.warn('Supabase offline o inalcanzable, intentando caché local:', err);
  }

  // 2. Fallback a Caché Local en localStorage
  const localCached = loadPresetsFromLocalStorageCache();
  if (localCached.length > 0) {
    return localCached;
  }

  // 3. Fallback a Presets Nativos Estáticos
  return getAllPresets();
}

/**
 * Exporta compatibilidad previas
 */
export const fetchPresetsFromSupabase = fetchPresetsWithFallback;

/**
 * Guarda una plantilla en Supabase, actualiza la caché local y sincroniza la memoria global.
 */
export async function savePresetToSupabase(preset: Preset): Promise<{ success: boolean; error?: string }> {
  // Registrar de inmediato en memoria local para reactividad instantánea en la UI
  registerPresetInMemory(preset);
  savePresetsToLocalStorageCache(getAllPresets());

  try {
    if (!supabase) return { success: true }; // Modo local-first exitoso en memoria

    const { error } = await supabase
      .from('template_presets')
      .upsert({
        id: preset.id,
        name: preset.name,
        config: preset,
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('Error guardando preset en Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Desactiva una plantilla en Supabase y actualiza la caché local.
 */
export async function deletePresetFromSupabase(presetId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) return { success: false, error: 'Supabase no está disponible' };

    const { error } = await supabase
      .from('template_presets')
      .update({ is_active: false })
      .eq('id', presetId);

    if (error) return { success: false, error: error.message };

    // Refrescar caché local
    savePresetsToLocalStorageCache(getAllPresets());

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}
