/**
 * bookAssetManager — Nivel central de recursos del Book Studio.
 *
 * Reglas del producto (aprobadas por Kalpa):
 * - Las imágenes de tapa/contratapa NUNCA van como DataURL gigante en state ni
 *   en la persistencia del documento. Se guardan como Blob en IndexedDB y el
 *   estado solo lleva la referencia `asset:<id>`.
 * - El PDF original NO se duplica: solo se guarda un FileSystemFileHandle
 *   (referencia del sistema) con el File System Access API. Si el usuario lo
 *   movió, la app avisa y ofrece buscarlo de nuevo. Ninguna copia se hace sin
 *   pedirlo expresamente.
 * - Al subir una imagen se genera automáticamente una miniatura (320px, JPEG)
 *   para grilla/formulario (Nivel 1).
 * - Si el uso local supera ~1 GB se avisa en UI.
 */

const DB_NAME = 'leecv-book-assets';
const DB_VERSION = 1;
const STORE_ASSETS = 'assets';
const STORE_META = 'meta';

export const ASSET_PREFIX = 'asset:';
export const STORAGE_WARN_BYTES = 1_000_000_000; // ~1 GB
const THUMB_MAX_WIDTH = 320;
const THUMB_JPEG_QUALITY = 0.72;
const SOURCE_PDF_META_KEY = 'source-pdf-handle';
/** Clave por libro (bookId); la global queda como fallback legada. */
const sourcePdfMetaKeyFor = (bookId?: string) =>
  bookId ? `${SOURCE_PDF_META_KEY}:${bookId}` : SOURCE_PDF_META_KEY;

export type BookAssetKind = 'cover' | 'backCover' | 'source-pdf-copy' | 'other';

export interface BookAssetMeta {
  id: string;
  kind: BookAssetKind;
  name: string;
  type: string;
  size: number;
  createdAt: string;
  hasThumb: boolean;
}

export interface BookAssetRecord extends BookAssetMeta {
  blob: Blob;
  thumbBlob?: Blob;
}

export type AssetRef = string;

export function isAssetRef(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(ASSET_PREFIX);
}

function makeAssetId(kind: BookAssetKind): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ASSET_PREFIX}${kind}-${Date.now()}-${rand}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible en este navegador.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ASSETS)) {
        db.createObjectStore(STORE_ASSETS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('No se pudo abrir IndexedDB.'));
  });
}

function tx<T>(mode: IDBTransactionMode, store: string, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = run(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('Fallo la operación de almacenamiento local.'));
        t.oncomplete = () => db.close();
        t.onerror = () => reject(t.error ?? new Error('Fallo la transacción de almacenamiento local.'));
      })
  );
}

async function makeImageThumb(blob: Blob): Promise<Blob | undefined> {
  try {
    if (typeof createImageBitmap !== 'function') return undefined;
    if (!blob.type.startsWith('image/')) return undefined;
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, THUMB_MAX_WIDTH / Math.max(1, bitmap.width));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return undefined;
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    return await new Promise<Blob | undefined>((res) => {
      canvas.toBlob((b) => res(b ?? undefined), 'image/jpeg', THUMB_JPEG_QUALITY);
    });
  } catch {
    return undefined;
  }
}

const blobUrlCache = new Map<string, string>();
const thumbUrlCache = new Map<string, string>();

