import { supabase } from '../lib/supabaseClient';

/**
 * Backend real de almacenamiento en Google Drive del usuario (Nivel 1/2, Pro).
 * Enterprise NO pasa por acá — usa leecvCloudBackend.js con sus 50GB propios.
 */

async function pedirAccessTokenFresco() {
  if (!supabase) throw new Error('Supabase no inicializado');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No hay sesión activa');

  const res = await fetch('/api/drive/get-access-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'No se pudo obtener acceso a Drive');
  return data.accessToken;
}

let carpetaLeecvIdCache = null;

/** Busca (o crea la primera vez) la carpeta "LEECV" dentro del Drive del usuario */
async function obtenerCarpetaLeecv(accessToken) {
  if (carpetaLeecvIdCache) return carpetaLeecvIdCache;

  const query = encodeURIComponent("name = 'LEECV' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
  const buscar = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const encontrados = await buscar.json();

  if (encontrados.files?.length) {
    carpetaLeecvIdCache = encontrados.files[0].id;
    return carpetaLeecvIdCache;
  }

  const crear = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'LEECV', mimeType: 'application/vnd.google-apps.folder' }),
  });
  const carpeta = await crear.json();
  carpetaLeecvIdCache = carpeta.id;
  return carpetaLeecvIdCache;
}

/** Sube un archivo real al Drive del usuario, dentro de la carpeta LEECV */
export async function uploadToGoogleDrive(fileBlob, fileName) {
  try {
    const accessToken = await pedirAccessTokenFresco();
    const folderId = await obtenerCarpetaLeecv(accessToken);

    const metadata = { name: fileName, parents: [folderId] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', fileBlob);

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Error subiendo a Drive');

    return { success: true, provider: 'google_drive', fileId: data.id, webViewLink: data.webViewLink };
  } catch (err) {
    console.error('Error subiendo a Google Drive:', err);
    return { success: false, error: err.message || String(err) };
  }
}

/** Consulta la cuota real de Drive del usuario y actualiza profiles para que el admin la vea */
export async function getGoogleDriveQuota() {
  try {
    const accessToken = await pedirAccessTokenFresco();
    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    const quota = data.storageQuota || {};
    const limit = Number(quota.limit || 16106127360);
    const usage = Number(quota.usage || 0);
    const percentUsed = limit > 0 ? Math.round((usage / limit) * 100) : 0;

    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await supabase.from('profiles').update({
          drive_quota_percent: percentUsed,
          drive_last_checked_at: new Date().toISOString(),
        }).eq('id', session.user.id);
      }
    }

    return { usedBytes: usage, totalBytes: limit, percentUsed };
  } catch (err) {
    console.warn('No se pudo consultar la cuota de Drive:', err);
    return { usedBytes: 0, totalBytes: 0, percentUsed: 0, error: err.message };
  }
}
