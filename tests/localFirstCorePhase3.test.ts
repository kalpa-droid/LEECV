import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const idbMemory = new Map<string, any>();

vi.mock('../src/shared/core/storage/storageIndexedDB', () => ({
  idbStorage: {
    getItem: vi.fn(async (key: string) => (idbMemory.has(key) ? idbMemory.get(key) : null)),
    setItem: vi.fn(async (key: string, val: any) => {
      idbMemory.set(key, val);
    }),
    removeItem: vi.fn(async (key: string) => {
      idbMemory.delete(key);
    }),
  },
}));

vi.mock('../src/shared/core/utils/imageCompressor', () => ({
  optimizeCVImagesToWebP: vi.fn(async (doc: any) => doc),
}));

vi.mock('../src/shared/core/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-local-first-1' } } })),
    },
  },
  checkStorageStatus: vi.fn(),
}));

const remoteRowsMock = vi.fn();
const remoteGetByIdMock = vi.fn();
const remoteUpsertMock = vi.fn(async () => true);
const remoteDeleteMock = vi.fn(async () => true);

vi.mock('../src/shared/core/storage/dataAccessLayer', () => ({
  dal: {
    cvs: {
      listByUser: (...args: any[]) => remoteRowsMock(...args),
      getById: (...args: any[]) => remoteGetByIdMock(...args),
      upsert: (...args: any[]) => remoteUpsertMock(...args),
      delete: (...args: any[]) => remoteDeleteMock(...args),
    },
  },
}));

import {
  saveDocument,
  loadDocumentById,
  getSavedDocumentsList,
  deleteDocumentById,
} from '../src/shared/core/storage/documentStorageService';
import {
  getLegacyCloudImportedAt,
  resetLegacyCloudImportCacheForTests,
} from '../src/shared/core/storage/legacyCloudImporter';
import { localAssetStore } from '../src/shared/core/storage/localAssetStore';
import { encryptedVaultDriver } from '../src/shared/core/storage/encryptedVaultDriver';
import { isStoredDocumentEnvelope, wrapDocumentEnvelope } from '../src/shared/core/storage/documentEnvelope';

