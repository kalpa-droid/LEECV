/**
 * fileHandleStore.ts — Almacén IndexedDB de FileSystemDirectoryHandle y
 * FileSystemFileHandle para recordar la "Carpeta Segura" y los archivos abiertos
 * entre recargas (sin nunca exponer rutas absolutas del sistema operativo, que
 * los navegadores bloquean por seguridad).
 *
 * Seguro en SSR/Node (cuando no existe `indexedDB` o `localStorage` no falla).
 */

const DB_NAME = 'leecv_fs_handles_v1';
const STORE_NAME = 'handles';
const WORKSPACE_DIR_KEY = 'workspace_dir';
const META_STORAGE_KEY = 'leecv_workspace_folder_meta_v1';

export interface WorkspaceFolderMeta {
  folderName: string;
  linkedAt: string;
  lastSavedFileName?: string;
  lastSavedAt?: string;
}

function docHandleKey(docId: string): string {
  return `doc_${docId}`;
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function putRecord(key: string, handle: any): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ key, handle, updatedAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function getRecord(key: string): Promise<any | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result?.handle ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function deleteRecord(key: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function saveDirectoryHandle(handle: any): Promise<boolean> {
  if (!handle) return false;
  return putRecord(WORKSPACE_DIR_KEY, handle);
}

export async function loadDirectoryHandle(): Promise<any | null> {
  return getRecord(WORKSPACE_DIR_KEY);
}

export async function clearDirectoryHandle(): Promise<void> {
  await deleteRecord(WORKSPACE_DIR_KEY);
}

export async function saveDocumentFileHandle(docId: string, handle: any): Promise<boolean> {
  if (!docId || !handle) return false;
  return putRecord(docHandleKey(docId), handle);
}

export async function loadDocumentFileHandle(docId: string): Promise<any | null> {
  if (!docId) return null;
  return getRecord(docHandleKey(docId));
}

export function getWorkspaceFolderMeta(): WorkspaceFolderMeta | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.folderName === 'string' && parsed.folderName) {
      return parsed as WorkspaceFolderMeta;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveWorkspaceFolderMeta(meta: WorkspaceFolderMeta): WorkspaceFolderMeta {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
    } catch {
      // Sin espacio o bloqueado
    }
  }
  return meta;
}

export function updateWorkspaceFolderMeta(patch: Partial<WorkspaceFolderMeta>): WorkspaceFolderMeta | null {
  const current = getWorkspaceFolderMeta();
  if (!current && !patch.folderName) return null;
  const next: WorkspaceFolderMeta = {
    folderName: patch.folderName ?? current?.folderName ?? '',
    linkedAt: patch.linkedAt ?? current?.linkedAt ?? new Date().toISOString(),
    lastSavedFileName: patch.lastSavedFileName ?? current?.lastSavedFileName,
    lastSavedAt: patch.lastSavedAt ?? current?.lastSavedAt,
  };
  return saveWorkspaceFolderMeta(next);
}

export function clearWorkspaceFolderMeta(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(META_STORAGE_KEY);
  } catch {
    // noop
  }
}
