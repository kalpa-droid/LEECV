import { hashBlob } from '../utils/hashBlob';
import { idbStorage } from '../../../modules/cv-builder/services/storageIndexedDB';

export interface BinaryAsset {
  filename: string;
  blob: Blob;
  mimeType: string;
  hash: string;
  fieldPath: string;
}

export interface SplitCvDataResult {
  cleanCvData: any;
  binaryAssets: BinaryAsset[];
}

/**
 * Convierte un Data URL base64 en un Blob binario.
 */
export function base64ToBlob(dataUrl: string): { blob: Blob; mimeType: string } {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return { blob: new Blob([]), mimeType: 'application/octet-stream' };
  }
  const parts = dataUrl.split(';base64,');
  const mimeType = parts[0].replace('data:', '');
  const raw = typeof window !== 'undefined' && window.atob ? window.atob(parts[1] || '') : Buffer.from(parts[1] || '', 'base64').toString('binary');
  const uInt8Array = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return { blob: new Blob([uInt8Array], { type: mimeType }), mimeType };
}

/**
 * Convierte un Blob binario en un Data URL base64.
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * NÚCLEO — EMPAQUETADO BIDIRECCIONAL (driveDocumentPackager.ts)
 * 
 * Desacopla las imágenes binarias (fotografía, firma digital, certificados) del objeto
 * JSON principal `cvData`, generando referencias relativas livianas ("ref://...").
 * Preserva el 100% de la configuración de diseño (presets, overrides).
 */
export async function splitCvDataForDrive(cvData: any): Promise<SplitCvDataResult> {
  if (!cvData || typeof cvData !== 'object') {
    return { cleanCvData: cvData, binaryAssets: [] };
  }

  // Clon profundo seguro para no mutar el objeto original en memoria
  const cleanCvData = JSON.parse(JSON.stringify(cvData));
  const binaryAssets: BinaryAsset[] = [];

  // 1. Fotografía de Perfil
  if (cleanCvData.personalInfo?.profilePhoto && cleanCvData.personalInfo.profilePhoto.startsWith('data:')) {
    const { blob, mimeType } = base64ToBlob(cleanCvData.personalInfo.profilePhoto);
    const hash = await hashBlob(blob);
    const filename = 'foto_perfil.webp';
    binaryAssets.push({
      filename,
      blob,
      mimeType,
      hash,
      fieldPath: 'personalInfo.profilePhoto'
    });
    cleanCvData.personalInfo.profilePhoto = `ref://${filename}`;
  }

  // 2. Firma Digital
  if (cleanCvData.signature?.dataUrl && cleanCvData.signature.dataUrl.startsWith('data:')) {
    const { blob, mimeType } = base64ToBlob(cleanCvData.signature.dataUrl);
    const hash = await hashBlob(blob);
    const filename = 'firma.webp';
    binaryAssets.push({
      filename,
      blob,
      mimeType,
      hash,
      fieldPath: 'signature.dataUrl'
    });
    cleanCvData.signature.dataUrl = `ref://${filename}`;
  }

  // 3. Certificados Escaneados
  if (Array.isArray(cleanCvData.certificatesScanned)) {
    for (let i = 0; i < cleanCvData.certificatesScanned.length; i++) {
      const cert = cleanCvData.certificatesScanned[i];
      if (cert && cert.dataUrl && cert.dataUrl.startsWith('data:')) {
        const { blob, mimeType } = base64ToBlob(cert.dataUrl);
        const hash = await hashBlob(blob);
        const ext = mimeType.includes('png') ? 'png' : mimeType.includes('jpeg') ? 'jpg' : 'webp';
        const filename = `certificados/cert_${i}_${hash.slice(0, 8)}.${ext}`;
        binaryAssets.push({
          filename,
          blob,
          mimeType,
          hash,
          fieldPath: `certificatesScanned[${i}].dataUrl`
        });
        cert.dataUrl = `ref://${filename}`;
      }
    }
  }

  return { cleanCvData, binaryAssets };
}

/**
 * Extrae y guarda los binarios de imagen en la tabla IndexedDB cv_assets
 * indexados por su hash SHA-256 inmutable, sustituyendo los base64 en la copia
 * de almacenamiento local por "asset://<hash>".
 */
