import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  clearWorkspaceFolderMeta,
  getWorkspaceFolderMeta,
  saveWorkspaceFolderMeta,
  updateWorkspaceFolderMeta,
} from '../src/shared/core/storage/fileHandleStore';
import {
  canUseDirectoryPicker,
  chooseWorkspaceFolder,
  getWorkspaceFolderStatus,
  listWorkspaceFolderFiles,
} from '../src/shared/core/storage/nativeFileDocumentService';
import { subscribeLidioMessages, type LidioLiveMessage } from '../src/shared/core/assistant/lidioBus';

describe('V3.0 Persistencia Explícita de Carpeta Segura (Etapa 3)', () => {
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    const mem = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => mem.get(k) ?? null,
        setItem: (k: string, v: string) => {
          mem.set(k, String(v));
        },
        removeItem: (k: string) => {
          mem.delete(k);
        },
        clear: () => {
          mem.clear();
        },
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: originalLocalStorage,
    });
  });

  it('guarda, actualiza y limpia metadatos de Carpeta Segura en storage sin fallar', () => {
    expect(getWorkspaceFolderMeta()).toBeNull();
    saveWorkspaceFolderMeta({
      folderName: 'Documentos-CV',
      linkedAt: '2026-11-22T03:00:00.000Z',
    });
    expect(getWorkspaceFolderMeta()?.folderName).toBe('Documentos-CV');

    const updated = updateWorkspaceFolderMeta({
      lastSavedFileName: 'CV_Ana.leecv',
      lastSavedAt: '2026-11-22T03:05:00.000Z',
    });
    expect(updated?.lastSavedFileName).toBe('CV_Ana.leecv');

    clearWorkspaceFolderMeta();
    expect(getWorkspaceFolderMeta()).toBeNull();
  });

  it('en entornos sin showDirectoryPicker reporta fallback claro y notifica por Lidio sin arrojar excepción', async () => {
    expect(canUseDirectoryPicker()).toBe(false);
    const status = await getWorkspaceFolderStatus();
    expect(status.supported).toBe(false);
    expect(status.configured).toBe(false);
    expect(status.fallbackLabel).toContain('Descargas');

    const msgs: LidioLiveMessage[] = [];
    const unsub = subscribeLidioMessages((m) => msgs.push(m));
    const choice = await chooseWorkspaceFolder();
    expect(choice.status).toBe('unsupported');
    expect(msgs.some((m) => m.kind === 'warning' && m.body.includes('Descargas'))).toBe(true);
    unsub();

    const files = await listWorkspaceFolderFiles(false);
    expect(files).toEqual([]);
  });
});
