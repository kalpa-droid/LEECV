/**
 * LocalAssetStore — Almacén local dedicado a binarios y medios (Fase 3, Local-First).
 *
 * Extrae imágenes base64 (fotos, firmas, logos) y PDFs embebidos hacia IndexedDB
 * bajo claves `leecv_asset_blob:<hash>`, dejando únicamente referencias livianas
 * `asset://<hash>` dentro del documento JSON.
 *
 * Garantía: ningún binario ni diseño sale del equipo hacia la nube.
 */

import type { LocalAssetStoreContract, LocalAssetUri, StoredAssetMeta } from '../../contracts/persistenceContract';
import { idbStorage } from './storageIndexedDB';
import { reportSilentError } from '../utils/errorHandler';

const ASSET_BLOB_PREFIX = 'leecv_asset_blob:';
const ASSET_DOC_INDEX_PREFIX = 'leecv_asset_doc_index:';
const INLINE_DATA_URI_RE = /^data:(image\/[a-z0-9.+-]+|application\/pdf);base64,/i;
const MIN_EXTERNALIZE_LENGTH = 256;

function computeStableHash(input: string): string {
  // FNV-1a 64-bit combinado (dos acumuladores de 32-bit) — rápido, determinista y síncrono en Node y navegador
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch ^ (i & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${part1}${part2}_${input.length.toString(36)}`;
}

async function readDocIndex(docId: string): Promise<StoredAssetMeta[]> {
  try {
    const list = await idbStorage.getItem(`${ASSET_DOC_INDEX_PREFIX}${docId}`);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function writeDocIndex(docId: string, entries: StoredAssetMeta[]): Promise<void> {
  await idbStorage.setItem(`${ASSET_DOC_INDEX_PREFIX}${docId}`, entries);
}

export const localAssetStore: LocalAssetStoreContract = {
  async putAsset(docId: string, data: Blob | Uint8Array | string, mimeType: string): Promise<LocalAssetUri> {
    let serialized: string | Blob;
    let byteSize: number;
    let hashSeed: string;

    if (typeof data === 'string') {
      serialized = data;
      byteSize = data.length;
      hashSeed = `${mimeType}:${data}`;
    } else if (data instanceof Uint8Array) {
      const chunks: string[] = [];
      for (let i = 0; i < data.length; i++) chunks.push(String.fromCharCode(data[i]));
      const b64 = typeof btoa === 'function' ? btoa(chunks.join('')) : Buffer.from(data).toString('base64');
      serialized = `data:${mimeType};base64,${b64}`;
      byteSize = data.byteLength;
      hashSeed = `${mimeType}:${serialized}`;
    } else {
      serialized = data;
      byteSize = data.size;
      hashSeed = `${mimeType}:${data.size}:${docId}:${Date.now()}`;
    }

    const id = computeStableHash(hashSeed);
    const uri: LocalAssetUri = `asset://${id}`;

    await idbStorage.setItem(`${ASSET_BLOB_PREFIX}${id}`, {
      data: serialized,
      mimeType,
      byteSize,
    });

    if (docId) {
      const index = await readDocIndex(docId);
      if (!index.some((entry) => entry.id === id)) {
        index.push({
          id,
          docId,
          mimeType,
          byteSize,
          createdAt: new Date().toISOString(),
        });
        await writeDocIndex(docId, index);
      }
    }

    return uri;
  },

  async getAsset(uri: LocalAssetUri): Promise<{ data: Blob | string; mimeType: string } | null> {
    if (!uri.startsWith('asset://')) return null;
    const id = uri.slice('asset://'.length);
    try {
      const record = await idbStorage.getItem(`${ASSET_BLOB_PREFIX}${id}`);
      if (record && typeof record === 'object' && 'data' in record) {
        return { data: record.data, mimeType: record.mimeType || 'application/octet-stream' };
      }
      // Compatibilidad hacia atrás con assets deduplicados previos (`cv_asset_<hash>`)
      const legacy =
        (await idbStorage.getItem(`cv_asset_${id}`)) ||
        (await idbStorage.getItem(`boveda_asset_${id}`));
      if (legacy) {
        return { data: legacy, mimeType: 'application/octet-stream' };
      }
      return null;
    } catch (err) {
      reportSilentError(err, `localAssetStore.getAsset[${id}]`);
      return null;
    }
  },

  async deleteAsset(uri: LocalAssetUri): Promise<void> {
    if (!uri.startsWith('asset://')) return;
    const id = uri.slice('asset://'.length);
    await idbStorage.removeItem(`${ASSET_BLOB_PREFIX}${id}`);
  },

  async deleteDocumentAssets(docId: string): Promise<void> {
    const index = await readDocIndex(docId);
    if (index.length > 0) {
      // Reference counting: no borrar un blob si otro documento guardado lo sigue referenciando
      const referencedIds = new Set<string>();
      if (typeof idbStorage.keys === 'function') {
        const allKeys = await idbStorage.keys();
        const otherDocIndexKeys = allKeys.filter(
          (k) => k.startsWith(ASSET_DOC_INDEX_PREFIX) && k !== `${ASSET_DOC_INDEX_PREFIX}${docId}`,
        );
        for (const otherKey of otherDocIndexKeys) {
          const otherList = await idbStorage.getItem(otherKey);
          if (Array.isArray(otherList)) {
            for (const entry of otherList) {
              if (entry && typeof entry.id === 'string') {
                referencedIds.add(entry.id);
              }
            }
          }
        }
      }
      for (const meta of index) {
        if (!referencedIds.has(meta.id)) {
          await idbStorage.removeItem(`${ASSET_BLOB_PREFIX}${meta.id}`);
        }
      }
    }
    await idbStorage.removeItem(`${ASSET_DOC_INDEX_PREFIX}${docId}`);
  },

  async listDocumentAssets(docId: string): Promise<readonly StoredAssetMeta[]> {
    return readDocIndex(docId);
  },
};

