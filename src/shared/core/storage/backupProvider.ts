import { uploadToGoogleDrive } from './googleDriveBackend';
import { uploadToLEECVCloud } from './leecvCloudBackend';
import { isEnterprise } from '../entitlements/useEntitlements';

/**
 * Proveedor unificado de almacenamiento de respaldos y anexos.
 * Alterna dinámicamente entre Google Drive (Pro) y LEECV Cloud (Enterprise).
 */
export async function uploadBackupAttachment(fileBlob: any, fileName: string, userPlan = 'pro') {
  if (isEnterprise(userPlan)) {
    return await uploadToLEECVCloud(fileBlob, fileName);
  }
  return await uploadToGoogleDrive(fileBlob, fileName);
}
