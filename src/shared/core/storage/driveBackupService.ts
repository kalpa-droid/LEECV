import { splitCvDataForDrive } from './driveDocumentPackager';
import { uploadToGoogleDrive } from './googleDriveBackend';
import { idbStorage } from '../../../modules/cv-builder/services/storageIndexedDB';

const DRIVE_HASH_PREFIX = 'drive_asset_hashes_';

export interface DriveBackupResult {
  success: boolean;
  driveSyncState: 'synced' | 'pending' | 'not-configured';
  uploadedFiles?: string[];
  skippedFiles?: string[];
  error?: string;
}

/**
 * NÚCLEO — RESPALDO INCREMENTAL POR HASH EN GOOGLE DRIVE (driveBackupService.ts)
 * 
 * Sube datos.json y binarios a Google Drive en subcarpetas dedicadas. Omite binarios
 * cuyo hash SHA-256 no haya cambiado desde el último respaldo exitoso.
 */
export async function backupCvToGoogleDrive(cvData: any): Promise<DriveBackupResult> {
  if (!cvData || !cvData.id) {
    return { success: false, driveSyncState: 'pending', error: 'CVData o ID inválido' };
  }

  const cvId = cvData.id;
  const storageKey = `${DRIVE_HASH_PREFIX}${cvId}`;

  try {
    // 1. Separar binarios del JSON estructurado
    const { cleanCvData, binaryAssets } = await splitCvDataForDrive(cvData);
    
    // 2. Leer hashes anteriores desde IndexedDB
    let previousHashes: Record<string, string> = {};
    try {
      const stored = await idbStorage.getItem(storageKey);
      if (stored && typeof stored === 'object') {
        previousHashes = stored;
      }
    } catch {
      previousHashes = {};
    }

    const uploadedFiles: string[] = [];
    const skippedFiles: string[] = [];
    const updatedHashes: Record<string, string> = { ...previousHashes };

    // 3. Subir binarios cuyo hash haya cambiado
    for (const asset of binaryAssets) {
      if (previousHashes[asset.filename] === asset.hash) {
        skippedFiles.push(asset.filename);
        continue;
      }

      const uploadRes = await uploadToGoogleDrive(asset.blob, `${cvId}_${asset.filename.replace('/', '_')}`);
      if (uploadRes.success) {
        uploadedFiles.push(asset.filename);
        updatedHashes[asset.filename] = asset.hash;
      } else {
        console.warn(`Advertencia al subir binario a Drive [${asset.filename}]:`, uploadRes.error);
      }
    }

    // 4. Subir datos.json (siempre se actualiza al ser liviano)
    const jsonString = JSON.stringify(cleanCvData, null, 2);
    const jsonBlob = new Blob([jsonString], { type: 'application/json' });
    const jsonUploadRes = await uploadToGoogleDrive(jsonBlob, `${cvId}_datos.json`);

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

    // 5. Guardar hashes actualizados en IndexedDB
    await idbStorage.setItem(storageKey, updatedHashes);

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
