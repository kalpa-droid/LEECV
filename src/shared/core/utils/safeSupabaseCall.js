/**
 * safeSupabaseCall.js
 * Centralized wrapper for Supabase database calls.
 * Catches network failures, handles errors consistently, and prevents app crashes.
 */

export async function safeSupabaseCall(asyncFn, fallbackValue = null, errorMessage = 'Error al comunicar con la base de datos.') {
  try {
    const result = await asyncFn();

    if (result && typeof result === 'object' && 'error' in result && result.error) {
      console.warn(`[Supabase Error]: ${result.error.message || result.error}`);
      return { success: false, data: fallbackValue, error: result.error };
    }

    return { success: true, data: result?.data ?? result, error: null };
  } catch (err) {
    console.error(`[Supabase Exception]: ${errorMessage}`, err);
    return { success: false, data: fallbackValue, error: err };
  }
}
