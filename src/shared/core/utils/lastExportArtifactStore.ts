/**
 * Registro en memoria de la última exportación descargada en esta sesión
 * (PDF, Word, Excel o ZIP), para poder subirla a Google Drive dentro de
 * la misma ventana sin regenerar el archivo ni gastar otro crédito.
 */

export interface ExportedArtifactSnapshot {
  blob: Blob;
  fileName: string;
  mimeType: string;
  createdAt: number;
}

let lastExportedArtifact: ExportedArtifactSnapshot | null = null;

export function recordLastExportedArtifact(
  blob: Blob,
  fileName: string
): ExportedArtifactSnapshot {
  lastExportedArtifact = {
    blob,
    fileName,
    mimeType: blob.type || 'application/octet-stream',
    createdAt: Date.now(),
  };
  return lastExportedArtifact;
}

export function getLastExportedArtifact(): ExportedArtifactSnapshot | null {
  return lastExportedArtifact;
}

export function clearLastExportedArtifact(): void {
  lastExportedArtifact = null;
}
