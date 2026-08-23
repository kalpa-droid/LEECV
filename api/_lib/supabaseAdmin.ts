import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('⚠️ [API WARNING] Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el servidor.');
}

/**
 * Cliente único de Supabase con service role — antes se creaba una instancia
 * nueva (mismas credenciales) en 8 archivos distintos de /api. Cualquier
 * endpoint o webhook nuevo importa esto, nunca vuelve a llamar createClient().
 */
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceRoleKey
);
