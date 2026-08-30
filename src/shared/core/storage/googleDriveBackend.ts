import { supabase } from '../lib/supabaseClient';
import { dal } from './dataAccessLayer';
import { apiClient } from '../utils/apiClient';
import { navigation } from '../utils/navigation';

/**
 * Backend real de almacenamiento en Google Drive del usuario (Nivel 1/2, Pro).
 * Enterprise NO pasa por acá — usa leecvCloudBackend.js con sus 50GB propios.
 */

async function pedirAccessTokenFresco(): Promise<string> {
  const { ok, data, error } = await apiClient.post<{ accessToken?: string }>('/api/drive/get-access-token');
  if (!ok || !data?.accessToken) throw new Error(error || 'No se pudo obtener acceso a Drive');
  return data.accessToken;
}

let carpetaLeecvIdCache: string | null = null;

/** Busca (o crea la primera vez) la carpeta "LEECV" dentro del Drive del usuario */
async function obtenerCarpetaLeecv(accessToken: string): Promise<string> {
  if (carpetaLeecvIdCache) return carpetaLeecvIdCache;

  const query = encodeURIComponent("name = 'LEECV' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
  const { data } = await apiClient.get<any>(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    requiresAuth: false,
  });

  if (data?.files?.length) {
    carpetaLeecvIdCache = data.files[0].id;
    return carpetaLeecvIdCache;
  }

  const { data: carpeta } = await apiClient.post<any>('https://www.googleapis.com/drive/v3/files', {
    name: 'LEECV',
    mimeType: 'application/vnd.google-apps.folder',
  }, {
    headers: { Authorization: `Bearer ${accessToken}` },
    requiresAuth: false,
  });
  carpetaLeecvIdCache = carpeta?.id;
  return carpetaLeecvIdCache || '';
}

/** Sube un archivo real al Drive del usuario, dentro de la carpeta LEECV */
export async function uploadToGoogleDrive(fileBlob: Blob, fileName: string): Promise<{ success: boolean; provider?: string; fileId?: string; webViewLink?: string; error?: string }> {
  try {
    const accessToken = await pedirAccessTokenFresco();
    const folderId = await obtenerCarpetaLeecv(accessToken);

    const metadata = { name: fileName, parents: [folderId] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', fileBlob);

    const { ok, data, error } = await apiClient.post<any>('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', form, {
      headers: { Authorization: `Bearer ${accessToken}` },
      requiresAuth: false,
    });
    if (!ok || !data) throw new Error(error || 'Error subiendo a Drive');

    return { success: true, provider: 'google_drive', fileId: data.id, webViewLink: data.webViewLink };
  } catch (err: any) {
    console.error('Error subiendo a Google Drive:', err);
    return { success: false, error: err.message || String(err) };
  }
}

/** Vincula una carpeta existente como padre adicional de un archivo en Drive (Multi-Parent Linking) */
export async function addFolderAsParent(fileId: string, folderId: string): Promise<boolean> {
  if (!fileId || !folderId) return false;
  try {
    const accessToken = await pedirAccessTokenFresco();
    const { ok } = await apiClient.patch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${folderId}&fields=id,parents`,
      {},
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        requiresAuth: false,
      }
    );
    return ok;
  } catch (err) {
    console.warn(`Advertencia al vincular multi-parent en Google Drive [file:${fileId}, folder:${folderId}]:`, err);
    return false;
  }
}

/** Configura los permisos de un archivo en Drive para lectura pública sin requerir login */
export async function hacerArchivoPublico(accessToken: string, fileId: string): Promise<boolean> {
  try {
    const { ok } = await apiClient.post(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      role: 'reader',
      type: 'anyone',
    }, {
      headers: { Authorization: `Bearer ${accessToken}` },
      requiresAuth: false,
    });
    return ok;
  } catch (err) {
    console.warn('Error otorgando acceso público en Google Drive:', err);
    return false;
  }
}

/** Sube y publica una versión accesible vía web del CV en el Drive del usuario */
export async function publicarCVEnDrive(cvData: any, slug: string): Promise<{ success: boolean; slug?: string; fileId?: string; webViewLink?: string; publicUrl?: string; error?: string }> {
  try {
    const jsonString = JSON.stringify(cvData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const fileName = `cv_publico_${slug}.json`;

    const uploadRes = await uploadToGoogleDrive(blob, fileName);
    if (!uploadRes.success || !uploadRes.fileId) {
      throw new Error(uploadRes.error || 'Fallo la subida a Google Drive');
    }

    const accessToken = await pedirAccessTokenFresco();
    await hacerArchivoPublico(accessToken, uploadRes.fileId);

    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await dal.publishedCvs.upsert({
          slug,
          user_id: session.user.id,
          drive_file_id: uploadRes.fileId,
          cv_id: cvData?.id || 'cv_default',
          is_active: true,
          updated_at: new Date().toISOString(),
        });
      }
    }

    const publicUrl = `${navigation.getOrigin()}/c/${slug}`;
    return {
      success: true,
      slug,
      fileId: uploadRes.fileId,
      webViewLink: uploadRes.webViewLink,
      publicUrl,
    };
  } catch (err: any) {
    console.error('Error publicando CV en Drive:', err);
    return { success: false, error: err.message || String(err) };
  }
}

/** Actualiza un archivo de CV publicado anteriormente en Google Drive */
export async function actualizarCVPublicadoEnDrive(cvData: any, slug: string, existingFileId: string): Promise<{ success: boolean; slug?: string; fileId?: string; error?: string }> {
  try {
    const accessToken = await pedirAccessTokenFresco();
    const jsonString = JSON.stringify(cvData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    const { ok, error } = await apiClient.put(`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`, blob, {
      headers: { Authorization: `Bearer ${accessToken}` },
      requiresAuth: false,
    });

    if (!ok) {
      throw new Error(error || 'No se pudo actualizar el archivo en Drive');
    }

    await hacerArchivoPublico(accessToken, existingFileId);

    if (supabase) {
      await dal.publishedCvs.updateTimestamp(slug);
    }

    return { success: true, slug, fileId: existingFileId };
  } catch (err: any) {
    console.error('Error actualizando CV en Drive:', err);
    return { success: false, error: err.message || String(err) };
  }
}

/** Consulta la cuota real de Drive del usuario y actualiza profiles para que el admin la vea */
export async function getGoogleDriveQuota(): Promise<{ usedBytes: number; totalBytes: number; percentUsed: number; error?: string }> {
  try {
    const accessToken = await pedirAccessTokenFresco();
    const { data } = await apiClient.get<any>('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
      headers: { Authorization: `Bearer ${accessToken}` },
      requiresAuth: false,
    });
    const quota = data?.storageQuota || {};
    const limit = Number(quota.limit || 16106127360);
    const usage = Number(quota.usage || 0);
    const percentUsed = limit > 0 ? Math.round((usage / limit) * 100) : 0;

    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await dal.profiles.updateDriveQuota(session.user.id, percentUsed);
      }
    }

    return { usedBytes: usage, totalBytes: limit, percentUsed };
  } catch (err: any) {
    console.warn('No se pudo consultar la cuota de Drive:', err);
    return { usedBytes: 0, totalBytes: 0, percentUsed: 0, error: err.message };
  }
}
