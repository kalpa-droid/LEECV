/**
 * Servicio unificado de archivo en disco estilo aplicación de escritorio (Word / LibreOffice).
 *
 * - Usa File System Access API (`showOpenFilePicker` / `showSaveFilePicker`) cuando el
 *   navegador y el contexto lo permiten, recordando el identificador de archivo en disco para
 *   que "Guardar" sobrescriba el mismo archivo sin crear duplicados `(1)`, `(2)`.
 * - En navegadores sin File System Access API (Safari / Firefox) o iframes restringidos,
 *   desciende limpiamente a `<input type="file">` y `downloadBlob`.
 */

import { downloadBlob } from '../utils/downloadUtils';
import {
  getPackageFormatSpec,
  packDocumentForDisk,
  unpackDocumentFromDisk,
} from './leecvPackageCodec';

const activeHandles = new Map<string, any>();

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

export function bindNativeFileHandle(docId: string, handle: any): void {
  if (!docId || !handle) return;
  activeHandles.set(docId, handle);
}

export function getBoundNativeFileName(docId?: string): string | null {
  if (!docId) return null;
  const handle = activeHandles.get(docId);
  return typeof handle?.name === 'string' ? handle.name : null;
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
      activeHandles.set(String(resolvedDocId), handle);
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
  | { status: 'saved'; fileName: string; overwroteExisting: boolean }
  | { status: 'cancelled' };

/**
 * Guarda un documento en disco. Si el archivo fue abierto o guardado previamente con
 * identificador nativo y no se pide `forceSaveAs`, sobrescribe ese archivo directo (estilo Ctrl+S).
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

  const existingHandle = docId ? activeHandles.get(docId) : undefined;

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
        return {
          status: 'saved',
          fileName: existingHandle.name || packed.suggestedFileName,
          overwroteExisting: true,
        };
      }
    } catch {
      // Si el handle perdió permiso, cae al diálogo Guardar como
    }
  }

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
          activeHandles.set(docId, handle);
        }
        return {
          status: 'saved',
          fileName: handle.name || packed.suggestedFileName,
          overwroteExisting: false,
        };
      }
      return { status: 'cancelled' };
    } catch (err: any) {
      if (err?.name === 'AbortError') return { status: 'cancelled' };
      // Cualquier rechazo de seguridad cae a descarga estándar del navegador
    }
  }

  downloadBlob(packed.blob, packed.suggestedFileName);
  return {
    status: 'saved',
    fileName: packed.suggestedFileName,
    overwroteExisting: false,
  };
}