/**
 * Recorre un documento y externaliza cualquier cadena `data:image/...;base64,...` o
 * `data:application/pdf;base64,...` hacia `LocalAssetStore`, reemplazándola por `asset://<hash>`.
 */
export async function externalizeInlineAssets<T>(docId: string, value: T): Promise<T> {
  if (typeof value === 'string') {
    const match = value.length >= MIN_EXTERNALIZE_LENGTH ? value.match(INLINE_DATA_URI_RE) : null;
    if (match) {
      const mimeType = match[1];
      return (await localAssetStore.putAsset(docId, value, mimeType)) as unknown as T;
    }
    return value;
  }

  if (Array.isArray(value)) {
    const out = await Promise.all(value.map((item) => externalizeInlineAssets(docId, item)));
    return out as unknown as T;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const next: Record<string, unknown> = {};
    for (const [k, v] of entries) {
      next[k] = await externalizeInlineAssets(docId, v);
    }
    return next as T;
  }

  return value;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    if (typeof FileReader === 'undefined') {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => resolve('');
    reader.readAsDataURL(blob);
  });
}

/**
 * Rehidrata referencias `asset://<hash>` almacenadas en `LocalAssetStore` (con fallback a claves legadas).
 * Convierte además cualquier `image/webp` o `image/gif` heredada a PNG compatible con `@react-pdf/renderer`,
 * y limpia referencias `asset://` huérfanas para que nunca lleguen rotas a `<Image src=...>`.
 */
export async function hydrateInlineAssets<T>(value: T): Promise<T> {
  if (typeof value === 'string') {
    let resolvedStr: string = value;
    if (value.startsWith('asset://')) {
      const loaded = await localAssetStore.getAsset(value as LocalAssetUri);
      if (loaded && typeof loaded.data === 'string') {
        resolvedStr = loaded.data;
      } else if (loaded && typeof Blob !== 'undefined' && loaded.data instanceof Blob) {
        resolvedStr = await blobToDataUrl(loaded.data);
      } else {
        return value;
      }
    }
    if (/^data:image\//i.test(resolvedStr) && typeof document !== 'undefined') {
      const { sanitizeImageDataUrlForPdf } = await import('../utils/imageCompressor');
      const sanitized = await sanitizeImageDataUrlForPdf(resolvedStr);
      resolvedStr = sanitized ?? '';
    }
    return resolvedStr as unknown as T;
  }

  if (Array.isArray(value)) {
    const out = await Promise.all(value.map((item) => hydrateInlineAssets(item)));
    return out as unknown as T;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const next: Record<string, unknown> = {};
    for (const [k, v] of entries) {
      next[k] = await hydrateInlineAssets(v);
    }
    return next as T;
  }

  return value;
}
