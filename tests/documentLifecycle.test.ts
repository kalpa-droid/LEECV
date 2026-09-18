import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBlankCVTemplate } from '../src/data/initialCVData';
import { 
  generateDocumentId, 
  openTab, 
  getOpenTabs, 
  closeTab
} from '../src/shared/core/documents/tabStore';

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
    localStorage.clear();
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

  it('closeTab quita la pestaña de localStorage sin afectar la persistencia de datos', async () => {
    const idToDelete = generateDocumentId('cv');
    const idToKeep = generateDocumentId('cv');

    openTab(idToDelete, 'cv', 'Doc A Eliminar');
    openTab(idToKeep, 'cv', 'Doc B Conservar');

    expect(getOpenTabs().length).toBe(2);

    const remaining = closeTab(idToDelete);

    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe(idToKeep);
    expect(getOpenTabs().map(t => t.id)).not.toContain(idToDelete);
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

  it('isProvisionalDocument entiende el documento completo y el resumen de la lista', async () => {
    const { isProvisionalDocument } = await import('../src/shared/core/documents/documentLifecycleEngine');
    expect(isProvisionalDocument({ isProvisional: false })).toBe(false);
    expect(isProvisionalDocument({ is_provisional: false })).toBe(false);
    expect(isProvisionalDocument({ is_provisional: true })).toBe(true);
    expect(isProvisionalDocument({ id: 'cv_viejo' })).toBe(true);
  });

  it('REGRESIÓN — CVContext.tsx arranca con el id fijo de borrador (getDraftIdForDocType), no uno generado al azar. Causa real de "edito un CV recién abierto y no veo ninguna pestaña": con un id aleatorio, el sincronizador de ruta en App.tsx salía temprano (route ya coincide con docType en el primer render) y nunca se llegaba a workspaceController.switchToTab, el único lugar que registra la pestaña de un id de borrador desconocido.', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const contextPath = path.join(__dirname, '../src/context/CVContext.tsx');
    const content = fs.readFileSync(contextPath, 'utf-8');

    const initialStateMatch = content.match(/const \[cvData, setCvDataState\] = useState<CVData>\(\(\) => \{[\s\S]*?\n  \}\);/);
    expect(initialStateMatch).toBeTruthy();
    const initialStateBody = initialStateMatch![0];

    expect(initialStateBody).toContain('getDraftIdForDocType');
    expect(initialStateBody).toMatch(/createBlankCVTemplate\(\{\s*\n?\s*id:\s*getDraftIdForDocType/);
  });

  it('REGRESIÓN — App.tsx registra explícitamente la pestaña del documento inicial al montar, en vez de depender del sincronizador pasivo (que solo actualiza pestañas ya existentes)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const appPath = path.join(__dirname, '../src/app/App.tsx');
    const content = fs.readFileSync(appPath, 'utf-8');

    expect(content).toContain('didRegisterInitialTabRef');
    expect(content).toMatch(/Registro explícito de la pestaña del documento inicial/);
  });
});
