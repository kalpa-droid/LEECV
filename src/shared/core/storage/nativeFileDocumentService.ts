/**
 * Servicio unificado de archivo en disco estilo aplicación de escritorio (Word / LibreOffice).
 *
 * - Permite vincular una "Carpeta Segura" (`showDirectoryPicker`) persistida en
 *   IndexedDB para guardar y listar tus respaldos en un lugar fijo y conocido,
 *   sin que queden perdidos en Descargas ni se creen copias `(1)`, `(2)`.
 * - También recuerda el `FileSystemFileHandle` del archivo activo para Guardar
 *   directo en disco y, si el navegador no soporta carpetas nativas (Safari/Firefox),
 *   avisa explícitamente vía Lidio que el archivo quedó en Descargas.
 */

import { emitLidioMessage } from '../assistant/lidioBus';
import { downloadBlob } from '../utils/downloadUtils';
import {
  clearDirectoryHandle,
  clearWorkspaceFolderMeta,
  getWorkspaceFolderMeta,
  loadDirectoryHandle,
  loadDocumentFileHandle,
  saveDirectoryHandle,
  saveDocumentFileHandle,
  saveWorkspaceFolderMeta,
  updateWorkspaceFolderMeta,
} from './fileHandleStore';
import {
  getPackageFormatSpec,
  packDocumentForDisk,
  unpackDocumentFromDisk,
} from './leecvPackageCodec';

const activeHandles = new Map<string, any>();

const WORKSPACE_ALLOWED_EXTENSIONS = [
  '.leecv',
  '.leedoc',
  '.leecard',
  '.leebook',
  '.leeplan',
  '.leefact',
  '.leecv-editor',
  '.json',
  '.zip',
];

export type SaveLocationKind = 'workspace-folder' | 'picked-file' | 'browser-downloads';

export interface WorkspaceFolderStatus {
  supported: boolean;
  configured: boolean;
  permission: 'granted' | 'prompt' | 'denied' | 'unavailable';
  folderName: string | null;
  lastSavedFileName?: string;
  lastSavedAt?: string;
  fallbackLabel: string;
}

export interface WorkspaceFolderFileEntry {
  name: string;
  size: number;
  lastModified: number;
  handle: any;
}

export function canUseNativeFileSystemPicker(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('showOpenFilePicker' in window) || !('showSaveFilePicker' in window)) return false;
  try {
    if (window.self !== window.top) {
      return typeof window.top?.location?.href === 'string';
    }
    return true;
  } catch {
    return false;
  }
}

export function canUseDirectoryPicker(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('showDirectoryPicker' in window)) return false;
  try {
    if (window.self !== window.top) {
      return typeof window.top?.location?.href === 'string';
    }
    return true;
  } catch {
    return false;
  }
}

export function bindNativeFileHandle(docId: string, handle: any): void {
  if (!docId || !handle) return;
  activeHandles.set(docId, handle);
  void saveDocumentFileHandle(docId, handle);
}

export function getBoundNativeFileName(docId?: string): string | null {
  if (!docId) return null;
  const handle = activeHandles.get(docId);
  return typeof handle?.name === 'string' ? handle.name : null;
}

export async function getWorkspaceFolderStatus(): Promise<WorkspaceFolderStatus> {
  const supported = canUseDirectoryPicker();
  const meta = getWorkspaceFolderMeta();
  const fallbackLabel = 'Carpeta Descargas del navegador';

  if (!supported) {
    return {
      supported: false,
      configured: false,
      permission: 'unavailable',
      folderName: null,
      lastSavedFileName: meta?.lastSavedFileName,
      lastSavedAt: meta?.lastSavedAt,
      fallbackLabel,
    };
  }

  const dirHandle = await loadDirectoryHandle();
  if (!dirHandle) {
    return {
      supported: true,
      configured: false,
      permission: meta?.folderName ? 'prompt' : 'unavailable',
      folderName: null,
      lastSavedFileName: meta?.lastSavedFileName,
      lastSavedAt: meta?.lastSavedAt,
      fallbackLabel,
    };
  }

  let permission: WorkspaceFolderStatus['permission'] = 'prompt';
  try {
    const state = await dirHandle.queryPermission?.({ mode: 'readwrite' });
    if (state === 'granted' || state === 'denied' || state === 'prompt') {
      permission = state;
    }
  } catch {
    permission = 'prompt';
  }

  return {
    supported: true,
    configured: true,
    permission,
    folderName: dirHandle.name || meta?.folderName || 'Carpeta LEECV',
    lastSavedFileName: meta?.lastSavedFileName,
    lastSavedAt: meta?.lastSavedAt,
    fallbackLabel,
  };
}

