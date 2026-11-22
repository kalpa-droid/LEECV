// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  ALL_DOCUMENT_TYPE_IDS,
  DOCUMENT_TYPE_REGISTRY,
  matchesDocumentTypeId,
} from '../src/shared/core/capabilities/capabilityRegistry';
import { APP_REGISTRY } from '../src/app/appRegistry';
import {
  resolveDocumentIdWithHandoff,
  useRegisterDocumentTab,
} from '../src/shared/core/documents/useRegisterDocumentTab';
import { useDocumentTabs } from '../src/shared/core/documents/useDocumentTabs';
import {
  openTab,
  closeTab,
  getOpenTabs,
  getActiveTabId,
} from '../src/shared/core/documents/tabStore';
import {
  setPendingDocumentToOpen,
  clearPendingDocumentToOpen,
} from '../src/shared/core/storage/pendingDocumentHandoff';
import { getPackageFormatSpec } from '../src/shared/core/storage/leecvPackageCodec';

describe('Aislamiento nativo de pestañas y nombres en apps standalone (anti-fuga CV)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearPendingDocumentToOpen();
  });

  it('resolveDocumentIdWithHandoff jamás adopta draft_cv ni doc_cv_* en EditorLee, FacturLee ni ninguna app standalone', () => {
    const standaloneIds = ALL_DOCUMENT_TYPE_IDS.filter(
      (id) => !APP_REGISTRY[id].usesSharedCvWorkspace,
    );

    expect(standaloneIds.length).toBeGreaterThanOrEqual(5);

    for (const appId of standaloneIds) {
      const fromDraftCv = resolveDocumentIdWithHandoff('draft_cv', appId);
      const fromDocCv = resolveDocumentIdWithHandoff('doc_cv_20260918_113815_4_abc', appId);

      expect(fromDraftCv).not.toBe('draft_cv');
      expect(fromDocCv).not.toBe('doc_cv_20260918_113815_4_abc');
      expect(matchesDocumentTypeId(fromDraftCv, appId)).toBe(true);
      expect(matchesDocumentTypeId(fromDocCv, appId)).toBe(true);
    }

    // Con ID propio válido sí conserva el activeTabId recibido
    expect(resolveDocumentIdWithHandoff('doc_editorial_123', 'editorial')).toBe('doc_editorial_123');
    expect(resolveDocumentIdWithHandoff('doc_invoice_456', 'invoice')).toBe('doc_invoice_456');

    // Con pending handoff del mismo tipo prioriza el pendiente
    setPendingDocumentToOpen('doc_editorial_pending', 'editorial');
    expect(resolveDocumentIdWithHandoff('doc_cv_111', 'editorial')).toBe('doc_editorial_pending');
  });

  it('useRegisterDocumentTab registra EditorLee/FacturLee con su nombre propio sin quedar tapado por pestaña CV, actualiza título y no resucita tras cerrar', () => {
    openTab('draft_cv', 'cv', 'CV - Juan');

    const onTabsChanged = (_tabs: any[]) => {};
    const { rerender } = renderHook(
      ({ id, docType, title }) =>
        useRegisterDocumentTab({
          id,
          docType,
          title,
          documentTabs: getOpenTabs(),
          onTabsChanged,
        }),
      {
        initialProps: {
          id: 'doc_editorial_1',
          docType: 'editorial' as const,
          title: 'EditorLee - Mi obra',
        },
      },
    );

    const tabs = getOpenTabs();
    const editorialTab = tabs.find((t) => t.id === 'doc_editorial_1');
    expect(editorialTab).toBeDefined();
    expect(editorialTab?.docType).toBe('editorial');
    expect(editorialTab?.title).toBe('EditorLee - Mi obra');
    expect(editorialTab?.title).not.toMatch(/^CV\b/i);
    expect(getActiveTabId()).toBe('doc_editorial_1');

    // Renombrado reactivo al cambiar el título de la obra
    rerender({
      id: 'doc_editorial_1',
      docType: 'editorial' as const,
      title: 'EditorLee - Tesis 2026',
    });
    expect(getOpenTabs().find((t) => t.id === 'doc_editorial_1')?.title).toBe('EditorLee - Tesis 2026');

    // Cerrar pestaña: re-render posterior no la resucita
    act(() => {
      closeTab('doc_editorial_1');
    });
    expect(getOpenTabs().find((t) => t.id === 'doc_editorial_1')).toBeUndefined();

    rerender({
      id: 'doc_editorial_1',
      docType: 'editorial' as const,
      title: 'EditorLee - Tesis 2026 v2',
    });
    expect(getOpenTabs().find((t) => t.id === 'doc_editorial_1')).toBeUndefined();
  });

  it('useDocumentTabs NO crea pestaña "CV" cuando se monta en ruta de app standalone (isSharedCvWorkspaceRoute=false)', () => {
    const cvData = { id: 'draft_cv', personalInfo: {} };

    renderHook(() =>
      useDocumentTabs({
        cvData,
        isSwitchingDocument: false,
        currentRoute: '/crear-editor',
        isSharedCvWorkspaceRoute: false,
      }),
    );

    expect(getOpenTabs()).toHaveLength(0);

    // En /crear-cv sí registra la pestaña CV
    renderHook(() =>
      useDocumentTabs({
        cvData,
        isSwitchingDocument: false,
        currentRoute: '/crear-cv',
        isSharedCvWorkspaceRoute: true,
      }),
    );

    const tabsAfterCv = getOpenTabs();
    expect(tabsAfterCv).toHaveLength(1);
    expect(tabsAfterCv[0].docType).toBe('cv');
    expect(tabsAfterCv[0].id).toBe('draft_cv');
  });

  it('App.tsx y StudioRoute.tsx respetan orden de handoff PWA, document.title por ruta y nunca filtran cvDataId', () => {
    const appSrc = fs.readFileSync(path.join(process.cwd(), 'src/app/App.tsx'), 'utf8');
    const studioRouteSrc = fs.readFileSync(path.join(process.cwd(), 'src/app/StudioRoute.tsx'), 'utf8');

    expect(appSrc).toContain('setPendingDocumentToOpen(data.id, docType');
    expect(appSrc).toContain('isSharedCvWorkspaceRoute: !standaloneStudio');
    expect(appSrc).toContain('document.title =');
    expect(studioRouteSrc).not.toMatch(/activeTabId\s*=\s*activeTab\?\.id\s*\|\|\s*activeTab\?\.cvId\s*\|\|\s*cvDataId/);
  });

  it('leecvPackageCodec deriva getPackageFormatSpec dinámicamente desde DOCUMENT_TYPE_REGISTRY', () => {
    for (const id of ALL_DOCUMENT_TYPE_IDS) {
      const manifest = DOCUMENT_TYPE_REGISTRY[id];
      if ('fileFormat' in manifest && manifest.fileFormat) {
        const spec = getPackageFormatSpec(id);
        expect(spec.docType).toBe(id);
        expect(spec.extension).toBe(manifest.fileFormat.extension);
        expect(spec.mimeType).toBe(manifest.fileFormat.mimeType);
      }
    }
  });
});
