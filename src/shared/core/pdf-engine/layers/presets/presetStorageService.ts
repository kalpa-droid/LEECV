import { supabase } from '../../../lib/supabaseClient';
import { Preset } from './presetSchema';
import { PRESET_LIST } from './presetRegistry';

/**
 * Servicio de Persistencia y Gestión Dinámica de Plantillas en Supabase (Capa 5/8)
 */

export async function fetchPresetsFromSupabase(): Promise<Preset[]> {
  try {
    if (!supabase) return PRESET_LIST;

    const { data, error } = await supabase
      .from('template_presets')
      .select('config, is_active')
      .eq('is_active', true);

    if (error || !data || data.length === 0) {
      return PRESET_LIST;
    }

    const fetchedPresets: Preset[] = data.map((row: any) => row.config as Preset);
    
    // Unir presets dinámicos con la lista base para asegurar que siempre haya al menos los nativos
    const presetMap = new Map<string, Preset>();
    PRESET_LIST.forEach(p => presetMap.set(p.id, p));
    fetchedPresets.forEach(p => presetMap.set(p.id, p));

    return Array.from(presetMap.values());
  } catch (err) {
    console.warn('Error leyendo plantillas desde Supabase, usando lista local:', err);
    return PRESET_LIST;
  }
}

export async function savePresetToSupabase(preset: Preset): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) return { success: false, error: 'Supabase no está disponible' };

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

export async function deletePresetFromSupabase(presetId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) return { success: false, error: 'Supabase no está disponible' };

    const { error } = await supabase
      .from('template_presets')
      .update({ is_active: false })
      .eq('id', presetId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}
