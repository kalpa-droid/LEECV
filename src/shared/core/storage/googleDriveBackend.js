/**
 * Backend de almacenamiento en Google Drive del Usuario (Nivel 2 - Pro)
 */
export async function uploadToGoogleDrive(fileData, fileName) {
  try {
    console.log(`[GoogleDriveBackend] Simulando subida de "${fileName}" a Google Drive del usuario...`);
    return { success: true, provider: 'google_drive', path: `LEECV_Drive/${fileName}` };
  } catch (err) {
    console.error('Error subiendo a Google Drive:', err);
    return { success: false, error: err };
  }
}

export async function getGoogleDriveQuota() {
  return { usedBytes: 0, totalBytes: 15 * 1024 * 1024 * 1024, percentUsed: 0 };
}
