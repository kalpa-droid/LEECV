/**
 * StorageResilienceEngine — Resiliencia Local-First contra actualizaciones de navegador/PC,
 * desalojo de IndexedDB y desincronización de índices.
 */

import { idbStorage } from './storageIndexedDB';
import { getWorkspaceFolderStatus } from './nativeFileDocumentService';

const LAST_EXTERNAL_BACKUP_KEY = 'leecv_last_external_backup_at_v1';
const STORAGE_DEGRADED_KEY = 'leecv_storage_degraded_session_v1';

export interface PersistentStorageResult {
  supported: boolean;
  persisted: boolean;
  usageBytes?: number;
  quotaBytes?: number;
  usageRatio?: number;
}

export interface BackupHealthSummary {
  status: 'ok' | 'warning' | 'danger';
  label: string;
  tooltip: string;
  daysSinceBackup: number | null;
  needsFolderReauth: boolean;
}

/**
 * Solicita almacenamiento persistente al navegador (evita desalojo silencioso por ITP/cuota)
 * e informa la cuota utilizada.
 */
export async function ensurePersistentStorage(): Promise<PersistentStorageResult> {
  if (typeof navigator === 'undefined' || !navigator.storage) {
    return { supported: false, persisted: false };
  }

  let persisted = false;
  try {
    if (typeof navigator.storage.persisted === 'function') {
      persisted = await navigator.storage.persisted();
    }
    if (!persisted && typeof navigator.storage.persist === 'function') {
      persisted = await navigator.storage.persist();
    }
  } catch {
    persisted = false;
  }

  try {
    if (typeof navigator.storage.estimate === 'function') {
      const est = await navigator.storage.estimate();
      const usageBytes = est.usage ?? 0;
      const quotaBytes = est.quota ?? 0;
      const usageRatio = quotaBytes > 0 ? usageBytes / quotaBytes : 0;
      return { supported: true, persisted, usageBytes, quotaBytes, usageRatio };
    }
  } catch {
    // Ignorar error de estimate en navegadores restringidos
  }

  return { supported: true, persisted };
}

/**
 * Registra la fecha/hora del último respaldo externo real (Carpeta Segura, .leecv, .zip, etc.).
 */
export function recordExternalBackupTimestamp(isoDate: string = new Date().toISOString()): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LAST_EXTERNAL_BACKUP_KEY, isoDate);
    }
  } catch {
    // Ignorar en entornos sin localStorage
  }
}

export function getLastExternalBackupTimestamp(): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(LAST_EXTERNAL_BACKUP_KEY);
    }
  } catch {
    return null;
  }
  return null;
}

export function markStorageDegradedSession(): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(STORAGE_DEGRADED_KEY, '1');
    }
  } catch {
    // noop
  }
}

export function isStorageDegradedSession(): boolean {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(STORAGE_DEGRADED_KEY) === '1';
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Reconcilia el índice liviano de `localStorage` (`doc_<docType>_saved_list`) contra
 * los sobres reales guardados en IndexedDB (`doc_<docType>_data_<id>`).
 * Rescata documentos huérfanos si se limpió `localStorage`.
 */
export async function reconcileLocalDocumentIndex(docType: string): Promise<number> {
  if (typeof window === 'undefined' || !window.localStorage) return 0;

  const dataPrefix = `doc_${docType}_data_`;
  const listKey = `doc_${docType}_saved_list`;

  const allIdbKeys = await idbStorage.keys();
  const docKeys = allIdbKeys.filter((k) => k.startsWith(dataPrefix));
  if (docKeys.length === 0) return 0;

  let currentList: Array<{ id: string; title: string; updatedAt: string; docType?: string }> = [];
  try {
    const raw = window.localStorage.getItem(listKey);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) currentList = parsed;
  } catch {
    currentList = [];
  }

  const existingIds = new Set(currentList.map((item) => item?.id).filter(Boolean));
  let recovered = 0;

  for (const key of docKeys) {
    const docId = key.slice(dataPrefix.length);
    if (!docId || existingIds.has(docId)) continue;

    const envelope = await idbStorage.getItem(key);
    if (!envelope || typeof envelope !== 'object') continue;
    const payload = 'payload' in envelope ? (envelope as any).payload : envelope;
    const title =
      (typeof payload?.title === 'string' && payload.title.trim()) ||
      (typeof payload?.metadata?.title === 'string' && payload.metadata.title.trim()) ||
      `Documento recuperado (${docId.slice(-6)})`;
    const updatedAt =
      (typeof (envelope as any).updatedAt === 'string' && (envelope as any).updatedAt) ||
      new Date().toISOString();

    currentList.unshift({ id: docId, title, updatedAt, docType });
    existingIds.add(docId);
    recovered++;
  }

  if (recovered > 0) {
    try {
      window.localStorage.setItem(listKey, JSON.stringify(currentList));
    } catch {
      // noop
    }
  }

  return recovered;
}

/**
 * Calcula el semáforo de salud de respaldo para mostrar en `StudioNavbar`.
 */
export async function computeBackupHealth(options?: {
  lastBackupIso?: string | null;
  isBackupOverdue?: boolean;
  cadenceDays?: number;
}): Promise<BackupHealthSummary> {
  const cadenceDays = options?.cadenceDays ?? 7;

  if (isStorageDegradedSession()) {
    return {
      status: 'danger',
      label: 'Almacenamiento temporal · Descargá copia',
      tooltip: 'El navegador bloqueó el guardado local permanente. Descargá una copia de seguridad ahora.',
      daysSinceBackup: null,
      needsFolderReauth: false,
    };
  }

  let needsFolderReauth = false;
  let folderLinked = false;
  try {
    const folder = await getWorkspaceFolderStatus();
    const isGranted = folder.configured && folder.permission === 'granted';
    if (folder.configured && !isGranted) {
      needsFolderReauth = true;
    }
    folderLinked = isGranted;
  } catch {
    // En entornos sin FSA
  }

  if (needsFolderReauth) {
    return {
      status: 'danger',
      label: 'Re-autorizar Carpeta Segura',
      tooltip: 'Tu navegador reinició el permiso de tu Carpeta Segura. Hacé clic para reconectarla en 1 clic.',
      daysSinceBackup: null,
      needsFolderReauth: true,
    };
  }

  const lastIso = options?.lastBackupIso ?? getLastExternalBackupTimestamp();
  let daysSinceBackup: number | null = null;
  if (lastIso) {
    const ms = Date.now() - new Date(lastIso).getTime();
    if (Number.isFinite(ms) && ms >= 0) {
      daysSinceBackup = Math.floor(ms / (1000 * 60 * 60 * 24));
    }
  }

  if (options?.isBackupOverdue || daysSinceBackup === null || daysSinceBackup > cadenceDays) {
    return {
      status: 'warning',
      label: daysSinceBackup === null ? 'Sin copia fuera del navegador' : `Sin respaldo hace ${daysSinceBackup} días`,
      tooltip: 'Guardado solo en este navegador. Si actualizás la PC o borrás caché podrías perder cambios: guardá una copia en Carpeta Segura o archivo.',
      daysSinceBackup,
      needsFolderReauth: false,
    };
  }

  return {
    status: 'ok',
    label: folderLinked ? 'Carpeta Segura y respaldo al día' : 'Respaldo al día',
    tooltip: `Última copia externa hace ${daysSinceBackup} día(s).`,
    daysSinceBackup,
    needsFolderReauth: false,
  };
}
