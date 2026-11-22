import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { sanitizeEditorialData } from '../src/modules/editor-lee-studio/domain/sanitizeEditorialData';
import { DOC_TITLE_PREFIX, deriveDocumentTitle } from '../src/shared/core/documents/documentEngine/titleEngine';
import {
  isDraftDocumentId,
  inferDocTypeFromDraftId,
  getDraftIdForDocType,
  hasRealContent,
} from '../src/shared/core/documents/documentEngine/documentHelpers';

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
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-test-1' } } })),
    },
  },
  checkStorageStatus: vi.fn(),
}));

const listByUserSpy = vi.fn(async () => [
  { id: 'cloud-cv-1', title: 'CV en la nube', candidate_name: 'Ana', updated_at: new Date().toISOString() },
]);
const getByIdSpy = vi.fn(async () => ({ id: 'cloud-cv-1', personalInfo: { fullName: 'Ana' } }));

vi.mock('../src/shared/core/storage/dataAccessLayer', () => ({
  dal: {
    cvs: {
      listByUser: (...args: any[]) => listByUserSpy(...args),
      getById: (...args: any[]) => getByIdSpy(...args),
      upsert: vi.fn(async () => true),
      delete: vi.fn(async () => true),
    },
  },
}));

import {
  saveDocumentDraftLocal,
  loadDocumentById,
  getSavedEditorialsList,
} from '../src/shared/core/storage/documentStorageService';

describe('Fase 1 — EditorLee (montaje, prefijos, persistencia aislada y gating)', () => {
  beforeEach(() => {
    idbMemory.clear();
    listByUserSpy.mockClear();
    getByIdSpy.mockClear();

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

  it('sanitizeEditorialData es idempotente y rechaza cascarones sin estructura editorial', () => {
    expect(sanitizeEditorialData(null)).toBeNull();
    expect(sanitizeEditorialData({ id: 'doc_editorial_1', title: 'Solo título' })).toBeNull();
    expect(sanitizeEditorialData({ type: 'cv', personalInfo: { fullName: 'Ana' } })).toBeNull();

    const valid = {
      id: 'doc_editorial_1',
      type: 'editorial',
      metadata: { title: 'Manual de Pruebas', author: 'Kalpa' },
      sections: [
        {
          id: 'sec_1',
          title: 'Capítulo 1',
          records: [{ id: 'rec_1', type: 'paragraph', content: 'Texto inicial' }],
        },
      ],
    };

    const once = sanitizeEditorialData(valid);
    expect(once).not.toBeNull();
    expect(once?.type).toBe('editorial');
    expect(once?.sections).toHaveLength(1);
    expect(once?.sections[0].visible).toBe(true);
    expect(once?.sections[0].records[0].content).toBe('Texto inicial');
    expect(once?.tocConfig?.enabled).toBe(true);

    const twice = sanitizeEditorialData(once);
    expect(twice).toEqual(once);
  });

  it('soporta prefijos de título y borradores para editorial e invoice', () => {
    expect(DOC_TITLE_PREFIX.editorial).toBe('EditorLee');
    expect(deriveDocumentTitle('editorial', { id: 'draft_editorial' })).toMatch(/^EditorLee - /);

    expect(getDraftIdForDocType('editorial')).toBe('draft_editorial');
    expect(isDraftDocumentId('draft_editorial')).toBe(true);
    expect(inferDocTypeFromDraftId('draft_editorial')).toBe('editorial');

    expect(getDraftIdForDocType('invoice')).toBe('draft_invoice');
    expect(isDraftDocumentId('draft_invoice')).toBe(true);
    expect(inferDocTypeFromDraftId('draft_invoice')).toBe('invoice');

    expect(hasRealContent({ type: 'editorial', metadata: { title: 'Mi obra' }, sections: [] })).toBe(false);
    expect(
      hasRealContent({ type: 'editorial', metadata: { title: 'Tesis 2026' }, sections: [] })
    ).toBe(true);
  });

  it('guarda, lista y recarga un documento editorial en local sin migrateCvData ni contaminar Supabase/CV', async () => {
    const docId = 'doc_editorial_smoke_1';
    const editorialDoc = {
      id: docId,
      type: 'editorial',
      metadata: { title: 'Informe Anual', author: 'Equipo' },
      sections: [
        {
          id: 'ed_sec_1',
          title: 'Introducción',
          visible: true,
          includeInToc: true,
          startNewPage: true,
          position: 0,
          records: [{ id: 'ed_rec_1', type: 'paragraph', content: 'Resumen ejecutivo.' }],
        },
      ],
    };

    const saveRes = await saveDocumentDraftLocal(editorialDoc, 'editorial');
    expect(saveRes.success).toBe(true);
    expect(idbMemory.has(`doc_editorial_data_${docId}`)).toBe(true);
    expect(idbMemory.has(`cv_data_${docId}`)).toBe(false);

    const list = await getSavedEditorialsList();
    expect(list.some((item) => item.id === docId)).toBe(true);
    expect(list.some((item) => item.id === 'cloud-cv-1')).toBe(false);
    expect(listByUserSpy).not.toHaveBeenCalled();

    const loaded = await loadDocumentById(docId, 'editorial');
    expect(loaded).not.toBeNull();
    expect(loaded.type).toBe('editorial');
    expect(loaded.metadata.title).toBe('Informe Anual');
    expect(loaded.sections[0].records[0].content).toBe('Resumen ejecutivo.');
    expect(loaded.personalInfo).toBeUndefined();
    expect(getByIdSpy).not.toHaveBeenCalled();
  });

  it('verifica montaje de ruta /crear-editor, menú "+" y gating de crédito sin bypass', () => {
    const root = process.cwd();
    const appSrc = fs.readFileSync(path.join(root, 'src/app/App.tsx'), 'utf8');
    const appRegistrySrc = fs.readFileSync(path.join(root, 'src/app/appRegistry.ts'), 'utf8');
    const menuSrc = fs.readFileSync(path.join(root, 'src/shared/core/ui/NewDocumentMenu.tsx'), 'utf8');
    const studioSrc = fs.readFileSync(
      path.join(root, 'src/modules/editor-lee-studio/EditorLeeStudioContent.tsx'),
      'utf8'
    );

    expect(appRegistrySrc).toContain("'/crear-editor'");
    expect(appRegistrySrc).toContain('EditorLeeStudioContent');
    expect(appSrc).toContain('<StudioRoute');
    expect(appSrc).toContain('findStandaloneStudioByRoute');
    expect(appSrc).toContain('handleNewDocument');

    expect(menuSrc).toContain('onSelectEditorial');
    expect(menuSrc).toContain('ALL_DOCUMENT_TYPE_IDS');

    expect(studioSrc).toContain('consumeCreditIfNeeded');
    expect(studioSrc).toContain('<PdfCheckoutModal');
    expect(studioSrc).toContain("saveDocumentDraftLocal(fullDoc, 'editorial')");
    expect(studioSrc).not.toMatch(/saveDocumentDraftLocal\(\{\s*id:\s*editorialId,\s*title:\s*editorialTitle\s*\}\)/);
  });
});
