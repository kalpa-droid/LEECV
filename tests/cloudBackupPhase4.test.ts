import { describe, it, expect, vi, beforeEach } from 'vitest';

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

const remoteBackupSelectResult = vi.fn();
const remoteBackupUpsertSpy = vi.fn(async () => ({ error: null }));
const remotePrefsUpsertSpy = vi.fn(async () => ({ error: null }));
const remoteRestoreRowsMock = vi.fn();

vi.mock('../src/shared/core/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-cloud-optin-1' } } })),
    },
    from: vi.fn((table: string) => {
      if (table === 'user_preferences') {
        return {
          upsert: (payload: any) => remotePrefsUpsertSpy(payload),
        };
      }
      if (table === 'document_backups') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => remoteBackupSelectResult(),
              }),
              order: () => remoteRestoreRowsMock(),
            }),
          }),
          upsert: (payload: any) => remoteBackupUpsertSpy(payload),
        };
      }
      return {};
    }),
  },
  checkStorageStatus: vi.fn(),
}));

import {
  getCloudBackupProjector,
  validateCloudBackupProjection,
} from '../src/shared/core/storage/cloudBackupProjections';
import {
  isCloudBackupOptInEnabled,
  setCloudBackupOptInEnabled,
  replicateDocumentBackupIfEnabled,
  restoreCloudBackupsToLocal,
} from '../src/shared/core/storage/cloudBackupReplicator';
import { wrapDocumentEnvelope } from '../src/shared/core/storage/documentEnvelope';
import { localDocumentStore } from '../src/shared/core/storage/localDocumentStore';