export async function dedupAssetsForLocalStorage(cvData: any): Promise<any> {
  if (!cvData || typeof cvData !== 'object') return cvData;

  const { cleanCvData, binaryAssets } = await splitCvDataForDrive(cvData);
  const storedCvData = JSON.parse(JSON.stringify(cleanCvData));

  for (const asset of binaryAssets) {
    try {
      await idbStorage.setItem('cv_asset_' + asset.hash, asset.blob);
    } catch (err) {
      console.warn(`Advertencia al guardar asset en IndexedDB [${asset.hash}]:`, err);
    }

    if (asset.fieldPath === 'personalInfo.profilePhoto' && storedCvData.personalInfo) {
      storedCvData.personalInfo.profilePhoto = `asset://${asset.hash}`;
    } else if (asset.fieldPath === 'signature.dataUrl' && storedCvData.signature) {
      storedCvData.signature.dataUrl = `asset://${asset.hash}`;
    } else if (asset.fieldPath.startsWith('certificatesScanned[')) {
      const match = asset.fieldPath.match(/\[(\d+)\]/);
      if (match && storedCvData.certificatesScanned) {
        const idx = parseInt(match[1], 10);
        if (storedCvData.certificatesScanned[idx]) {
          storedCvData.certificatesScanned[idx].dataUrl = `asset://${asset.hash}`;
        }
      }
    }
  }

  return storedCvData;
}

/**
 * Reconstruye el objeto `cvData` hidratado sustituyendo las referencias "ref://..." o "asset://..."
 * por los binarios en base64 correspondientes.
 */
export async function reconstructCvDataFromParts(
  cleanCvData: any,
  binaryAssets?: BinaryAsset[] | Record<string, Blob | string>
): Promise<any> {
  if (!cleanCvData || typeof cleanCvData !== 'object') return cleanCvData;

  const reconstructed = JSON.parse(JSON.stringify(cleanCvData));

  // Crear mapa rápido de búsqueda por filename y por ref://filename
  const assetMap = new Map<string, Blob | string>();
  if (Array.isArray(binaryAssets)) {
    binaryAssets.forEach(asset => {
      assetMap.set(asset.filename, asset.blob);
      assetMap.set(`ref://${asset.filename}`, asset.blob);
      assetMap.set(`asset://${asset.hash}`, asset.blob);
    });
  } else if (binaryAssets && typeof binaryAssets === 'object') {
    Object.entries(binaryAssets).forEach(([key, val]) => {
      assetMap.set(key, val);
      assetMap.set(`ref://${key}`, val);
      assetMap.set(`asset://${key}`, val);
    });
  }

  async function resolveRefToDataUrl(refValue: string): Promise<string> {
    if (!refValue || typeof refValue !== 'string') return refValue;
    if (!refValue.startsWith('ref://') && !refValue.startsWith('asset://')) {
      return refValue;
    }

    const cleanRef = refValue.replace('ref://', '').replace('asset://', '');
    let asset = assetMap.get(refValue) || assetMap.get(cleanRef);

    if (!asset) {
      try {
        asset = await idbStorage.getItem('cv_asset_' + cleanRef);
      } catch (err) {
        console.warn(`Error buscando asset local [${cleanRef}]:`, err);
      }
    }

    if (!asset) return refValue;

    if (typeof asset === 'string') {
      return asset.startsWith('data:') ? asset : `data:image/webp;base64,${asset}`;
    }
    if (asset instanceof Blob) {
      return await blobToBase64(asset);
    }
    return refValue;
  }

  // 1. Fotografía de Perfil
  if (reconstructed.personalInfo?.profilePhoto) {
    reconstructed.personalInfo.profilePhoto = await resolveRefToDataUrl(reconstructed.personalInfo.profilePhoto);
  }

  // 2. Firma Digital
  if (reconstructed.signature?.dataUrl) {
    reconstructed.signature.dataUrl = await resolveRefToDataUrl(reconstructed.signature.dataUrl);
  }

  // 3. Certificados Escaneados
  if (Array.isArray(reconstructed.certificatesScanned)) {
    for (let i = 0; i < reconstructed.certificatesScanned.length; i++) {
      if (reconstructed.certificatesScanned[i]?.dataUrl) {
        reconstructed.certificatesScanned[i].dataUrl = await resolveRefToDataUrl(reconstructed.certificatesScanned[i].dataUrl);
      }
    }
  }

  return reconstructed;
}