describe('Fase 3 — Local-First Core (Envelope, LocalAssetStore, Drivers, D7 y D8)', () => {
  beforeEach(() => {
    idbMemory.clear();
    resetLegacyCloudImportCacheForTests();
    remoteRowsMock.mockReset();
    remoteGetByIdMock.mockReset();
    remoteUpsertMock.mockClear();
    remoteDeleteMock.mockClear();

    const store: Record<string, string> = {};
    const localStorageMock = {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
    };
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('window', { localStorage: localStorageMock });
  });

  it('cierra D7: importa una sola vez filas mixtas de `cvs` a local clasificadas por su docType real', async () => {
    const now = new Date().toISOString();
    remoteRowsMock.mockResolvedValue([
      {
        id: 'legacy_cv_1',
        title: 'CV - Ana',
        candidate_name: 'Ana',
        updated_at: now,
        cv_data: { id: 'legacy_cv_1', activePresetId: 'cv-clasico', personalInfo: { fullName: 'Ana' } },
      },
      {
        id: 'legacy_letter_1',
        title: 'Carta - Ana',
        candidate_name: 'Ana',
        updated_at: now,
        cv_data: { id: 'legacy_letter_1', activePresetId: 'carta-clasica', body: { hookParagraph: 'Hola' } },
      },
      {
        id: 'legacy_card_1',
        title: 'Tarjeta - Ana',
        candidate_name: 'Ana',
        updated_at: now,
        cv_data: { id: 'legacy_card_1', activePresetId: 'tarjeta-personal', personalInfo: { fullName: 'Ana' } },
      },
    ]);

    const cvs = await getSavedDocumentsList('cv');
    const letters = await getSavedDocumentsList('cover_letter');
    const cards = await getSavedDocumentsList('business_card');

    expect(cvs.map((d) => d.id)).toEqual(['legacy_cv_1']);
    expect(letters.map((d) => d.id)).toEqual(['legacy_letter_1']);
    expect(cards.map((d) => d.id)).toEqual(['legacy_card_1']);
    // Importación única: solo llamó a listByUser 1 vez en total
    expect(remoteRowsMock).toHaveBeenCalledTimes(1);
    expect(getLegacyCloudImportedAt('user-local-first-1')).not.toBeNull();
  });

  it('externaliza imágenes base64 hacia LocalAssetStore, guarda Envelope con revisión incremental y no sube cv_data a la nube', async () => {
    const bigPhoto = `data:image/png;base64,${'A'.repeat(400)}`;
    const cvDoc = {
      id: 'doc_cv_local_1',
      activePresetId: 'cv-clasico',
      personalInfo: { fullName: 'Lucía Pérez', profilePhoto: bigPhoto },
    };

    const res1 = await saveDocument(cvDoc, 'cv');
    expect(res1.success).toBe(true);
    expect(res1.syncState).toBe('local');
    expect(remoteUpsertMock).not.toHaveBeenCalled();

    const storedEnvelope = idbMemory.get('doc_cv_data_doc_cv_local_1');
    expect(isStoredDocumentEnvelope(storedEnvelope)).toBe(true);
    expect(storedEnvelope.revision).toBe(1);
    expect(storedEnvelope.payload.personalInfo.profilePhoto).toMatch(/^asset:\/\//);

    // Segundo guardado incrementa revisión monotónicamente
    await saveDocument({ ...cvDoc, personalInfo: { ...cvDoc.personalInfo, role: 'Arquitecta' } }, 'cv');
    const storedEnvelope2 = idbMemory.get('doc_cv_data_doc_cv_local_1');
    expect(storedEnvelope2.revision).toBe(2);

    // Al cargar se rehidrata la foto original desde LocalAssetStore
    const loaded = await loadDocumentById('doc_cv_local_1', 'cv');
    expect(loaded.personalInfo.profilePhoto).toBe(bigPhoto);
    expect((await localAssetStore.listDocumentAssets('doc_cv_local_1')).length).toBeGreaterThanOrEqual(1);

    // Al borrar se limpian también los assets del documento
    await deleteDocumentById('doc_cv_local_1', 'cv');
    expect(await localAssetStore.listDocumentAssets('doc_cv_local_1')).toHaveLength(0);
  });

  it('cierra D8: book y planner nunca pasan por migrateCvData ni tocan Supabase', async () => {
    const bookDoc = {
      id: 'doc_book_1',
      bookMetadata: { title: 'Folleto Local' },
      pagesCount: 16,
    };

    await saveDocument(bookDoc, 'book');
    const list = await getSavedDocumentsList('book');
    expect(list.map((d) => d.id)).toEqual(['doc_book_1']);
    expect(remoteRowsMock).not.toHaveBeenCalled();

    const loadedBook = await loadDocumentById('doc_book_1', 'book');
    expect(loadedBook.bookMetadata.title).toBe('Folleto Local');
    expect(loadedBook.personalInfo).toBeUndefined();
    expect(loadedBook.experience).toBeUndefined();
  });

  it('EncryptedVaultDriver aísla datos sensibles en local sin exponer payload en localStorage ni importar red', async () => {
    const env = wrapDocumentEnvelope({
      id: 'vault_inv_1',
      docType: 'invoice',
      title: 'Bóveda Comercial',
      payload: { ciphertext: 'ENC_BLOB_XYZ', secretClient: 'NO_LOCALSTORAGE' },
    });

    await encryptedVaultDriver.save(env);
    const list = await encryptedVaultDriver.list('invoice');
    expect(list).toHaveLength(1);
    expect(list[0].cloudBackupState).toBe('disabled');

    const rawLs = localStorage.getItem('doc_invoice_saved_list') || '';
    expect(rawLs).not.toContain('ENC_BLOB_XYZ');
    expect(rawLs).not.toContain('NO_LOCALSTORAGE');

    const loaded = await encryptedVaultDriver.load<any>('vault_inv_1', 'invoice');
    expect(loaded?.payload.ciphertext).toBe('ENC_BLOB_XYZ');

    const driverSrc = fs.readFileSync(
      path.join(process.cwd(), 'src/shared/core/storage/encryptedVaultDriver.ts'),
      'utf8'
    );
    const importLines = driverSrc
      .split('\n')
      .filter((line) => /^\s*import\b/.test(line))
      .join('\n');
    expect(importLines).not.toMatch(/supabase|dataAccessLayer|syncEngine|cloudBackup/i);
    expect(driverSrc).not.toMatch(/\bfetch\s*\(/);
  });
});