describe('Fase 4 — Respaldo en nube opt-in (proyecciones de texto, guardas y concurrencia)', () => {
  beforeEach(() => {
    idbMemory.clear();
    remoteBackupSelectResult.mockReset();
    remoteBackupUpsertSpy.mockClear();
    remotePrefsUpsertSpy.mockClear();
    remoteRestoreRowsMock.mockReset();

    const store: Record<string, string> = {};
    const ls = {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = String(v);
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
    };
    vi.stubGlobal('localStorage', ls);
    vi.stubGlobal('window', { localStorage: ls });
  });

  it('proyección de CV extrae SOLO texto estructurado (sin diseño, sin foto, sin firma)', () => {
    const projector = getCloudBackupProjector('cv')!;
    const rawCv = {
      id: 'cv_1',
      activePresetId: 'modern-corporate',
      colorPresetId: 'emerald-pro',
      theme: { primaryColor: '#123456' },
      personalInfo: {
        fullName: 'Martín Gómez',
        email: 'martin@example.com',
        profilePhoto: 'data:image/png;base64,AAAA',
        digitalSignature: 'asset://sig_hash_123',
      },
      experience: [{ company: 'Acme', role: 'Ingeniero', logo: 'data:image/png;base64,BBBB' }],
    };

    const projection = projector.toCloudProjection(rawCv);
    expect((projection as any).activePresetId).toBeUndefined();
    expect((projection as any).colorPresetId).toBeUndefined();
    expect((projection as any).theme).toBeUndefined();
    expect((projection.personalInfo as any).profilePhoto).toBeUndefined();
    expect((projection.personalInfo as any).digitalSignature).toBeUndefined();
    expect((projection.personalInfo as any).fullName).toBe('Martín Gómez');
    expect((projection.experience as any)[0].logo).toBeUndefined();

    const check = validateCloudBackupProjection('cv', projection);
    expect(check.valid).toBe(true);
  });

  it('validateCloudBackupProjection rechaza FacturLee, libros, binarios/asset:// y exceso de bytes', () => {
    expect(validateCloudBackupProjection('invoice', { total: 100 }).valid).toBe(false);
    expect(validateCloudBackupProjection('book', { title: 'Libro' }).valid).toBe(false);
    expect(validateCloudBackupProjection('editorial', { title: 'Obra' }).valid).toBe(false);
    expect(validateCloudBackupProjection('planner', { year: 2026 }).valid).toBe(false);

    expect(
      validateCloudBackupProjection('cv', {
        personalInfo: { fullName: 'data:image/png;base64,AAAA' },
      }).valid
    ).toBe(false);

    expect(
      validateCloudBackupProjection('cv', {
        personalInfo: { fullName: 'asset://hash_123' },
      }).valid
    ).toBe(false);

    expect(
      validateCloudBackupProjection('business_card', {
        personalInfo: { summary: 'X'.repeat(20000) }, // excede 16 KB
      }).valid
    ).toBe(false);
  });

  it('opt-in apagado por defecto; al activarlo replica solo texto y detecta conflicto por revisión', async () => {
    expect(isCloudBackupOptInEnabled()).toBe(false);

    const env = wrapDocumentEnvelope({
      id: 'cv_optin_1',
      docType: 'cv',
      title: 'CV - Martín',
      payload: { personalInfo: { fullName: 'Martín' } },
      previousRevision: 1, // revision = 2
    });

    const disabledRes = await replicateDocumentBackupIfEnabled(env);
    expect(disabledRes.status).toBe('disabled');
    expect(remoteBackupUpsertSpy).not.toHaveBeenCalled();

    // Activar opt-in
    await setCloudBackupOptInEnabled(true);
    expect(isCloudBackupOptInEnabled()).toBe(true);
    expect(remotePrefsUpsertSpy).toHaveBeenCalledTimes(1);

    // Caso 1: sin conflicto -> respalda
    remoteBackupSelectResult.mockResolvedValueOnce({ data: { revision: 1 }, error: null });
    const okRes = await replicateDocumentBackupIfEnabled(env);
    expect(okRes.status).toBe('backed-up');
    expect(remoteBackupUpsertSpy).toHaveBeenCalledTimes(1);

    // Caso 2: remoto tiene revisión mayor -> conflicto, NO sobrescribe
    remoteBackupSelectResult.mockResolvedValueOnce({ data: { revision: 5 }, error: null });
    const conflictRes = await replicateDocumentBackupIfEnabled(env);
    expect(conflictRes.status).toBe('conflict');
    expect(conflictRes.remoteRevision).toBe(5);
    expect(remoteBackupUpsertSpy).toHaveBeenCalledTimes(1);

    // FacturLee nunca replica aunque opt-in esté ON
    const invEnv = wrapDocumentEnvelope({
      id: 'inv_1',
      docType: 'invoice',
      title: 'Factura',
      payload: { cliente: 'Secreto' },
    });
    const invRes = await replicateDocumentBackupIfEnabled(invEnv);
    expect(invRes.status).toBe('not-eligible');
  });

  it('restoreCloudBackupsToLocal restaura en equipo nuevo y respeta copias locales más recientes', async () => {
    // Guardar copia local más nueva para cv_keep_local (revision 4)
    await localDocumentStore.save(
      wrapDocumentEnvelope({
        id: 'cv_keep_local',
        docType: 'cv',
        title: 'CV Local Más Nuevo',
        payload: { personalInfo: { fullName: 'Versión Local' } },
        previousRevision: 3, // revision = 4
      })
    );

    remoteRestoreRowsMock.mockResolvedValueOnce({
      data: [
        {
          doc_id: 'cv_restore_new',
          doc_type: 'cv',
          schema_version: 2,
          revision: 2,
          title: 'CV Respaldado',
          projection: { personalInfo: { fullName: 'Sofía Remota' } },
          updated_at: new Date().toISOString(),
        },
        {
          doc_id: 'cv_keep_local',
          doc_type: 'cv',
          schema_version: 2,
          revision: 2,
          title: 'CV Viejo',
          projection: { personalInfo: { fullName: 'Versión Vieja' } },
          updated_at: new Date().toISOString(),
        },
      ],
      error: null,
    });

    const summary = await restoreCloudBackupsToLocal(() => ({ activePresetId: 'cv-clasico' }));
    expect(summary.restoredCount).toBe(1);
    expect(summary.conflictsKeptLocal).toBe(1);

    const restored = await localDocumentStore.load<any>('cv_restore_new', 'cv');
    expect(restored?.payload.personalInfo.fullName).toBe('Sofía Remota');
    expect(restored?.payload.activePresetId).toBe('cv-clasico');

    const kept = await localDocumentStore.load<any>('cv_keep_local', 'cv');
    expect(kept?.payload.personalInfo.fullName).toBe('Versión Local');
  });
});
