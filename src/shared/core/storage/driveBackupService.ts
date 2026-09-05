import { splitCvDataForDrive } from './driveDocumentPackager';
import { uploadToGoogleDrive, addFolderAsParent, getOrCreateCvFolderInDrive } from './googleDriveBackend';
import { uploadBackupAttachment } from './backupProvider';
import { idbStorage } from './storageIndexedDB';

const DRIVE_GLOBAL_HASH_KEY = 'drive_asset_hashes_global';
const DRIVE_PER_CV_HASH_PREFIX = 'drive_asset_hashes_';

export interface DriveBackupResult {
  success: boolean;
  driveSyncState: 'synced' | 'pending' | 'not-configured';
  uploadedFiles?: string[];
  skippedFiles?: string[];
  error?: string;
}

/**
 * NÚCLEO — RESPALDO INCREMENTAL GLOBAL Y DEDUPLICADO EN GOOGLE DRIVE Y LEECV CLOUD (driveBackupService.ts)
 * 
 * Sube datos.json y binarios a Google Drive o LEECV Cloud (Enterprise 50GB) según el plan activo.
 */
export async function backupCvToGoogleDrive(cvData: any, userPlan: string = 'pro'): Promise<DriveBackupResult> {
  if (!cvData || !cvData.id) {
    return { success: false, driveSyncState: 'pending', error: 'CVData o ID inválido' };
  }

  const cvId = cvData.id;
  const perCvStorageKey = `${DRIVE_PER_CV_HASH_PREFIX}${cvId}`;

  try {
    // 1. Separar binarios del JSON estructurado
    const { cleanCvData, binaryAssets } = await splitCvDataForDrive(cvData);

    // 2. Leer hashes globales e individuales del usuario desde IndexedDB
    let globalHashes: Record<string, string> = {};
    let previousPerCvHashes: Record<string, string> = {};
    try {
      const gStored = await idbStorage.getItem(DRIVE_GLOBAL_HASH_KEY);
      if (gStored && typeof gStored === 'object') globalHashes = gStored;

      const pStored = await idbStorage.getItem(perCvStorageKey);
      if (pStored && typeof pStored === 'object') previousPerCvHashes = pStored;
    } catch {}

    // 2.5 Obtener el Folder ID real de Google Drive para la carpeta de este CV
    let driveFolderId: string | undefined = undefined;
    try {
      const resolvedId = await getOrCreateCvFolderInDrive(cvId, cvData.title || cvData.personalInfo?.fullName);
      if (resolvedId) driveFolderId = resolvedId;
    } catch (err) {
      console.warn('Advertencia al obtener carpeta de Drive:', err);
    }

    const uploadedFiles: string[] = [];
    const skippedFiles: string[] = [];
    const updatedPerCvHashes: Record<string, string> = { ...previousPerCvHashes };
    const updatedGlobalHashes: Record<string, string> = { ...globalHashes };

    // 3. Subir o deduplicar binarios según el hash SHA-256 global
    for (const asset of binaryAssets) {
      const existingFileId = globalHashes[asset.hash];

      if (previousPerCvHashes[asset.filename] === asset.hash) {
        skippedFiles.push(asset.filename);
        updatedPerCvHashes[asset.filename] = asset.hash;
        continue;
      }

      // Si la imagen ya fue subida por otra versión del CV en Drive, la vinculamos mediante multi-parent
      if (existingFileId) {
        skippedFiles.push(asset.filename);
        updatedPerCvHashes[asset.filename] = asset.hash;
        // La vinculación multi-parent ocurre usando el ID real de carpeta de Drive (no la string cvId)
        if (driveFolderId) {
          addFolderAsParent(existingFileId, driveFolderId).catch(err => {
            console.warn(`Error en multi-parent Drive [${asset.filename}]:`, err);
          });
        }
        continue;
      }

      const uploadRes = await uploadBackupAttachment(asset.blob, `${cvId}_${asset.filename.replace('/', '_')}`, userPlan);
      const assetId = (uploadRes as any)?.fileId || (uploadRes as any)?.path;
      if (uploadRes.success && assetId) {
        uploadedFiles.push(asset.filename);
        updatedPerCvHashes[asset.filename] = asset.hash;
        updatedGlobalHashes[asset.hash] = assetId;
      } else {
        console.warn(`Advertencia al subir binario a almacenamiento [${asset.filename}]:`, uploadRes.error);
      }
    }

    // 4. Subir datos.json (siempre se actualiza al ser liviano)
    const jsonString = JSON.stringify(cleanCvData, null, 2);
    const jsonBlob = new Blob([jsonString], { type: 'application/json' });
    const jsonUploadRes = await uploadBackupAttachment(jsonBlob, `${cvId}_datos.json`, userPlan);

    if (!jsonUploadRes.success) {
      return {
        success: false,
        driveSyncState: 'pending',
        uploadedFiles,
        skippedFiles,
        error: jsonUploadRes.error || 'No se pudo subir datos.json a Drive'
      };
    }

    uploadedFiles.push('datos.json');

    // 5. Guardar hashes globales y locales actualizados en IndexedDB
    await idbStorage.setItem(perCvStorageKey, updatedPerCvHashes);
    await idbStorage.setItem(DRIVE_GLOBAL_HASH_KEY, updatedGlobalHashes);

    // 6. Actualizar puntero de backup en Supabase public.cvs
    const primaryFileId = (jsonUploadRes as any).fileId || driveFolderId || null;
    if (primaryFileId) {
      try {
        const { supabase } = await import('../lib/supabaseClient');
        if (supabase) {
          await supabase
            .from('cvs')
            .update({
              drive_file_id: primaryFileId,
              drive_synced_at: new Date().toISOString(),
            })
            .eq('id', cvId);
        }
      } catch (dbErr) {
        console.warn('Advertencia al guardar drive_file_id en Supabase:', dbErr);
      }
    }

    return {
      success: true,
      driveSyncState: 'synced',
      uploadedFiles,
      skippedFiles
    };
  } catch (err: any) {
    console.error('Error en respaldo incremental a Google Drive:', err);
    return {
      success: false,
      driveSyncState: 'pending',
      error: err.message || String(err)
    };
  }
}

/**
 * Liberar un CV de Google Drive (elimina archivo real en Google Drive y remueve punteros en Supabase)
 */
export async function deleteBackupFromDrive(cvId: string, driveFileId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Eliminar de Google Drive si existe driveFileId
    if (driveFileId) {
      try {
        const res = await fetch(`/api/drive-api?action=delete-file&fileId=${encodeURIComponent(driveFileId)}`, {
          method: 'POST',
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.warn('Advertencia borrando archivo en Drive API:', errData);
        }
      } catch (driveApiErr) {
        console.warn('Excepción llamando a /api/drive-api delete-file:', driveApiErr);
      }
    }

    // 2. Limpiar puntero en Supabase public.cvs
    const { supabase } = await import('../lib/supabaseClient');
    if (supabase) {
      await supabase
        .from('cvs')
        .update({
          drive_file_id: null,
          drive_synced_at: null,
        })
        .eq('id', cvId);
    }

    // 3. Limpiar local cache en IndexedDB
    try {
      await idbStorage.removeItem(`${DRIVE_PER_CV_HASH_PREFIX}${cvId}`);
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('Error liberando backup de Drive:', err);
    return { success: false, error: err.message || 'Error al liberar backup' };
  }
}
