import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOpenTabs, openTab, closeTab, updateTabTitle, getActiveTabId } from '../src/shared/core/documents/tabStore';
import { ensureDocumentTab } from '../src/shared/core/documents/workspaceController';
import { deriveDocumentTitle, formatCompactDateTime } from '../src/shared/core/documents/documentEngine/titleEngine';

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
    expect(tabs[0].title).toMatch(/^CV - \d{2}\/\d{2} \d{2}:\d{2}:\d{2}\.\d$/);
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
    expect(tabs[0].title).toBe('CV - Mónica Burgos - Base');
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
    updateTabTitle('draft_cv', 'CV - Burgos');
    expect(getOpenTabs()[0].title).toBe('CV - Burgos');
  });

  it('updateTabTitle NO crea pestañas: sin pestaña registrada el renombrado no hace nada (causa del bug)', () => {
    updateTabTitle('draft_cv', 'CV - Burgos');
    expect(getOpenTabs()).toHaveLength(0);
  });

  it('cerrar la pestaña no la resucita salvo que se llame de nuevo a ensureDocumentTab (por eso es de una sola vez)', () => {
    ensureDocumentTab('draft_cv', 'cv', {});
    closeTab('draft_cv');
    expect(getOpenTabs()).toHaveLength(0);
  });

  it('AppShell no oculta la barra de pestañas en mobile (regresión b22f6e1: hidden md:block)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const shell = fs.readFileSync(path.join(__dirname, '../src/shared/core/ui/AppShell.tsx'), 'utf-8');
    const idx = shell.indexOf('<DocumentTabsBar');
    expect(idx).toBeGreaterThan(0);
    expect(shell.slice(Math.max(0, idx - 120), idx)).not.toContain('hidden md:block');
  });

  it('GUARDIA DE CABLEADO — App.tsx delega en useDocumentTabs para hidratar, registrar y actualizar pestañas', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const app = fs.readFileSync(path.join(__dirname, '../src/app/App.tsx'), 'utf-8');
    const hook = fs.readFileSync(path.join(__dirname, '../src/shared/core/documents/useDocumentTabs.ts'), 'utf-8');

    expect(app).toContain('useDocumentTabs({');
    expect(hook).toMatch(/useState<OpenTabItem\[\]>\(\(\) => getOpenTabs\(\)\)/);
    expect(hook).toContain('ensureDocumentTab(');
    expect(hook).toContain('didRegisterInitialTabRef');
    expect(hook).toContain('updateTabTitle(');
  });
});

describe('formato de título (titleEngine)', () => {
  it('formatCompactDateTime => DD/MM HH:mm:ss.d con décima de segundo', () => {
    expect(formatCompactDateTime(new Date(2026, 8, 18, 11, 38, 15, 456))).toBe('18/09 11:38:15.4');
    expect(formatCompactDateTime(new Date(2026, 0, 5, 3, 4, 5, 99))).toBe('05/01 03:04:05.0');
  });

  it('sin nombre: prefijo por tipo + sello tomado del id (congelado, determinista)', () => {
    const id = 'doc_cv_20260918_113815_4_abc';
    expect(deriveDocumentTitle('cv', { id })).toBe('CV - 18/09 11:38:15.4');
    expect(deriveDocumentTitle('business_card', { id: 'doc_card_20260918_113815_4_abc' })).toBe('Tarjeta - 18/09 11:38:15.4');
    expect(deriveDocumentTitle('cover_letter', { id: 'doc_cover_letter_20260918_113815_4_abc' })).toBe('Carta - 18/09 11:38:15.4');
  });

  it('con nombre: "CV - Nombre Apellido - Base"; Tarjeta sin "Base" (no versiona por puesto)', () => {
    const doc = { id: 'draft_cv', personalInfo: { givenNames: 'José Ramiro', surname: 'Burgos' } };
    expect(deriveDocumentTitle('cv', doc)).toBe('CV - José Ramiro Burgos - Base');
    expect(deriveDocumentTitle('business_card', doc)).toBe('Tarjeta - José Ramiro Burgos');
    expect(deriveDocumentTitle('cover_letter', doc)).toBe('Carta - José Ramiro Burgos - Base');
    expect(deriveDocumentTitle('cv', { id: 'x', personalInfo: { fullName: 'Ana Gómez' } })).toBe('CV - Ana Gómez - Base');
  });

  it('borrador de id fijo: el sello se congela en el título y NO cambia al recalcular', () => {
    const first = deriveDocumentTitle('cv', { id: 'draft_cv' });
    expect(first).toMatch(/^CV - \d{2}\/\d{2} \d{2}:\d{2}:\d{2}\.\d$/);
    expect(deriveDocumentTitle('cv', { id: 'draft_cv', title: first })).toBe(first);
  });

  it('si se borra el nombre, vuelve al sello original del id', () => {
    const id = 'doc_cv_20260918_113815_4_abc';
    const named = { id, title: 'CV - Burgos', personalInfo: { surname: 'Burgos' } };
    expect(deriveDocumentTitle('cv', named)).toBe('CV - Burgos - Base');
    expect(deriveDocumentTitle('cv', { ...named, personalInfo: {} })).toBe('CV - 18/09 11:38:15.4');
  });

  it('Libro: inmutable, nunca toma el nombre', () => {
    const id = 'doc_book_20260918_113815_4_abc';
    const t = deriveDocumentTitle('book', { id, personalInfo: { surname: 'Burgos' } });
    expect(t).toBe('Libro - 18/09 11:38:15.4');
  });

  it('copia con versión: "CV - Nombre — Puesto" reemplaza a "Base"; solo en documentos versionables', () => {
    const doc = { id: 'doc_cv_1', personalInfo: { givenNames: 'José Ramiro', surname: 'Burgos' }, version_label: 'Desarrollador Frontend' };
    expect(deriveDocumentTitle('cv', doc)).toBe('CV - José Ramiro Burgos — Desarrollador Frontend');
    expect(deriveDocumentTitle('cover_letter', doc)).toBe('Carta - José Ramiro Burgos — Desarrollador Frontend');
    expect(deriveDocumentTitle('business_card', doc)).toBe('Tarjeta - José Ramiro Burgos');
    expect(deriveDocumentTitle('book', doc)).toMatch(/^Libro - \d{2}\/\d{2} /);
  });

  it('sin nombre pero con versión: conserva el sello congelado aunque el título ya lleve la versión', () => {
    const id = 'doc_cv_20260918_113815_4_abc';
    const t1 = deriveDocumentTitle('cv', { id, version_label: 'Backend' });
    expect(t1).toBe('CV - 18/09 11:38:15.4 — Backend');
    expect(deriveDocumentTitle('cv', { id: 'doc_cv_1758200000000', title: t1, version_label: 'Backend' })).toBe(t1);
  });
});

