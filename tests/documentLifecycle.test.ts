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

  it('REGRESIÓN — guardar el documento recién cerrado lo resucita en cv_open_tabs (mecanismo real del bug "cierro y no cierra"). Confirma por qué handleSwitchDocumentTab en App.tsx necesita saltear el guardado del documento saliente cuando el cambio de pestaña viene de un cierre, no de un click normal.', () => {
    const closedId = generateDocumentId('cv');
    const otherId = generateDocumentId('cv');

    addOpenTab(closedId, 'Documento que se cierra');
    addOpenTab(otherId, 'Otro documento');
    expect(getOpenTabs().map(t => t.cvId)).toContain(closedId);

    // Paso 1: se cierra la pestaña — se quita de cv_open_tabs (comportamiento correcto)
    const afterClose = closeDocumentEverywhere(closedId, { alsoDeleteFromStorage: false });
    return afterClose.then((remaining) => {
      expect(remaining.map(t => t.cvId)).not.toContain(closedId);
      expect(getOpenTabs().map(t => t.cvId)).not.toContain(closedId);

      // Paso 2: si algo vuelve a guardar el documento que se acaba de cerrar (el bug real:
      // handleSwitchDocumentTab llamaba a saveCV() sobre el documento saliente ANTES de
      // cargar el siguiente), documentStorageService.ts llama a syncTabTitleFromSave(id, ...)
      // como parte de cada guardado — y eso vuelve a agregar la pestaña que se acababa de
      // quitar. Se simula acá ese efecto secundario directamente con addOpenTab (lo que
      // syncTabTitleFromSave termina llamando) para probar el mecanismo, sin necesitar
      // levantar todo App.tsx.
      addOpenTab(closedId, 'Documento que se cierra'); // esto es lo que NO debe volver a pasar
      expect(getOpenTabs().map(t => t.cvId)).toContain(closedId); // demuestra que el mecanismo de resurrección es real
    });
  });

  it('REGRESIÓN estática — App.tsx: resolveNextActiveDocument debe pasar skipSaveCurrent:true al cambiar de pestaña tras un cierre, para no disparar el guardado que resucita la pestaña recién cerrada (ver test anterior)', () => {
    const fs = require('fs');
    const path = require('path');
    const appTsxPath = path.join(__dirname, '../src/app/App.tsx');
    const content = fs.readFileSync(appTsxPath, 'utf-8');

    const resolveFnMatch = content.match(/const resolveNextActiveDocument = async[\s\S]*?\n  };/);
    expect(resolveFnMatch).toBeTruthy();
    const resolveFnBody = resolveFnMatch![0];

    expect(resolveFnBody).toContain('handleSwitchDocumentTab');
    expect(resolveFnBody).toMatch(/handleSwitchDocumentTab\([^)]*skipSaveCurrent:\s*true[^)]*\)/);
  });
});
