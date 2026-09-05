import { supabase } from '../lib/supabaseClient';

/**
 * Backend de almacenamiento en LEECV Cloud Storage (Nivel 3 - Enterprise +50GB)
 *
 * Todas las rutas van prefijadas con el user_id como primer segmento de carpeta,
 * porque la política RLS del bucket 'certificates' exige
 * (storage.foldername(name))[1] = auth.uid()::text — sin este prefijo, cualquier
 * subida chocaría contra la policy y fallaría silenciosamente.
 */
export async function uploadToLEECVCloud(fileBlob: Blob, filePath: string) {
  if (!supabase) {
    return { success: false, error: 'Supabase no inicializado' };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sesión no válida' };

    const scopedPath = `${user.id}/${filePath}`;

    const { data, error } = await supabase.storage
      .from('certificates')
      .upload(scopedPath, fileBlob, { upsert: true });

    if (error) throw error;
    return { success: true, provider: 'leecv_cloud', path: data.path, fileId: data.path };
  } catch (err: any) {
    console.error('Error subiendo a LEECV Cloud Storage:', err);
    const isQuotaExceeded = err?.code === '23514' || String(err?.message || '').includes('Cuota');
    return {
      success: false,
      error: err?.message || String(err),
      isQuotaExceeded
    };
  }
}

export async function getLEECVCloudUsage(): Promise<{ usedGB: number; totalGB: number; percentUsed: number }> {
  const fallback = { usedGB: 0, totalGB: 50, percentUsed: 0 };
  if (!supabase) return fallback;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fallback;

    // Storage.list no es recursivo — el uso real está en subcarpetas por CV
    // (userId/cvId_archivo), así que hay que listar 1 nivel y sumar por carpeta.
    const { data: topLevel, error: topErr } = await supabase.storage
      .from('certificates')
      .list(user.id, { limit: 1000 });

    if (topErr || !topLevel) return fallback;

    let totalBytes = 0;
    for (const entry of topLevel) {
      if (entry.metadata?.size) {
        // Es un archivo suelto en la raíz del usuario
        totalBytes += entry.metadata.size;
      } else {
        // Es una "carpeta" (prefijo) — listar su contenido para sumar tamaños
        const { data: nested } = await supabase.storage
          .from('certificates')
          .list(`${user.id}/${entry.name}`, { limit: 1000 });
        totalBytes += (nested || []).reduce((sum, f) => sum + (f.metadata?.size || 0), 0);
      }
    }

    const usedGB = totalBytes / (1024 ** 3);
    const totalGB = 50;
    return {
      usedGB: Number(usedGB.toFixed(3)),
      totalGB,
      percentUsed: Math.min(100, Math.round((usedGB / totalGB) * 100)),
    };
  } catch (err) {
    console.error('Error consultando cuota de LEECV Cloud:', err);
    return fallback;
  }
}