export type ChooseWorkspaceFolderResult =
  | { status: 'selected'; folderName: string }
  | { status: 'cancelled' }
  | { status: 'unsupported' };

/**
 * Permite elegir una "Carpeta Segura" en la computadora para guardar y encontrar
 * todos los respaldos LEECV en un único lugar.
 */
export async function chooseWorkspaceFolder(): Promise<ChooseWorkspaceFolderResult> {
  if (!canUseDirectoryPicker()) {
    emitLidioMessage({
      kind: 'warning',
      groupKey: 'workspace-folder',
      title: 'Carpeta automática no disponible aquí',
      body: 'Este navegador guarda las descargas en su carpeta "Descargas". Podés elegir la carpeta al tocar "Guardar archivo" o mover el respaldo a una carpeta segura.',
    });
    return { status: 'unsupported' };
  }

  try {
    const handle = await (window as any).showDirectoryPicker({
      id: 'leecv-carpeta-segura',
      mode: 'readwrite',
    });
    if (!handle) return { status: 'cancelled' };

    const perm = await handle.queryPermission?.({ mode: 'readwrite' });
    if (perm !== 'granted') {
      await handle.requestPermission?.({ mode: 'readwrite' });
    }

    const folderName = handle.name || 'Carpeta LEECV';
    await saveDirectoryHandle(handle);
    saveWorkspaceFolderMeta({
      folderName,
      linkedAt: new Date().toISOString(),
    });

    emitLidioMessage({
      kind: 'storage',
      groupKey: 'workspace-folder',
      title: 'Carpeta Segura vinculada',
      body: `Tus respaldos se guardarán directo dentro de la carpeta "${folderName}". Así sabés siempre dónde están y no se pierden.`,
    });

    return { status: 'selected', folderName };
  } catch (err: any) {
    if (err?.name === 'AbortError') return { status: 'cancelled' };
    return { status: 'unsupported' };
  }
}

export async function clearWorkspaceFolder(): Promise<void> {
  await clearDirectoryHandle();
  clearWorkspaceFolderMeta();
}

/**
 * Lista archivos compatibles dentro de la Carpeta Segura vinculada (si tiene permiso).
 */
export async function listWorkspaceFolderFiles(
  requestPermissionIfNeeded = false
): Promise<WorkspaceFolderFileEntry[]> {
  if (!canUseDirectoryPicker()) return [];
  const dirHandle = await loadDirectoryHandle();
  if (!dirHandle) return [];

  try {
    let perm = await dirHandle.queryPermission?.({ mode: 'readwrite' });
    if (perm !== 'granted' && requestPermissionIfNeeded) {
      perm = await dirHandle.requestPermission?.({ mode: 'readwrite' });
    }
    if (perm !== 'granted') return [];

    const entries: WorkspaceFolderFileEntry[] = [];
    for await (const [, entry] of dirHandle.entries()) {
      if (entry?.kind !== 'file') continue;
      const lowerName = String(entry.name || '').toLowerCase();
      if (!WORKSPACE_ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) continue;
      try {
        const file: File = await entry.getFile();
        entries.push({
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
          handle: entry,
        });
      } catch {
        // Archivo inaccesible en este instante; continuar con los demás
      }
    }

    entries.sort((a, b) => b.lastModified - a.lastModified);
    return entries;
  } catch {
    return [];
  }
}

export async function openWorkspaceFileEntry(entry: WorkspaceFolderFileEntry): Promise<{
  docType: string;
  data: any;
  fileName: string;
}> {
  const file: File = await entry.handle.getFile();
  const unpacked = await unpackDocumentFromDisk(file);
  if (unpacked.data?.id) {
    bindNativeFileHandle(String(unpacked.data.id), entry.handle);
  }
  return {
    docType: unpacked.docType,
    data: unpacked.data,
    fileName: file.name,
  };
}

