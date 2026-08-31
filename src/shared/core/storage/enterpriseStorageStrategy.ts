import { idbStorage } from './storageIndexedDB';
import { hashBlob } from '../utils/hashBlob';

export interface EnterpriseAssetRef {
  hash: string;
  filename: string;
  refCount: number;
  driveFileId?: string;
  updatedAt: string;
}

const VAULT_REF_PREFIX = 'vault_ref_count_';

/**
 * NÚCLEO — BÓVEDA DEDUPLICADA ENTERPRISE CON CONTEO DE REFERENCIAS (enterpriseStorageStrategy.ts)
 * 
 * Gestiona el almacenamiento de legajos masivos (50GB) mediante deduplicación SHA-256 (CAS)
 * y conteo estricto de referencias para evitar la eliminación accidental de binarios compartidos.
 */
export async function getVaultAssetRefCount(hash: string): Promise<number> {
  try {
    const val = await idbStorage.getItem(`${VAULT_REF_PREFIX}${hash}`);
    return typeof val === 'number' ? val : (val?.refCount || 0);
  } catch {
    return 0;
  }
}

export async function incrementVaultAssetRefCount(hash: string): Promise<number> {
  const current = await getVaultAssetRefCount(hash);
  const next = current + 1;
  await idbStorage.setItem(`${VAULT_REF_PREFIX}${hash}`, {
    hash,
    refCount: next,
    updatedAt: new Date().toISOString()
  });
  return next;
}

export async function decrementVaultAssetRefCount(hash: string): Promise<number> {
  const current = await getVaultAssetRefCount(hash);
  const next = Math.max(0, current - 1);
  if (next === 0) {
    await idbStorage.removeItem(`${VAULT_REF_PREFIX}${hash}`);
  } else {
    await idbStorage.setItem(`${VAULT_REF_PREFIX}${hash}`, {
      hash,
      refCount: next,
      updatedAt: new Date().toISOString()
    });
  }
  return next;
}

/**
 * Registra o recupera un activo en la bóveda enterprise deduplicada.
 */
export async function registerEnterpriseVaultAsset(blob: Blob, ext: string = 'webp'): Promise<{ hash: string; isNew: boolean; refCount: number; vaultPath: string }> {
  const hash = await hashBlob(blob);
  const currentCount = await getVaultAssetRefCount(hash);
  const nextCount = await incrementVaultAssetRefCount(hash);
  
  return {
    hash,
    isNew: currentCount === 0,
    refCount: nextCount,
    vaultPath: `boveda://${hash}.${ext}`
  };
}

/**
 * Carga resumible en bloques para grandes archivos adjuntos (Enterprise 50GB Upload).
 */
export async function resumableUploadToDrive(
  blob: Blob,
  uploadUrl: string,
  onProgress?: (bytesUploaded: number, totalBytes: number) => void
): Promise<boolean> {
  const chunkSize = 256 * 1024 * 4; // 1MB chunks
  const total = blob.size;
  let offset = 0;

  while (offset < total) {
    const chunk = blob.slice(offset, Math.min(offset + chunkSize, total));
    const contentRange = `bytes ${offset}-${offset + chunk.size - 1}/${total}`;
    
    try {
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Range': contentRange,
          'Content-Type': blob.type || 'application/octet-stream'
        },
        body: chunk
      });

      if (res.status === 308 || res.status === 200 || res.status === 201) {
        offset += chunk.size;
        if (onProgress) onProgress(offset, total);
      } else {
        throw new Error(`Upload resumible falló con estado HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn('Error en bloque de carga resumible:', err);
      return false;
    }
  }

  return true;
}
