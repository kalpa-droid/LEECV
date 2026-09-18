import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBlankCVTemplate } from '../src/data/initialCVData';
import { 
  openTab, 
  getOpenTabs, 
  closeTab
} from '../src/shared/core/documents/tabStore';
import { generateDocumentId } from '../src/shared/core/documents/documentEngine/titleEngine';
import { isProvisionalDocument } from '../src/shared/core/documents/documentEngine';

describe('documentLifecycle (Gestión de Documentos & Pestañas)', () => {
  beforeEach(async () => {
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

    const driveBackup = await import('../src/shared/core/storage/driveBackupService');
    vi.spyOn(driveBackup, 'backupCvToGoogleDrive').mockImplementation(async () => true as any);
  });

  it('genera prefijos correctos con generateDocumentId', () => {
    const cardId = generateDocumentId('business_card');
    const bookId = generateDocumentId('book');

    expect(cardId.startsWith('doc_business_card_')).toBe(true);
    expect(bookId.startsWith('doc_book_')).toBe(true);
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
    const { generateDocumentId } = await import('../src/shared/core/documents/documentEngine/titleEngine');

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

  it('isProvisionalDocument revisa flag', () => {
    expect(isProvisionalDocument({ isProvisional: false })).toBe(false);
    expect(isProvisionalDocument({ isProvisional: true })).toBe(true);
  });

  it('REGRESIÓN — CVContext.tsx arranca con el id fijo de borrador (getDraftIdForDocType), no uno generado al azar.', async () => {
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
});
