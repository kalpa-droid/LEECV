import { describe, it, expect } from 'vitest';
import { CANONICAL_SECTION_ORDER } from '../src/shared/core/sections/canonicalSectionOrder';
import { SECTION_CATALOG } from '../src/shared/core/sectionRegistry';
import { resolveEffectivePresetSectionOrder } from '../src/shared/core/pdf-engine/layers/sectors/layoutResolutionEngine';
import { applyRelativeSectionPosition } from '../src/shared/core/pdf-engine/layers/sectors/sectionOrderEngine';
import { cvDataToContentSections } from '../src/shared/core/pdf-engine/layers/records/cvDataAdapter';
import { migrateCvData } from '../src/shared/core/storage/cvMigrationEngine';

describe('Canonical Section Order Engine & Section Fixes', () => {
  it('1. CANONICAL_SECTION_ORDER contiene los 18 IDs estándar sin duplicados ni ecología', () => {
    expect(CANONICAL_SECTION_ORDER).toHaveLength(18);
    expect(CANONICAL_SECTION_ORDER).not.toContain('ecologia');
    const unique = new Set(CANONICAL_SECTION_ORDER);
    expect(unique.size).toBe(18);
  });

  it('2. SECTION_CATALOG respeta el orden de CANONICAL_SECTION_ORDER y excluye ecología', () => {
    const catalogIds = SECTION_CATALOG.map(s => s.id);
    expect(catalogIds).toEqual(CANONICAL_SECTION_ORDER);
    expect(catalogIds).not.toContain('ecologia');
  });

  it('3. resolveEffectivePresetSectionOrder completa los presets cortos con CANONICAL_SECTION_ORDER', () => {
    const mockPreset: any = {
      sectors: [{ id: 'sidebar', role: 'sidebar' }, { id: 'main', role: 'main' }],
      sectionOrder: [
        { sectorRole: 'sidebar', sectionIds: ['datos-personales', 'contacto'] },
        { sectorRole: 'main', sectionIds: ['resumen', 'experiencia'] }
      ]
    };

    const effective = resolveEffectivePresetSectionOrder(mockPreset);
    const sidebarSecs = effective.find(s => s.sectorRole === 'sidebar')?.sectionIds || [];
    const mainSecs = effective.find(s => s.sectorRole === 'main')?.sectionIds || [];

    // Debe contener las secciones adicionales asignadas por defecto por su defaultSectorRole
    expect(sidebarSecs).toContain('habilidades');
    expect(sidebarSecs).toContain('idiomas');
    expect(mainSecs).toContain('formacion');
    expect(mainSecs).toContain('proyectos');
    expect(mainSecs).not.toContain('ecologia');
  });

  it('4. applyRelativeSectionPosition inicializa targetList con todas las secciones visibles del sector', () => {
    const cvData = {
      sectionVisibility: {
        'contacto': true,
        'datos-personales': true,
        'resumen': true,
        'experiencia': true,
        'formacion': true
      }
    };

    const updated = applyRelativeSectionPosition(cvData, {
      sectionId: 'formacion',
      targetSector: 'primaria',
      positionMode: 'start'
    });

    const primaryOrders = updated.layout.sectionOrders.primaria;
    expect(primaryOrders[0]).toBe('formacion');
    // Las demás secciones visibles del sector principal deben permanecer en la lista (no mandarse a 999)
    expect(primaryOrders).toContain('resumen');
    expect(primaryOrders).toContain('experiencia');
  });

  it('5. cvDataToContentSections ordena proyectos y educación descendentemente por año', () => {
    const cvData = {
      sectionVisibility: {},
      education: [
        { degree: 'Título Antiguo', year: '2015' },
        { degree: 'Título Reciente', year: '2024' }
      ],
      projects: [
        { title: 'Proyecto Alfa', year: '2018' },
        { title: 'Proyecto Beta', year: '2026' }
      ]
    };

    const sections = cvDataToContentSections(cvData);
    const eduSection = sections.find(s => s.id === 'formacion');
    const projSection = sections.find(s => s.id === 'proyectos');

    expect(eduSection?.records[0].fields.degree).toBe('Título Reciente');
    expect(projSection?.records[0].fields.title).toBe('Proyecto Beta');
  });

  it('6. migrateCvData v2 -> v3 fusiona adecuadamente ítems de ecology en projects', () => {
    const legacyCv = {
      schemaVersion: 2,
      ecology: [
        { title: 'Huerta Orgánica Comunitaria', year: '2023', details: 'Impacto ambiental' }
      ]
    };

    const migrated = migrateCvData(legacyCv);
    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.ecology).toBeUndefined();
    expect(migrated.projects).toHaveLength(1);
    expect(migrated.projects[0].title).toBe('Huerta Orgánica Comunitaria');
  });
});
