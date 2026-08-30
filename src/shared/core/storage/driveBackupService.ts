import { splitCvDataForDrive } from './driveDocumentPackager';
import { uploadToGoogleDrive, addFolderAsParent, getOrCreateCvFolderInDrive } from './googleDriveBackend';
import { idbStorage } from '../../../modules/cv-builder/services/storageIndexedDB';

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
 * NÚCLEO — RESPALDO INCREMENTAL GLOBAL Y DEDUPLICADO EN GOOGLE DRIVE (driveBackupService.ts)
 * 
 * Sube datos.json y binarios a Google Drive en subcarpetas dedicadas. Reutiliza imágenes
 * ya existentes entre distintas versiones del CV mediante un índice global de hashes
 * y vinculación multi-parent (addParents).
 */
export async function backupCvToGoogleDrive(cvData: any): Promise<DriveBackupResult> {
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

      const uploadRes = await uploadToGoogleDrive(asset.blob, `${cvId}_${asset.filename.replace('/', '_')}`, driveFolderId);
      if (uploadRes.success && uploadRes.fileId) {
        uploadedFiles.push(asset.filename);
        updatedPerCvHashes[asset.filename] = asset.hash;
        updatedGlobalHashes[asset.hash] = uploadRes.fileId;
      } else {
        console.warn(`Advertencia al subir binario a Drive [${asset.filename}]:`, uploadRes.error);
      }
    }

    // 4. Subir datos.json (siempre se actualiza al ser liviano)
    const jsonString = JSON.stringify(cleanCvData, null, 2);
    const jsonBlob = new Blob([jsonString], { type: 'application/json' });
    const jsonUploadRes = await uploadToGoogleDrive(jsonBlob, `${cvId}_datos.json`, driveFolderId);

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
