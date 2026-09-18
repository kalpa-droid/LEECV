import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOpenTabs, openTab, closeTab, updateTabTitle, getActiveTabId } from '../src/shared/core/documents/tabStore';
import { ensureDocumentTab } from '../src/shared/core/documents/workspaceController';

/**
 * Motor de pestañas — comportamiento real (no greps del código fuente).
 * Regresión: tras Document Engine v5 la barra quedaba vacía ("edito un CV y no veo
 * ninguna pestaña") y por eso el renombrado automático no tenía nada que renombrar.
 */
describe('motor de pestañas', () => {
  beforeEach(() => {
    let store: Record<string, string> = {};
    const localStorageMock = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = String(v); },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { store = {}; },
    };
    vi.stubGlobal('window', { localStorage: localStorageMock });
    vi.stubGlobal('localStorage', localStorageMock);
  });

  it('ensureDocumentTab crea la pestaña del documento inicial cuando el almacén está vacío', () => {
    expect(getOpenTabs()).toHaveLength(0);

    const tabs = ensureDocumentTab('draft_cv', 'cv', { personalInfo: {} });

    expect(tabs).toHaveLength(1);
    expect(tabs[0].id).toBe('draft_cv');
    expect(tabs[0].docType).toBe('cv');
    expect(tabs[0].title).toBe('Mi Currículum Vitae');
    expect(getActiveTabId()).toBe('draft_cv');
  });

  it('ensureDocumentTab es idempotente y no pisa una pestaña ya existente', () => {
    openTab('draft_cv', 'cv', 'Mi título propio');
    ensureDocumentTab('draft_cv', 'cv', { personalInfo: { surname: 'Burgos' } });
    ensureDocumentTab('draft_cv', 'cv', { personalInfo: { surname: 'Burgos' } });

    const tabs = getOpenTabs();
    expect(tabs).toHaveLength(1);
    expect(tabs[0].title).toBe('Mi título propio');
  });

  it('el título inicial ya refleja el nombre si el documento restaurado lo tiene', () => {
    const tabs = ensureDocumentTab('doc_cv_1', 'cv', { personalInfo: { givenNames: 'Mónica', surname: 'Burgos' } });
    expect(tabs[0].title).toBe('Mi Currículum Vitae de Mónica Burgos');
  });

  it('ensureDocumentTab con documento cargado desde "Mis archivos" agrega su pestaña y la marca activa', () => {
    ensureDocumentTab('draft_cv', 'cv', {});
    const tabs = ensureDocumentTab('doc_cv_guardado', 'cv', { personalInfo: { surname: 'Pérez' } });
    expect(tabs.map(t => t.id)).toEqual(['draft_cv', 'doc_cv_guardado']);
    expect(getActiveTabId()).toBe('doc_cv_guardado');
    ensureDocumentTab('draft_cv', 'cv', {});
    expect(getActiveTabId()).toBe('draft_cv');
    expect(getOpenTabs()).toHaveLength(2);
  });

  it('updateTabTitle renombra una pestaña existente', () => {
    ensureDocumentTab('draft_cv', 'cv', { personalInfo: {} });
    updateTabTitle('draft_cv', 'Mi Currículum Vitae de Burgos');
    expect(getOpenTabs()[0].title).toBe('Mi Currículum Vitae de Burgos');
  });

  it('updateTabTitle NO crea pestañas: sin pestaña registrada el renombrado no hace nada (causa del bug)', () => {
    updateTabTitle('draft_cv', 'Mi Currículum Vitae de Burgos');
    expect(getOpenTabs()).toHaveLength(0);
  });

  it('cerrar la pestaña no la resucita salvo que se llame de nuevo a ensureDocumentTab (por eso es de una sola vez)', () => {
    ensureDocumentTab('draft_cv', 'cv', {});
    closeTab('draft_cv');
    expect(getOpenTabs()).toHaveLength(0);
  });

  it('GUARDIA DE CABLEADO — App.tsx hidrata las pestañas y registra la inicial al montar', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const app = fs.readFileSync(path.join(__dirname, '../src/app/App.tsx'), 'utf-8');
    expect(app).toMatch(/useState<OpenTabItem\[\]>\(\(\) => getOpenTabs\(\)\)/);
    expect(app).toContain('workspaceController.ensureDocumentTab(');
    expect(app).toContain('didRegisterInitialTabRef');
    expect(app).toContain('updateTabTitle(activeCvId');
  });
});