export const bookAssetManager = {
  isAssetRef,
  STORAGE_WARN_BYTES,

  async putBlob(blob: Blob, kind: BookAssetKind, name: string): Promise<{ assetId: AssetRef; thumbUri: string | null }> {
    const id = makeAssetId(kind);
    const thumbBlob = await makeImageThumb(blob);
    const record: BookAssetRecord = {
      id,
      kind,
      name,
      type: blob.type || 'application/octet-stream',
      size: blob.size,
      createdAt: new Date().toISOString(),
      hasThumb: Boolean(thumbBlob),
      blob,
      thumbBlob,
    };
    await tx('readwrite', STORE_ASSETS, (s) => s.put(record));
    let thumbUri: string | null = null;
    if (thumbBlob) {
      thumbUri = await new Promise<string | null>((res) => {
        const reader = new FileReader();
        reader.onload = () => res(String(reader.result ?? ''));
        reader.onerror = () => res(null);
        reader.readAsDataURL(thumbBlob);
      });
    }
    return { assetId: id, thumbUri };
  },

  putFile(file: File, kind: BookAssetKind): Promise<{ assetId: AssetRef; thumbUri: string | null }> {
    return this.putBlob(file, kind, file.name);
  },

  /** Migración de proyectos viejos guardados con DataURL en options. */
  async putDataUrl(dataUrl: string, kind: BookAssetKind): Promise<{ assetId: AssetRef; thumbUri: string | null } | null> {
    try {
      const res = await fetch(dataUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      return this.putBlob(blob, kind, `${kind}-migrado`);
    } catch {
      return null;
    }
  },

  async getRecord(assetId: AssetRef): Promise<BookAssetRecord | null> {
    if (!isAssetRef(assetId)) return null;
    try {
      return await tx('readonly', STORE_ASSETS, (s) => s.get(assetId));
    } catch {
      return null;
    }
  },

  async getBlobUrl(assetId: AssetRef): Promise<string | null> {
    if (!isAssetRef(assetId)) return null;
    const cached = blobUrlCache.get(assetId);
    if (cached) return cached;
    const rec = await this.getRecord(assetId);
    if (!rec) return null;
    const url = URL.createObjectURL(rec.blob);
    blobUrlCache.set(assetId, url);
    return url;
  },

  async getThumbUrl(assetId: AssetRef): Promise<string | null> {
    if (!isAssetRef(assetId)) return null;
    const cached = thumbUrlCache.get(assetId);
    if (cached) return cached;
    const rec = await this.getRecord(assetId);
    if (!rec) return null;
    const srcBlob = rec.thumbBlob ?? rec.blob;
    if (!srcBlob) return null;
    const url = URL.createObjectURL(srcBlob);
    thumbUrlCache.set(assetId, url);
    return url;
  },

  async remove(assetId: AssetRef): Promise<void> {
    if (!isAssetRef(assetId)) return;
    const url = blobUrlCache.get(assetId);
    if (url) URL.revokeObjectURL(url);
    const thumb = thumbUrlCache.get(assetId);
    if (thumb) URL.revokeObjectURL(thumb);
    blobUrlCache.delete(assetId);
    thumbUrlCache.delete(assetId);
    try {
      await tx('readwrite', STORE_ASSETS, (s) => s.delete(assetId));
    } catch {
      // ya inexistente: no es error para el usuario
    }
  },

  async list(): Promise<BookAssetMeta[]> {
    try {
      const all = await tx('readonly', STORE_ASSETS, (s) => s.getAll() as IDBRequest<BookAssetRecord[]>);
      return (all ?? []).map(({ id, kind, name, type, size, createdAt, hasThumb }) => ({
        id, kind, name, type, size, createdAt, hasThumb,
      }));
    } catch {
      return [];
    }
  },

  async estimateUsage(): Promise<{ bytes: number; count: number }> {
    const meta = await this.list();
    return { bytes: meta.reduce((acc, m) => acc + m.size, 0), count: meta.length };
  },

  async clearAll(): Promise<number> {
    const meta = await this.list();
    for (const m of meta) {
      const url = blobUrlCache.get(m.id);
      if (url) URL.revokeObjectURL(url);
      const thumb = thumbUrlCache.get(m.id);
      if (thumb) URL.revokeObjectURL(thumb);
      blobUrlCache.delete(m.id);
      thumbUrlCache.delete(m.id);
    }
    try {
      await tx('readwrite', STORE_ASSETS, (s) => s.clear());
    } catch {
      // vacío: nada que borrar
    }
    return meta.length;
  },

  /**
   * ¿El navegador permite el selector nativo de archivos para lo que pide el
   * estudio? La API existe dentro de iframes cross-origin pero está prohibida:
   * sin esta guarda el botón parecía funcionar y fallaba en silencio.
   * Leer window.top.location.href cross-origin lanza SecurityError → fallback.
   */
  canUseNativeFilePicker(): boolean {
    if (typeof window === 'undefined' || !('showOpenFilePicker' in window)) return false;
    try {
      if (window.self !== window.top) {
        // Acceso permitido solo si el iframe es same-origin.
        return typeof window.top?.location?.href === 'string';
      }
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Abre el selector nativo. Resultado tipado:
   *  - picked: hay archivo (se guarda el FileSystemFileHandle si el navegador
   *    lo permitió; si no, se sigue con el archivo en memoria sin perderlo).
   *  - cancelled: el usuario cerró el diálogo (AbortError). No es un error.
   *  - fallback-required: no se puede usar el nativo (no soportado, iframe o
   *    SecurityError/NotAllowedError) → el llamador debe usar el input <file>.
   */
  async pickSourcePdf(bookId?: string): Promise<
    { status: 'picked'; file: File } | { status: 'cancelled' } | { status: 'fallback-required' }
  > {
    if (!this.canUseNativeFilePicker()) {
      markNativePickerFailedSession();
      return { status: 'fallback-required' };
    }
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }],
        multiple: false,
      });
      if (!handle) return { status: 'cancelled' };
      const file: File = await handle.getFile();
      // Guardar el permiso (FileSystemFileHandle) para reabrir el libro después
      // nunca debe descartar el archivo ya elegido: si el guardado falla
      // (modo incógnito, cuota o restricción del navegador), el archivo es
      // válido igual; solo no se podrá reabrir sin volver a elegirlo.
      try {
        await tx('readwrite', STORE_META, (s) => s.put({ id: sourcePdfMetaKeyFor(bookId), handle }));
      } catch {
        // Sin handle persistente: se continúa con el archivo en memoria.
      }
      return { status: 'picked', file };
    } catch (err: unknown) {
      const name = (err as { name?: string } | null)?.name;
      // AbortError = el usuario canceló el diálogo: no es un error bloqueante.
      if (name === 'AbortError') return { status: 'cancelled' };
      // SecurityError / NotAllowedError = iframe o permiso denegado: usar input de respaldo.
      markNativePickerFailedSession();
      return { status: 'fallback-required' };
    }
  },

  async saveSourcePdfCopy(file: File): Promise<{ assetId: AssetRef; thumbUri: string | null } | null> {
    try {
      return await this.putBlob(file, 'source-pdf-copy', file.name);
    } catch {
      return null;
    }
  },

  /**
   * Restaura el PDF original desde la referencia guardada.
   * NUNCA duplica el archivo: solo pide permiso de lectura al handle.
   * Si se pasa bookId, lee la referencia de ESE libro; si no existe, cae a
   * la clave global legada (comportamiento anterior) para no perder lo ya
   * guardado.
   */
  async restoreSourcePdf(bookId?: string): Promise<
    | { status: 'restored'; file: File }
    | { status: 'moved' }
    | { status: 'denied' }
    | { status: 'no-handle' }
  > {
    if (!this.canUseNativeFilePicker()) return { status: 'no-handle' };
    try {
      const scoped = bookId ? await tx('readonly', STORE_META, (s) => s.get(sourcePdfMetaKeyFor(bookId))) : null;
      const meta = scoped?.handle ? scoped : (await tx('readonly', STORE_META, (s) => s.get(SOURCE_PDF_META_KEY)));
      const handle = meta?.handle;
      if (!handle) return { status: 'no-handle' };
      const perm = await handle.queryPermission?.({ mode: 'read' });
      if (perm === 'granted') {
        const file = await handle.getFile();
        return { status: 'restored', file };
      }
      if (perm === 'prompt') {
        // Pedir permiso requiere un gesto del usuario: la UI lo invocará.
        return { status: 'denied' };
      }
      return { status: 'denied' };
    } catch {
      return { status: 'moved' };
    }
  },

  async requestSourcePdfPermission(bookId?: string): Promise<File | null> {
    if (!this.canUseNativeFilePicker()) return null;
    try {
      const scoped = bookId ? await tx('readonly', STORE_META, (s) => s.get(sourcePdfMetaKeyFor(bookId))) : null;
      const meta = scoped?.handle ? scoped : (await tx('readonly', STORE_META, (s) => s.get(SOURCE_PDF_META_KEY)));
      const handle = meta?.handle;
      if (!handle) return null;
      const perm = await handle.requestPermission?.({ mode: 'read' });
      if (perm === 'granted') {
        return await handle.getFile();
      }
      return null;
    } catch {
      return null;
    }
  },
};

/**
 * ¿El selector nativo falló en esta sesión? Si fue así, la UI cae al
 * <label> nativo (siempre funciona, sin JS) en vez de reintentar
 * showOpenFilePicker() en cada clic (que además puede fallar en silencio
 * de nuevo). Vive en memoria: al recargar la página se vuelve a intentar.
 */
let nativePickerFailedThisSession = false;

export function markNativePickerFailedSession(): void {
  nativePickerFailedThisSession = true;
}

export function isNativePickerFailedSession(): boolean {
  return nativePickerFailedThisSession;
}

export function resetNativePickerFailedSession(): void {
  nativePickerFailedThisSession = false;
}
