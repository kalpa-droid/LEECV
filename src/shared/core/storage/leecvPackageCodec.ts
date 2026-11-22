/**
 * Codec portable LEECV (.leecv, .leedoc, .leecard, .leebook, .leeplan, .json, .zip).
 *
 * Contenedor equivalente al modelo de archivos de escritorio (estilo .docx):
 * - Si el documento contiene imágenes o adjuntos pesados, empaqueta un contenedor ZIP
 *   con `manifest.json`, `document.json` (con punteros `asset://`) y carpeta `assets/`.
 * - Si es puramente texto/datos o se solicita formato JSON plano, guarda un JSON v2 legible.
 * - Al abrir, detecta automáticamente firma ZIP (`PK`) o texto JSON sin depender de la extensión.
 *
 * Nota de bundle: `jszip` se importa únicamente de forma dinámica dentro de funciones async.
 */

import { base64ToBlob, blobToBase64, reconstructCvDataFromParts, splitCvDataForDrive } from './driveDocumentPackager';
import { hydrateInlineAssets, localAssetStore } from './localAssetStore';
import { migrateCvData } from './cvMigrationEngine';
import { getDocumentSchemaHandler } from './documentEnvelope';
import {
  DOCUMENT_TYPE_REGISTRY,
  getCloudBackupDocumentTypeIds,
  getRouteForDocType,
  inferDocumentTypeId,
  isRegisteredDocumentTypeId,
} from '../capabilities/capabilityRegistry';

export interface PackageFormatSpec {
  docType: string;
  extension: string;
  label: string;
  mimeType: string;
  route: string;
}

const PACKAGE_FORMATS_BY_TYPE: Record<string, PackageFormatSpec> = Object.fromEntries(
  Object.values(DOCUMENT_TYPE_REGISTRY)
    .filter((entry) => 'fileFormat' in entry && Boolean(entry.fileFormat))
    .map((entry) => {
      const fmt = (entry as { fileFormat?: { extension: string; label: string; mimeType: string } }).fileFormat!;
      return [
        entry.id,
        {
          docType: entry.id,
          extension: fmt.extension,
          label: fmt.label,
          mimeType: fmt.mimeType,
          route: getRouteForDocType(entry.id),
        },
      ];
    }),
);

const EXTENSION_TO_TYPE: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const entry of Object.values(DOCUMENT_TYPE_REGISTRY)) {
    if (!('fileFormat' in entry) || !entry.fileFormat) continue;
    const fmt = entry.fileFormat as {
      extension: string;
      legacyExtensions?: readonly string[];
    };
    map[fmt.extension.toLowerCase()] = entry.id;
    for (const legacyExt of fmt.legacyExtensions || []) {
      map[legacyExt.toLowerCase()] = entry.id;
    }
  }
  return map;
})();

export function getPackageFormatSpec(docType: string): PackageFormatSpec {
  return PACKAGE_FORMATS_BY_TYPE[docType] || PACKAGE_FORMATS_BY_TYPE.cv;
}

function buildSafeBaseName(docType: string, data: any): string {
  const rawName =
    data?.personalInfo?.fullName ||
    data?.metadata?.title ||
    data?.title ||
    'Documento';
  const versionSuffix = data?.version_label || data?.versionLabel || '';
  const combined = versionSuffix ? `${rawName}_${versionSuffix}` : String(rawName);
  const cleaned = combined
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  const prefix = docType.toUpperCase();
  return `${prefix}_${cleaned || 'SinTitulo'}`;
}

interface CollectedBinaryAsset {
  key: string;
  dataUrl: string;
}

async function collectAndReplaceAssets(value: any, collected: Map<string, CollectedBinaryAsset>, counterRef: { n: number }): Promise<any> {
  if (typeof value === 'string') {
    if (value.startsWith('asset://')) {
      const hydrated = await hydrateInlineAssets(value);
      const dataUrl = typeof hydrated === 'string' && hydrated.startsWith('data:')
        ? hydrated
        : await reconstructCvDataFromParts({ temp: value }).then((r: any) => r?.temp || value);
      if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
        const assetId = value.slice('asset://'.length);
        const ext = dataUrl.includes('png') ? 'png' : dataUrl.includes('jpeg') ? 'jpg' : dataUrl.includes('pdf') ? 'pdf' : 'webp';
        const key = `${assetId}.${ext}`;
        collected.set(key, { key, dataUrl });
        return `pkg-asset://${key}`;
      }
      return value;
    }
    if (value.startsWith('data:') && value.length > 256) {
      counterRef.n += 1;
      const ext = value.includes('png') ? 'png' : value.includes('jpeg') ? 'jpg' : value.includes('pdf') ? 'pdf' : 'webp';
      const key = `media_${counterRef.n}_${Date.now().toString(36)}.${ext}`;
      collected.set(key, { key, dataUrl: value });
      return `pkg-asset://${key}`;
    }
    return value;
  }

  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) {
      out.push(await collectAndReplaceAssets(item, collected, counterRef));
    }
    return out;
  }

  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = await collectAndReplaceAssets(v, collected, counterRef);
    }
    return out;
  }

  return value;
}

