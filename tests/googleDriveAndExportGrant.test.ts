import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/shared/core/storage/dataAccessLayer', () => ({
  dal: {
    profiles: {
      updateDriveQuota: vi.fn().mockResolvedValue(true),
    },
  },
}));

vi.mock('../src/shared/core/lib/supabaseClient', () => ({
  supabase: null,
}));

import {
  clearExportSessionWindow,
  EXPORT_SESSION_WINDOW_MS,
  grantExportSessionWindow,
  hasActiveExportSessionWindow,
} from '../src/shared/core/entitlements/exportSessionGrant';
import {
  buildTimestampedDriveFilename,
  uploadFileToPersonalDrive,
} from '../src/shared/core/storage/googleDriveClient';
import {
  clearLastExportedArtifact,
  getLastExportedArtifact,
  recordLastExportedArtifact,
} from '../src/shared/core/utils/lastExportArtifactStore';

describe('Etapa 4 — Sesión 1 crédito + Google Drive Personal + Registro de artefacto', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearLastExportedArtifact();
    clearExportSessionWindow('editorial', 'ed-1');
    clearExportSessionWindow('cv', 'active');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mantiene una ventana de 15 min por documento para exportar PDF/DOCX/Drive con 1 solo crédito', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    expect(hasActiveExportSessionWindow('editorial', 'ed-1')).toBe(false);

    grantExportSessionWindow('editorial', 'ed-1');
    expect(hasActiveExportSessionWindow('editorial', 'ed-1')).toBe(true);
    expect(hasActiveExportSessionWindow('book', 'ed-1')).toBe(false);

    nowSpy.mockReturnValue(1_000_000 + EXPORT_SESSION_WINDOW_MS + 1000);
    expect(hasActiveExportSessionWindow('editorial', 'ed-1')).toBe(false);
  });

  it('genera nombres fechados en Google Drive para nunca pisar copias anteriores', () => {
    const stamped = buildTimestampedDriveFilename('Tesis-Final.leedoc');
    expect(stamped).toMatch(/^Tesis-Final_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.leedoc$/);
    // Idempotente si ya trae marca horaria
    expect(buildTimestampedDriveFilename(stamped)).toBe(stamped);
  });

  it('elige uploadType=multipart para archivos chicos y uploadType=resumable > 4 MB', async () => {
    const urlsCalled: string[] = [];

    vi.stubGlobal('fetch', async (url: string) => {
      urlsCalled.push(url);
      if (url.includes('/about?fields=storageQuota')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ storageQuota: { limit: '15000000000', usage: '1000' } }),
        } as any;
      }
      if (url.includes('/drive/v3/files?q=')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ files: [{ id: 'folder-ok', name: 'LEECV' }] }),
        } as any;
      }
      if (url.includes('uploadType=multipart')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'file-mp-1', name: 'MiCV.pdf', size: 120 }),
        } as any;
      }
      if (url.includes('uploadType=resumable')) {
        return {
          ok: true,
          status: 200,
          headers: { get: (h: string) => (h.toLowerCase() === 'location' ? 'https://upload.drive.test/resumable/1' : null) },
          json: async () => ({}),
        } as any;
      }
      if (url === 'https://upload.drive.test/resumable/1') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'file-res-1', name: 'LibroGrande.pdf', size: 5_000_000 }),
        } as any;
      }
      throw new Error(`Fetch inesperado en test Drive: ${url}`);
    });

    await uploadFileToPersonalDrive({
      blob: new Blob(['hola'], { type: 'application/pdf' }),
      fileName: 'MiCV.pdf',
      folderKind: 'finished_docs',
      accessToken: 'fake-drive-token',
    });
    expect(urlsCalled.some((u) => u.includes('uploadType=multipart'))).toBe(true);

    const bigPayload = new Uint8Array(4 * 1024 * 1024 + 10);
    await uploadFileToPersonalDrive({
      blob: new Blob([bigPayload], { type: 'application/pdf' }),
      fileName: 'LibroGrande.pdf',
      folderKind: 'finished_docs',
      accessToken: 'fake-drive-token',
    });
    expect(urlsCalled.some((u) => u.includes('uploadType=resumable'))).toBe(true);
    expect(urlsCalled.includes('https://upload.drive.test/resumable/1')).toBe(true);
  });

  it('aborta con mensaje claro cuando Google Drive no tiene espacio disponible', async () => {
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.includes('/about?fields=storageQuota')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ storageQuota: { limit: '1000', usage: '995' } }),
        } as any;
      }
      return { ok: true, status: 200, json: async () => ({ files: [] }) } as any;
    });

    await expect(
      uploadFileToPersonalDrive({
        blob: new Blob(['contenido-mayor-a-5-bytes']),
        fileName: 'CV.pdf',
        folderKind: 'editable_drafts',
        accessToken: 'fake-drive-token',
      })
    ).rejects.toThrow(/espacio de Google Drive está lleno/i);
  });

  it('captura la última exportación descargada en memoria para subirla luego a Drive', () => {
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    recordLastExportedArtifact(blob, 'Libro.pdf');
    expect(getLastExportedArtifact()?.fileName).toBe('Libro.pdf');
  });
});
