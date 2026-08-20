import { uploadToGoogleDrive } from './googleDriveBackend';
import { uploadToLEECVCloud } from './leecvCloudBackend';

/**
 * Proveedor unificado de almacenamiento de respaldos y anexos.
 * Alterna dinámicamente entre Google Drive (Pro) y LEECV Cloud (Enterprise).
 */
export async function uploadBackupAttachment(fileBlob, fileName, userPlan = 'pro') {
  if (userPlan === 'enterprise') {
    return await uploadToLEECVCloud(fileBlob, fileName);
  }
  return await uploadToGoogleDrive(fileBlob, fileName);
}
