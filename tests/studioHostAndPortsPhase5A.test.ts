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

vi.mock('../src/shared/core/lib/supabaseClient', () => ({
  supabase: null,
  checkStorageStatus: vi.fn(),
}));

import {
  extractContactProfileFromCv,
  listAvailablePortSources,
  resolvePortFromDocument,
  selectContactProfileFields,
  checkPortSourceOutdated,
} from '../src/shared/core/ports/portBroker';
import { PORT_CONTACT_PROFILE_V1 } from '../src/shared/contracts/ports/contactProfile';
import { localDocumentStore } from '../src/shared/core/storage/localDocumentStore';
import { wrapDocumentEnvelope } from '../src/shared/core/storage/documentEnvelope';
import {
  registerBlankDocumentFactory,
  switchToTab,
} from '../src/shared/core/documents/workspaceController';

describe('Fase 5A — D14 cerrado, PortBroker (contact-profile@1) y desacoplamiento del tronco', () => {
  beforeEach(() => {
    idbMemory.clear();
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

  it('PortBroker (contact-profile@1): Tarjeta lee un CV local, elige campos selectivos y detecta cambios de revisión', async () => {
    const cvPayload = {
      id: 'cv_port_source_1',
      doc_type_id: 'cv',
      title: 'Diseñadora Industrial',
      personalInfo: {
        fullName: 'Valeria Suárez',
        email: 'valeria@studio.ar',
        phone: '+54 9 11 4444-5555',
        website: 'https://valeriasuarez.ar',
        cityProvince: 'Córdoba, Argentina',
        profilePhoto: 'asset://foto_hash_01',
      },
      profession: [{ title: 'Diseñadora Industrial' }],
      experience: [{ company: 'Estudio Sur', role: 'Líder de Diseño' }],
      redes: [{ plataforma: 'LinkedIn', url: 'https://linkedin.com/in/valeriasuarez' }],
    };

    await localDocumentStore.save(
      wrapDocumentEnvelope({
        id: 'cv_port_source_1',
        docType: 'cv',
        title: 'CV - Valeria Suárez',
        displaySubtitle: 'Valeria Suárez',
        payload: cvPayload,
      })
    );

    const sources = await listAvailablePortSources(PORT_CONTACT_PROFILE_V1);
    expect(sources).toHaveLength(1);
    expect(sources[0].docId).toBe('cv_port_source_1');
    expect(sources[0].revision).toBe(1);

    const resolved = await resolvePortFromDocument(PORT_CONTACT_PROFILE_V1, 'cv', 'cv_port_source_1');
    expect(resolved).not.toBeNull();
    expect(resolved!.data.fullName).toBe('Valeria Suárez');
    expect(resolved!.data.company).toBe('Estudio Sur');
    expect(resolved!.data.linkedin).toBe('https://linkedin.com/in/valeriasuarez');
    expect(resolved!.data.photoAssetUri).toBe('asset://foto_hash_01');

    // El usuario elige importar SOLO nombre, rol y email (omite teléfono y dirección)
    const { picked, sourceRef } = selectContactProfileFields(
      resolved!.data,
      ['fullName', 'role', 'email'],
      { docId: resolved!.docId, docType: 'cv', revision: resolved!.revision }
    );
    expect(picked).toEqual({
      fullName: 'Valeria Suárez',
      role: 'Diseñadora Industrial',
      email: 'valeria@studio.ar',
    });
    expect(sourceRef.importedFields).toEqual(['fullName', 'role', 'email']);
    expect(sourceRef.sourceRevision).toBe(1);

    // Antes de editar el CV, la tarjeta está al día
    const upToDate = await checkPortSourceOutdated(sourceRef);
    expect(upToDate.outdated).toBe(false);

    // Al guardar una nueva revisión del CV, el broker detecta el desfase para ofrecer "Actualizar desde el CV"
    await localDocumentStore.save(
      wrapDocumentEnvelope({
        id: 'cv_port_source_1',
        docType: 'cv',
        title: 'CV - Valeria Suárez',
        payload: { ...cvPayload, personalInfo: { ...cvPayload.personalInfo, role: 'Directora de Diseño' } },
      })
    );
    const outdated = await checkPortSourceOutdated(sourceRef);
    expect(outdated.outdated).toBe(true);
    expect(outdated.latestRevision).toBe(2);
  });

  it('extractContactProfileFromCv ignora fotos base64 crudas (solo acepta asset://) y no rompe con datos vacíos', () => {
    const profile = extractContactProfileFromCv({
      personalInfo: { fullName: 'Juan', profilePhoto: 'data:image/png;base64,AAA' },
    });
    expect(profile.fullName).toBe('Juan');
    expect(profile.photoAssetUri).toBeUndefined();
    expect(extractContactProfileFromCv(null)).toEqual({});
  });

  it('workspaceController usa fábrica registrada por inversión de dependencias (sin importar initialCVData)', async () => {
    const customFactory = vi.fn(({ id, docTypeId }) => ({
      id,
      doc_type_id: docTypeId,
      fromCustomFactory: true,
    }));
    registerBlankDocumentFactory(customFactory);

    const setCvData = vi.fn();
    const ok = await switchToTab('draft_cv', null, setCvData, {
      saveCurrentIfDirty: false,
      targetDocType: 'cv',
    });

    expect(ok).toBe(true);
    expect(customFactory).toHaveBeenCalledWith({ id: 'draft_cv', docTypeId: 'cv' });
    expect(setCvData).toHaveBeenCalledWith(expect.objectContaining({ fromCustomFactory: true }));
  });
});