export type NativeOpenResult =
  | { status: 'opened'; docType: string; data: any; fileName: string; boundNativeHandle: boolean }
  | { status: 'cancelled' }
  | { status: 'fallback-required' };

/**
 * Abre un archivo portable (.leecv, .leedoc, .leecard, .leebook, .json, .zip) desde el disco.
 */
export async function openDocumentFromDisk(): Promise<NativeOpenResult> {
  if (!canUseNativeFileSystemPicker()) {
    return { status: 'fallback-required' };
  }

  try {
    const [handle] = await (window as any).showOpenFilePicker({
      multiple: false,
      types: [
        {
          description: 'Documentos LEECV y Respaldos',
          accept: {
            'application/json': ['.json', '.leecv', '.leecard', '.leeplan'],
            'application/zip': ['.leedoc', '.leecv-editor', '.leebook', '.zip'],
          },
        },
      ],
    });

    if (!handle) return { status: 'cancelled' };
    const file: File = await handle.getFile();
    const unpacked = await unpackDocumentFromDisk(file);

    const resolvedDocId = unpacked.data?.id;
    if (resolvedDocId) {
      bindNativeFileHandle(String(resolvedDocId), handle);
    }

    return {
      status: 'opened',
      docType: unpacked.docType,
      data: unpacked.data,
      fileName: file.name,
      boundNativeHandle: true,
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') return { status: 'cancelled' };
    if (err?.name === 'SecurityError' || err?.name === 'NotAllowedError') {
      return { status: 'fallback-required' };
    }
    throw err;
  }
}

export type NativeSaveResult =
  | {
      status: 'saved';
      fileName: string;
      overwroteExisting: boolean;
      locationKind: SaveLocationKind;
      folderName?: string;
    }
  | { status: 'cancelled' };

function emitExplicitSaveNotice(
  fileName: string,
  locationKind: SaveLocationKind,
  folderName?: string
): void {
  if (locationKind === 'workspace-folder' && folderName) {
    emitLidioMessage({
      kind: 'storage',
      groupKey: 'disk-save-location',
      title: `Guardado en "${folderName}"`,
      body: `Tu respaldo "${fileName}" se guardó directo en tu carpeta "${folderName}". Ahí queda a salvo para abrirlo cuando quieras.`,
    });
    return;
  }
  if (locationKind === 'picked-file') {
    emitLidioMessage({
      kind: 'storage',
      groupKey: 'disk-save-location',
      title: 'Archivo guardado en tu carpeta',
      body: `Guardaste "${fileName}" en la carpeta que elegiste. Conservar ese archivo te asegura no perder tus datos.`,
    });
    return;
  }
  emitLidioMessage({
    kind: 'storage',
    groupKey: 'disk-save-location',
    title: 'Guardado en Descargas',
    body: `El navegador descargó "${fileName}" en tu carpeta "Descargas". Movelo a una carpeta propia (por ej. Documentos/LEECV) para no borrarlo por error.`,
  });
}

/**
 * Guarda un documento en disco con transparencia total sobre la carpeta destino:
 * 1) Archivo activo ya vinculado (Ctrl+S).
 * 2) Carpeta Segura vinculada en IndexedDB (`showDirectoryPicker`).
 * 3) Diálogo nativo "Guardar como" (`showSaveFilePicker`).
 * 4) Descarga estándar en "Descargas" con aviso explícito de Lidio.
 */
export async function saveDocumentToDisk(
  docId: string,
  docType: string,
  data: any,
  options?: { forceSaveAs?: boolean; preferPlainJson?: boolean }
): Promise<NativeSaveResult> {
  const packed = await packDocumentForDisk(docType, data, {
    preferPlainJson: options?.preferPlainJson,
  });

  const existingHandle =
    (docId ? activeHandles.get(docId) : undefined) ??
    (docId ? await loadDocumentFileHandle(docId) : null);

  if (existingHandle && !options?.forceSaveAs) {
    try {
      const permission = await existingHandle.queryPermission?.({ mode: 'readwrite' });
      const granted =
        permission === 'granted' ||
        (await existingHandle.requestPermission?.({ mode: 'readwrite' })) === 'granted';
      if (granted) {
        const writable = await existingHandle.createWritable();
        await writable.write(packed.blob);
        await writable.close();
        if (docId) activeHandles.set(docId, existingHandle);
        const savedName = existingHandle.name || packed.suggestedFileName;
        const meta = getWorkspaceFolderMeta();
        updateWorkspaceFolderMeta({
          lastSavedFileName: savedName,
          lastSavedAt: new Date().toISOString(),
        });
        emitExplicitSaveNotice(savedName, meta?.folderName ? 'workspace-folder' : 'picked-file', meta?.folderName);
        return {
          status: 'saved',
          fileName: savedName,
          overwroteExisting: true,
          locationKind: meta?.folderName ? 'workspace-folder' : 'picked-file',
          folderName: meta?.folderName,
        };
      }
    } catch {
      // Si el handle perdió permiso, continuar al siguiente mecanismo
    }
  }

  // 2) Intentar escribir directo en la Carpeta Segura configurada
  if (!options?.forceSaveAs && canUseDirectoryPicker()) {
    const dirHandle = await loadDirectoryHandle();
    if (dirHandle) {
      try {
        const perm = await dirHandle.queryPermission?.({ mode: 'readwrite' });
        const granted =
          perm === 'granted' ||
          (await dirHandle.requestPermission?.({ mode: 'readwrite' })) === 'granted';
        if (granted) {
          const fileHandle = await dirHandle.getFileHandle(packed.suggestedFileName, {
            create: true,
          });
          const writable = await fileHandle.createWritable();
          await writable.write(packed.blob);
          await writable.close();
          if (docId) bindNativeFileHandle(docId, fileHandle);
          const folderName = dirHandle.name || 'Carpeta LEECV';
          updateWorkspaceFolderMeta({
            folderName,
            lastSavedFileName: packed.suggestedFileName,
            lastSavedAt: new Date().toISOString(),
          });
          emitExplicitSaveNotice(packed.suggestedFileName, 'workspace-folder', folderName);
          return {
            status: 'saved',
            fileName: packed.suggestedFileName,
            overwroteExisting: false,
            locationKind: 'workspace-folder',
            folderName,
          };
        }
      } catch {
        // Cae al picker individual o descarga estándar
      }
    }
  }

  // 3) Selector individual nativo (Guardar como)
  if (canUseNativeFileSystemPicker()) {
    const spec = getPackageFormatSpec(docType);
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: packed.suggestedFileName,
        types: options?.preferPlainJson
          ? [
              {
                description: 'Respaldo JSON LEECV',
                accept: { 'application/json': ['.json'] },
              },
            ]
          : [
              {
                description: spec.label,
                accept: {
                  [packed.isPackageContainer ? 'application/zip' : 'application/json']: [spec.extension],
                },
              },
              {
                description: 'Respaldo JSON compatible',
                accept: { 'application/json': ['.json'] },
              },
            ],
      });

      if (handle) {
        const writable = await handle.createWritable();
        await writable.write(packed.blob);
        await writable.close();
        if (docId) {
          bindNativeFileHandle(docId, handle);
        }
        const savedName = handle.name || packed.suggestedFileName;
        emitExplicitSaveNotice(savedName, 'picked-file');
        return {
          status: 'saved',
          fileName: savedName,
          overwroteExisting: false,
          locationKind: 'picked-file',
        };
      }
      return { status: 'cancelled' };
    } catch (err: any) {
      if (err?.name === 'AbortError') return { status: 'cancelled' };
      // Cualquier rechazo cae a descarga estándar del navegador
    }
  }

  downloadBlob(packed.blob, packed.suggestedFileName);
  emitExplicitSaveNotice(packed.suggestedFileName, 'browser-downloads');
  return {
    status: 'saved',
    fileName: packed.suggestedFileName,
    overwroteExisting: false,
    locationKind: 'browser-downloads',
  };
}
