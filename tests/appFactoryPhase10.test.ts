import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildNewAppPlan,
  scaffoldNewApp,
  validateNewAppInput,
} from '../scripts/new-app';
import {
  getDockTabsForDocType,
  registerDockStepProvider,
} from '../src/shared/core/studio-host/stepSequenceRegistry';
import {
  processLoadedDocumentPayload,
  registerDocumentSchemaHandler,
} from '../src/shared/core/storage/documentEnvelope';
import { analyzeImportGraph } from '../scripts/check-import-graph';
import { scanCodeForDocTypeLeaks } from '../scripts/check-docType-leaks';

describe('Fase 10 — Fábrica de Apps (new-app) e integración con 0 cambios en el tronco', () => {
  it('genera una cápsula vertical sintética limpia (0 violaciones AST y 0 fugas docType)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leecv-fixture-app-'));
    try {
      const plan = buildNewAppPlan({
        id: 'diploma',
        capsule: 'diploma-studio',
        route: '/crear-diploma',
        title: 'Diplomas',
        storage: 'local-only',
        privacy: 'full-summary',
      });

      const written = scaffoldNewApp(tmpDir, plan);
      expect(written).toContain('src/modules/diploma-studio/manifest.ts');
      expect(written).toContain('src/modules/diploma-studio/DiplomaStudioContent.tsx');
      expect(written).toContain('src/modules/diploma-studio/domain/diplomaStepSequence.ts');

      // Proveer contrato mínimo para que analyzeImportGraph resuelva `../../shared/contracts`
      fs.mkdirSync(path.join(tmpDir, 'src/shared/contracts'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src/shared/contracts/index.ts'), 'export interface DocumentTypeManifest {}\n', 'utf8');

      // Analizar grafo AST sobre el fixture temporal
      const graphReport = analyzeImportGraph(tmpDir);
      expect(graphReport.boundaryViolations).toEqual([]);
      expect(graphReport.cycles).toEqual([]);

      // Verificar snippets completos y anti-fuga de pestaña en el Studio generado
      const studioSrc = fs.readFileSync(
        path.join(tmpDir, 'src/modules/diploma-studio/DiplomaStudioContent.tsx'),
        'utf8',
      );
      expect(studioSrc).toContain('activeId: docId');
      expect(studioSrc).not.toContain('activeId: activeTabId');
      expect(studioSrc).toContain('ScaledPaperSheet');
      expect(studioSrc).toContain('PanelSection');
      expect(studioSrc).toContain('ContextualGuideBox');
      expect(studioSrc).toContain('SectionSwitch');
      expect(studioSrc).toContain('ActionGrid');
      expect(studioSrc).toContain('AIButton');
      expect(plan.registrationSnippets.documentTypeRegistryEntry).toContain('ui:');
      expect(plan.registrationSnippets.documentTypeRegistryEntry).toContain('seo:');
      expect(plan.registrationSnippets.appRegistryEntry).toContain('managesOwnStore: true');
      expect(plan.registrationSnippets.appRegistryEntry).toContain('autoCreateBlankTabOnRouteEnter: false');
      expect(plan.registrationSnippets.appSurfaceManifestEntry).toContain("menuAction: 'onSelectDocument'");
      expect(plan.registrationSnippets.dockProviderSnippet).toContain('registerDockStepProvider');
      expect(plan.registrationSnippets.productIconSnippet).toContain('viewBox');
      expect(plan.registrationSnippets.pwaFileHandlerSnippet).toContain('file_handlers');
      expect(plan.registrationSnippets.seoPrerenderSnippet).toContain('prerenderMeta');
      expect(plan.registrationSnippets.landingCardSnippet).toContain('PortalProductsGrid');
      expect(plan.registrationSnippets.lidioKnowledgeFile).toContain('DIPLOMA_KNOWLEDGE');

      // Cero fugas AST de docType en todos los archivos generados
      for (const rel of written.filter((w) => w.endsWith('.ts') || w.endsWith('.tsx'))) {
        const src = fs.readFileSync(path.join(tmpDir, rel), 'utf8');
        const leakReport = scanCodeForDocTypeLeaks(rel, src);
        expect(leakReport.count, `${rel}: ${leakReport.samples.join(', ')}`).toBe(0);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('valida invariantes de seguridad en el generador (sin tipos purgados y sin nube en bóveda)', () => {
    expect(
      validateNewAppInput({
        id: 'portfolio',
        capsule: 'portfolio-studio',
        route: '/crear-portfolio',
        title: 'Portfolio',
        storage: 'local-only',
        privacy: 'full-summary',
      }).length,
    ).toBeGreaterThan(0);

    expect(
      validateNewAppInput({
        id: 'ficha_clinica',
        capsule: 'ficha-studio',
        route: '/crear-ficha',
        title: 'Ficha Clínica',
        storage: 'local-encrypted',
        privacy: 'full-summary',
      }).length,
    ).toBeGreaterThan(0);
  });

  it('permite enchufar pasos de Dock y migrador/sanitizador de una app #8 sintética sin modificar src/shared/', () => {
    const fixtureType = 'fixture_diploma_test';

    registerDockStepProvider(fixtureType, () => [
      { id: 'dip_datos', label: '1. Datos', isLarge: true, variant: 'accent' },
      { id: 'dip_estilo', label: '2. Estilo', isLarge: true, variant: 'accent' },
    ]);
    expect(getDockTabsForDocType(fixtureType).map((t) => t.id)).toEqual(['dip_datos', 'dip_estilo']);

    registerDocumentSchemaHandler(fixtureType, {
      currentVersion: 2,
      migrate: (raw, fromVer) => (fromVer < 2 ? { ...raw, migratedFrom: fromVer } : raw),
      sanitize: (raw) =>
        raw && typeof raw === 'object' && typeof (raw as any).recipient === 'string' ? raw : null,
    });

    const processed = processLoadedDocumentPayload(
      fixtureType,
      { recipient: 'Juan Pérez' },
      1,
    );
    expect(processed).toEqual({ recipient: 'Juan Pérez', migratedFrom: 1 });

    // Rechaza payloads corruptos
    expect(processLoadedDocumentPayload(fixtureType, { invalid: true }, 1)).toBeNull();
  });
});
