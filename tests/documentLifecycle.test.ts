import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBlankCVTemplate } from '../src/data/initialCVData';
import { 
  generateDocumentId, 
  addOpenTab, 
  getOpenTabs, 
  closeDocumentEverywhere,
  syncTabTitleFromSave,
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

  it('REGRESIÓN: guardar el documento recién cerrado (clausura vieja de saveCV) no debe resucitar su pestaña', async () => {
    // Reproduce el bug real: cerrar una pestaña, y justo después (como pasa
    // en handleSwitchDocumentTab, que llama a saveCV() sobre el cvData
    // todavía viejo ANTES de cargar el documento al que se está cambiando)
    // el motor recibe un intento de guardado para el documento que se
    // acaba de cerrar. Eso nunca debe volver a agregarlo a la lista.
    const closedId = generateDocumentId('cv');
    const otherId = generateDocumentId('cv');

    addOpenTab(closedId, 'Doc que se cierra');
    addOpenTab(otherId, 'Doc que queda');
    expect(getOpenTabs().length).toBe(2);

    const remaining = await closeDocumentEverywhere(closedId, { alsoDeleteFromStorage: false });
    expect(remaining.map(t => t.cvId)).not.toContain(closedId);

    // Este es el paso que las 10 correcciones anteriores no simulaban:
    // el guardado automático del documento recién cerrado, disparado por
    // la clausura vieja de cvData en saveCV().
    const afterSave = syncTabTitleFromSave(closedId, 'Doc que se cierra', 'cv');

    expect(afterSave.map(t => t.cvId)).not.toContain(closedId);
    expect(getOpenTabs().map(t => t.cvId)).not.toContain(closedId);
    expect(getOpenTabs().map(t => t.cvId)).toContain(otherId);
  });
});
