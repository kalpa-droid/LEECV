import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  ALL_DOCUMENT_TYPE_IDS,
  DOCUMENT_TYPE_REGISTRY,
  getRouteForDocType,
} from '../src/shared/core/capabilities/capabilityRegistry';
import {
  APP_REGISTRY,
  findStandaloneStudioByRoute,
  isKnownAppRoute,
  resolveActiveDocTypeForRoute,
  resolveInitialTabForDocument,
} from '../src/app/appRegistry';
import {
  getDockTabsForDocType,
  hasDockStepProvider,
} from '../src/shared/core/studio-host/stepSequenceRegistry';
import { validateAssistantTargetTab } from '../src/shared/core/assistant/assistantTips';
import { scanCodeForDocTypeLeaks } from '../scripts/check-docType-leaks';

describe('Fase 5B + Fase 6 — StudioHost, stepSequenceRegistry y Composition Root (appRegistry)', () => {
  it('APP_REGISTRY monta los 7 DocumentTypeIds activos con proveedores de Dock registrados', () => {
    expect(Object.keys(APP_REGISTRY).sort()).toEqual([...ALL_DOCUMENT_TYPE_IDS].sort());

    for (const id of ALL_DOCUMENT_TYPE_IDS) {
      const entry = APP_REGISTRY[id];
      const manifest = DOCUMENT_TYPE_REGISTRY[id];

      expect(entry.id).toBe(id);
      expect(entry.route).toBe(manifest.route);
      expect(entry.effectiveRoute).toBe(getRouteForDocType(id));
      expect(hasDockStepProvider(id)).toBe(true);

      const tabs = getDockTabsForDocType(id, { bookMode: 'normal' });
      expect(tabs.length).toBeGreaterThan(0);

      if (!entry.usesSharedCvWorkspace) {
        expect(entry.StudioComponent).toBeDefined();
      }
    }
  });

  it('el proveedor de Dock para book filtra book_organize en modo normal y lo incluye en fotocopia', () => {
    const normalIds = getDockTabsForDocType('book', { bookMode: 'normal' }).map((t) => t.id);
    const copyIds = getDockTabsForDocType('book', { bookMode: 'fotocopia' }).map((t) => t.id);

    expect(normalIds).not.toContain('book_organize');
    expect(copyIds).toContain('book_organize');
  });

  it('findStandaloneStudioByRoute e isKnownAppRoute resuelven rutas sin condicionales hardcodeados', () => {
    expect(findStandaloneStudioByRoute('/crear-tarjeta')?.id).toBe('business_card');
    expect(findStandaloneStudioByRoute('/crear-libro')?.id).toBe('book');
    expect(findStandaloneStudioByRoute('/crear-agenda')?.id).toBe('planner');
    expect(findStandaloneStudioByRoute('/crear-factura')?.id).toBe('invoice');
    expect(findStandaloneStudioByRoute('/crear-editor')?.id).toBe('editorial');
    expect(findStandaloneStudioByRoute('/crear-cv')).toBeNull();
    expect(findStandaloneStudioByRoute('/')).toBeNull();

    for (const id of ALL_DOCUMENT_TYPE_IDS) {
      expect(isKnownAppRoute(DOCUMENT_TYPE_REGISTRY[id].route)).toBe(true);
    }
    expect(isKnownAppRoute('/blog/guia-cv')).toBe(true);
    expect(isKnownAppRoute('/cv/enfermera')).toBe(true);
    expect(isKnownAppRoute('/ruta-inexistente')).toBe(false);
  });

  it('resolveInitialTabForDocument y resolveActiveDocTypeForRoute preservan reglas por capacidad e inferencia', () => {
    expect(resolveInitialTabForDocument('cv', { id: 'cv_1' })).toBe('importar_datos');
    expect(
      resolveInitialTabForDocument('cv', {
        id: 'cv_var',
        sourceCvTabId: 'cv_base',
      }),
    ).toBe('carta');
    expect(resolveInitialTabForDocument('business_card', { id: 'card_1' })).toBe('card_front');
    expect(resolveInitialTabForDocument('book', { id: 'book_1' })).toBe('book_source_type');

    expect(resolveActiveDocTypeForRoute('/crear-editor', { id: 'any' })).toBe('editorial');
    expect(resolveActiveDocTypeForRoute('/crear-factura', { id: 'any' })).toBe('invoice');
    expect(
      resolveActiveDocTypeForRoute('/crear-cv', { id: 'c1', activePresetId: 'tarjeta-personal' }),
    ).toBe('business_card');
  });

  it('Planner ahora monta FloatingAssistant (Lidio) y valida todos sus pasos en assistantTips', () => {
    const plannerSrc = fs.readFileSync(
      path.join(process.cwd(), 'src/modules/planner-studio/PlannerStudioContent.tsx'),
      'utf8',
    );
    expect(plannerSrc).toContain('FloatingAssistant');
    expect(plannerSrc).toMatch(/docType=["']planner["']/);

    for (const tab of getDockTabsForDocType('planner')) {
      expect(validateAssistantTargetTab(tab.id, undefined, 'planner')).toBe(tab.id);
    }
  });

  it('los archivos migrados del shell y de app tienen 0 fugas AST de docType y App.tsx <= 350 líneas', () => {
    const zeroLeakFiles = [
      'src/shared/core/studio-host/StudioNavbar.tsx',
      'src/shared/core/studio-host/StudioDock.tsx',
      'src/shared/core/studio-host/FloatingAssistant.tsx',
      'src/shared/core/studio-host/stepSequenceRegistry.ts',
      'src/shared/core/ui/DocumentTabsBar.tsx',
      'src/shared/core/ui/NewDocumentMenu.tsx',
      'src/app/App.tsx',
      'src/app/appRegistry.ts',
      'src/app/StudioRoute.tsx',
      'src/app/CvWorkspaceContent.tsx',
      'src/app/useDocumentCreation.ts',
      'src/app/useAppNavigationAndTabs.ts',
      'src/app/useWorkspaceModalsAndExport.ts',
    ];

    for (const rel of zeroLeakFiles) {
      const code = fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
      const report = scanCodeForDocTypeLeaks(rel, code);
      expect(report.count, `${rel} tiene fugas: ${report.samples.join(', ')}`).toBe(0);
    }

    const appLines = fs
      .readFileSync(path.join(process.cwd(), 'src/app/App.tsx'), 'utf8')
      .split('\n').length;
    expect(appLines).toBeLessThanOrEqual(350);
  });
});
