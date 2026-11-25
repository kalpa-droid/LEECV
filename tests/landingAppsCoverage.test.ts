import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { APP_SURFACE_MANIFEST } from '../src/shared/core/capabilities/appSurfaceManifest';
import { LANDING_APPS_CATALOG, findLandingAppByQuery } from '../src/shared/core/ui/marketing/landingAppsCatalog';
import { ALL_DOCUMENT_TYPE_IDS } from '../src/shared/core/capabilities/capabilityRegistry';

describe('Cobertura de las 5 apps principales y ocultamiento de Carta/Tarjeta como apps sueltas', () => {
  it('LANDING_APPS_CATALOG incluye exactamente las 5 apps con hasLandingCard=true', () => {
    const manifestLandingIds = ALL_DOCUMENT_TYPE_IDS.filter(
      (id) => APP_SURFACE_MANIFEST[id].features.hasLandingCard,
    ).sort();
    const catalogIds = LANDING_APPS_CATALOG.map((item) => item.id).sort();

    expect(catalogIds).toEqual(['book', 'cv', 'editorial', 'invoice', 'planner']);
    expect(catalogIds).toEqual(manifestLandingIds);
  });

  it('excluye cover_letter y business_card de portada y menú Nuevo Documento', () => {
    expect(APP_SURFACE_MANIFEST.cover_letter.features.hasLandingCard).toBe(false);
    expect(APP_SURFACE_MANIFEST.cover_letter.features.showInNewDocumentMenu).toBe(false);
    expect(APP_SURFACE_MANIFEST.cover_letter.features.hasCreditGating).toBe(false);

    expect(APP_SURFACE_MANIFEST.business_card.features.hasLandingCard).toBe(false);
    expect(APP_SURFACE_MANIFEST.business_card.features.showInNewDocumentMenu).toBe(false);
    expect(APP_SURFACE_MANIFEST.business_card.features.hasCreditGating).toBe(false);

    const menuVisibleIds = ALL_DOCUMENT_TYPE_IDS.filter(
      (id) => APP_SURFACE_MANIFEST[id].features.showInNewDocumentMenu !== false,
    ).sort();
    expect(menuVisibleIds).toEqual(['book', 'cv', 'editorial', 'invoice', 'planner']);
  });

  it('findLandingAppByQuery resuelve parámetros ?app= y cae por defecto en CV', () => {
    expect(findLandingAppByQuery('editorlee').id).toBe('editorial');
    expect(findLandingAppByQuery('facturlee').id).toBe('invoice');
    expect(findLandingAppByQuery('libro').id).toBe('book');
    expect(findLandingAppByQuery('agenda').id).toBe('planner');
    expect(findLandingAppByQuery(null).id).toBe('cv');
  });

  it('CardSheetExportSelector es 100% gratuito sin PdfCheckoutModal', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/modules/card-studio/ui/CardSheetExportSelector.tsx'),
      'utf8',
    );
    expect(src).not.toContain('PdfCheckoutModal');
    expect(src).not.toContain('consumeCreditIfNeeded');
    expect(src).toContain('Gratis');
  });
});
