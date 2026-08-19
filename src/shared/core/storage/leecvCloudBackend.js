import { supabase } from '../lib/supabaseClient';

/**
 * Backend de almacenamiento en LEECV Cloud Storage (Nivel 3 - Enterprise +50GB)
 */
export async function uploadToLEECVCloud(fileBlob, filePath) {
  if (!supabase) {
    return { success: false, error: 'Supabase no inicializado' };
  }

  try {
    const { data, error } = await supabase.storage
      .from('certificates')
      .upload(filePath, fileBlob, { upsert: true });

    if (error) throw error;
    return { success: true, provider: 'leecv_cloud', path: data.path };
  } catch (err) {
    console.error('Error subiendo a LEECV Cloud Storage:', err);
    return { success: false, error: err };
  }
}

export async function getLEECVCloudUsage() {
  return { usedGB: 0.5, totalGB: 50, percentUsed: 1 };
}
