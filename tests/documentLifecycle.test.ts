import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBlankCVTemplate } from '../src/data/initialCVData';
import { 
  generateDocumentId, 
  addOpenTab, 
  getOpenTabs, 
  closeDocumentEverywhere,
  saveOpenTabs
} from '../src/shared/core/storage/documentTabEngine';

describe('documentLifecycle (Gestión de Documentos & Pestañas)', () => {
  beforeEach(() => {
    let store: Record<string, string> = {};
    const localStorageMock = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value.toString(); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
    };
    vi.stubGlobal('window', { localStorage: localStorageMock });
    vi.stubGlobal('localStorage', localStorageMock);
    saveOpenTabs([]);
  });

  it('nunca reusa el mismo id entre dos CVs en blanco distintos', () => {
    const docA = createBlankCVTemplate();
    const docB = createBlankCVTemplate();

    expect(docA.id).toBeDefined();
    expect(docB.id).toBeDefined();
    expect(docA.id).not.toBe(docB.id);
    expect(docA.id.startsWith('cv_')).toBe(true);
    expect(docB.id.startsWith('cv_')).toBe(true);
  });

  it('genera prefijos correctos para tarjeta personal y libro', () => {
    const cardDoc = createBlankCVTemplate({ activePresetId: 'tarjeta-personal' });
    const bookId = generateDocumentId('book');

    expect(cardDoc.id.startsWith('card_')).toBe(true);
    expect(bookId.startsWith('book_')).toBe(true);
  });

  it('closeDocumentEverywhere quita la pestaña de localStorage y ejecuta el borrado físico si se solicita', async () => {
    const idToDelete = generateDocumentId('cv');
    const idToKeep = generateDocumentId('cv');

    addOpenTab(idToDelete, 'Doc A Eliminar');
    addOpenTab(idToKeep, 'Doc B Conservar');

    expect(getOpenTabs().length).toBe(2);

    const deleteMock = vi.fn().mockResolvedValue(undefined);

    const remaining = await closeDocumentEverywhere(idToDelete, {
      alsoDeleteFromStorage: true,
      deleteCVById: deleteMock,
    });

    expect(deleteMock).toHaveBeenCalledWith(idToDelete);
    expect(remaining.length).toBe(1);
    expect(remaining[0].cvId).toBe(idToKeep);
    expect(getOpenTabs().map(t => t.cvId)).not.toContain(idToDelete);
  });

  it('ARQUITECTURA DE PESTAÑAS Y DESACOPLAMIENTO — workspaceController y tabStore gestionan el cierre sin banderas frágiles ni resucitar pestañas', async () => {
    const { closeTab, openTab, getOpenTabs } = await import('../src/shared/core/documents/tabStore');
    const { saveDocument } = await import('../src/shared/core/storage/documentStorageService');

    const closedId = generateDocumentId('cv');
    const otherId = generateDocumentId('cv');

    openTab(closedId, 'cv', 'Documento que se cierra');
    openTab(otherId, 'cv', 'Otro documento');
    expect(getOpenTabs().map(t => t.id)).toContain(closedId);

    // 1. Cierre de pestaña en tabStore
    closeTab(closedId);
    expect(getOpenTabs().map(t => t.id)).not.toContain(closedId);

    // 2. Guardar un documento NUNCA resucita pestañas en el nuevo motor desacoplado
    await saveDocument({ id: closedId, doc_type_id: 'cv', personalInfo: { fullName: 'Test' } }, 'cv');
    expect(getOpenTabs().map(t => t.id)).not.toContain(closedId);
  });
});