function restorePackagedAssets(value: any, assetMap: Map<string, string>): any {
  if (typeof value === 'string') {
    if (value.startsWith('pkg-asset://')) {
      const key = value.slice('pkg-asset://'.length);
      return assetMap.get(key) || value;
    }
    if (value.startsWith('asset://')) {
      const key = value.slice('asset://'.length);
      return assetMap.get(key) || assetMap.get(`asset://${key}`) || value;
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => restorePackagedAssets(item, assetMap));
  }

  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = restorePackagedAssets(v, assetMap);
    }
    return out;
  }

  return value;
}

export interface PackedDocumentResult {
  blob: Blob;
  suggestedFileName: string;
  extension: string;
  mimeType: string;
  isPackageContainer: boolean;
}

/**
 * Empaqueta cualquier documento LEECV listo para guardar en disco como archivo portable.
 */
export async function packDocumentForDisk(
  docType: string,
  rawData: any,
  options?: { preferPlainJson?: boolean }
): Promise<PackedDocumentResult> {
  const spec = getPackageFormatSpec(docType);
  const baseName = buildSafeBaseName(docType, rawData);

  if (options?.preferPlainJson) {
    const hydrated = await hydrateInlineAssets(rawData);
    const reconstructed = await reconstructCvDataFromParts(hydrated);
    const plainPayload = {
      schemaVersion: 2,
      docType,
      exportedAt: new Date().toISOString(),
      id: reconstructed?.id || rawData?.id || `doc_${docType}_${Date.now()}`,
      cvData: reconstructed,
      data: reconstructed,
    };
    const blob = new Blob([JSON.stringify(plainPayload, null, 2)], { type: 'application/json' });
    return {
      blob,
      suggestedFileName: `${baseName}.json`,
      extension: '.json',
      mimeType: 'application/json',
      isPackageContainer: false,
    };
  }

  const collected = new Map<string, CollectedBinaryAsset>();
  const cleanedDoc = await collectAndReplaceAssets(rawData, collected, { n: 0 });
  const nowIso = new Date().toISOString();

  if (collected.size === 0) {
    const payload = {
      schemaVersion: 2,
      docType,
      exportedAt: nowIso,
      id: cleanedDoc?.id || `doc_${docType}_${Date.now()}`,
      cvData: cleanedDoc,
      data: cleanedDoc,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    return {
      blob,
      suggestedFileName: `${baseName}${spec.extension}`,
      extension: spec.extension,
      mimeType: spec.mimeType,
      isPackageContainer: false,
    };
  }

  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  zip.file(
    'manifest.json',
    JSON.stringify(
      {
        formatVersion: 1,
        docType,
        exportedAt: nowIso,
        title: cleanedDoc?.metadata?.title || cleanedDoc?.personalInfo?.fullName || cleanedDoc?.title || baseName,
      },
      null,
      2,
    ),
  );

  zip.file(
    'document.json',
    JSON.stringify(
      {
        schemaVersion: 2,
        docType,
        exportedAt: nowIso,
        data: cleanedDoc,
      },
      null,
      2,
    ),
  );

  const assetsFolder = zip.folder('assets');
  if (assetsFolder) {
    for (const asset of collected.values()) {
      const b64 = asset.dataUrl.includes(';base64,') ? asset.dataUrl.split(';base64,')[1] : asset.dataUrl;
      assetsFolder.file(asset.key, b64, { base64: true });
    }
  }

  const zipBytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  const zipBlob = new Blob([zipBytes as any], { type: spec.mimeType });
  return {
    blob: zipBlob,
    suggestedFileName: `${baseName}${spec.extension}`,
    extension: spec.extension,
    mimeType: spec.mimeType,
    isPackageContainer: true,
  };
}

function inferDocTypeFromFileAndData(fileName: string, parsedDocType: unknown, rawData: any): string {
  if (typeof parsedDocType === 'string' && isRegisteredDocumentTypeId(parsedDocType)) {
    return parsedDocType;
  }
  const lowerName = fileName.toLowerCase();
  for (const [ext, typeId] of Object.entries(EXTENSION_TO_TYPE)) {
    if (lowerName.endsWith(ext)) return typeId;
  }
  if (typeof rawData?.type === 'string' && isRegisteredDocumentTypeId(rawData.type)) {
    return rawData.type;
  }
  return inferDocumentTypeId(rawData);
}

function normalizeUnpackedDocument(docType: string, rawData: any): any {
  const schemaHandler = getDocumentSchemaHandler(docType);
  if (schemaHandler?.sanitize) {
    const sanitized = schemaHandler.sanitize(rawData);
    if (sanitized) return sanitized;
  }
  if (schemaHandler?.migrate) {
    return schemaHandler.migrate(rawData, 0);
  }
  if (getCloudBackupDocumentTypeIds().includes(docType as any)) {
    return migrateCvData(rawData);
  }
  return rawData;
}

export interface UnpackedDocumentResult {
  docType: string;
  data: any;
  isArchive: boolean;
}

/**
 * Abre cualquier archivo portable (.leecv, .leedoc, .leecard, .leebook, .json, .zip)
 * detectando automáticamente si es paquete binario ZIP o texto JSON.
 */
export async function unpackDocumentFromDisk(file: File): Promise<UnpackedDocumentResult> {
  if (!file) throw new Error('No se seleccionó ningún archivo.');

  const headerSlice = await file.slice(0, 4).arrayBuffer();
  const magic = new Uint8Array(headerSlice);
  const isZipArchive = magic.length >= 2 && magic[0] === 0x50 && magic[1] === 0x4b;

  if (isZipArchive) {
    const { default: JSZip } = await import('jszip');
    const fileBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(fileBuffer);

    const manifestFile = zip.file('manifest.json');
    let manifestDocType: unknown = undefined;
    if (manifestFile) {
      try {
        const mJson = JSON.parse(await manifestFile.async('string'));
        manifestDocType = mJson?.docType;
      } catch {
        // Ignorar manifiesto malformado si document.json trae los datos
      }
    }

    const docFile = zip.file('document.json') || zip.file('datos.json');
    if (!docFile) {
      throw new Error('El paquete no contiene un archivo de documento válido.');
    }

    const rawParsed = JSON.parse(await docFile.async('string'));
    const rawDoc = rawParsed?.data || rawParsed?.cvData || rawParsed;
    if (!rawDoc || typeof rawDoc !== 'object') {
      throw new Error('El contenido del archivo está vacío o dañado.');
    }

    const docType = inferDocTypeFromFileAndData(file.name, manifestDocType || rawParsed?.docType, rawDoc);

    // Extraer binarios desde assets/ o imagenes/ (compatibilidad con .zip heredado)
    const assetDataUrlMap = new Map<string, string>();
    const legacyBinaryMap: Record<string, Blob | string> = {};

    const mimeFromKey = (key: string): string => {
      const lower = key.toLowerCase();
      if (lower.endsWith('.png')) return 'image/png';
      if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
      if (lower.endsWith('.pdf')) return 'application/pdf';
      return 'image/webp';
    };

    for (const folderName of ['assets', 'imagenes']) {
      const folder = zip.folder(folderName);
      if (!folder) continue;
      const entries = folder.file(/.+/);
      for (const entry of entries) {
        const relativeKey = entry.name.replace(new RegExp(`^${folderName}/`), '');
        const b64 = await entry.async('base64');
        const mime = mimeFromKey(relativeKey);
        const dataUrl = `data:${mime};base64,${b64}`;
        legacyBinaryMap[relativeKey] = dataUrl;
        legacyBinaryMap[`certificados/${relativeKey}`] = dataUrl;
        assetDataUrlMap.set(relativeKey, dataUrl);
        if (rawDoc?.id && typeof indexedDB !== 'undefined') {
          await localAssetStore.putAsset(String(rawDoc.id), dataUrl, mime);
        }
      }
    }

    const withRestoredPkg = restorePackagedAssets(rawDoc, assetDataUrlMap);
    const reconstructed = await reconstructCvDataFromParts(withRestoredPkg, legacyBinaryMap);
    const normalized = normalizeUnpackedDocument(docType, reconstructed);

    return {
      docType,
      data: normalized,
      isArchive: true,
    };
  }

  const text = await file.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (err: any) {
    throw new Error('El archivo no tiene un formato JSON o LEECV válido: ' + (err?.message || err));
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('El archivo no contiene un documento válido.');
  }

  const rawDoc = parsed.data || parsed.cvData || parsed;
  if (!rawDoc || typeof rawDoc !== 'object') {
    throw new Error('No se encontraron datos de documento en el archivo.');
  }

  const docType = inferDocTypeFromFileAndData(file.name, parsed.docType, rawDoc);
  const reconstructed = await reconstructCvDataFromParts(rawDoc);
  const hydrated = await hydrateInlineAssets(reconstructed);
  const normalized = normalizeUnpackedDocument(docType, hydrated);

  return {
    docType,
    data: normalized,
    isArchive: false,
  };
}

// Re-export auxiliar para paquetes multi-CV (respaldo ZIP heredado)
export { splitCvDataForDrive };
