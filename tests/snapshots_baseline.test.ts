import { describe, it, expect } from 'vitest';
import { cvDataToContentSections } from '../src/shared/core/pdf-engine/layers/records/cvDataAdapter';
import { migrateCvData } from '../src/shared/core/storage/cvMigrationEngine';
import { resolveDateRange } from '../src/shared/core/pdf-engine/layers/records/dateRangeResolver';
import { buildStructuredRecordLayout } from '../src/shared/core/pdf-engine/layers/records/recordLayoutEngine';
import { applyTemplateMode } from '../src/shared/core/pdf-engine/layers/presets/templateApplicationEngine';
import { getPreset } from '../src/shared/core/pdf-engine/layers/presets/presetRegistry';
import { getCvFormat } from '../src/shared/core/formats/cvFormatRegistry';
import fixtures from './fixtures/cv_fixtures.json';

describe('FASE 0 — Snapshots Baseline', () => {
  it('debe cargar los 6 fixtures correctamente', () => {
    expect(fixtures).toBeDefined();
    expect(Object.keys(fixtures)).toHaveLength(6);
    expect(fixtures.cv_clasico_sample.id).toBe('cv_fixture_01');
  });

  it('debe adaptar cv_clasico_sample a secciones de contenido sin errores', () => {
    const sections = cvDataToContentSections(fixtures.cv_clasico_sample);
    expect(sections).toBeDefined();
    expect(Array.isArray(sections)).toBe(true);

    const sectionIds = sections.map(s => s.id);
    expect(sectionIds).toContain('contacto');
    expect(sectionIds).toContain('experiencia');
    expect(sectionIds).toContain('formacion');
    expect(sectionIds).toContain('firma');
  });

  it('debe migrar v2 -> v3 correctamente poblando experience y skills', () => {
    const migrated = migrateCvData(fixtures.cv_v2_legacy);
    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.experience).toBeDefined();
    expect(migrated.experience).toHaveLength(1);
    expect(migrated.experience[0].role).toBe('Desarrolladora Full Stack');
    expect(migrated.skills).toContain('Vue.js');
    expect(migrated.skills).toContain('Python');
  });

  it('debe ejecutar los 3 modos de applyTemplateMode de forma pura produciendo 2 columnas', () => {
    const activePreset = getPreset('modern-corporate');
    const format = getCvFormat('ats-one-column');
    const currentState = {
      sectionVisibility: { contacto: true, experiencia: true, idiomas: true },
      sectionOrders: { primaria: ['contacto', 'experiencia'], secundaria: ['idiomas'] }
    };

    // Modo 1: full-template (aplica visibilidad y clasifica por columna según activePreset)
    const fullRes = applyTemplateMode(currentState, format, activePreset, 'full-template');
    expect(fullRes.sectionVisibility.contacto).toBe(true);
    expect(fullRes.sectionVisibility.experiencia).toBe(true);
    expect(fullRes.sectionVisibility.ecologia).toBe(false);
    expect(fullRes.sectionOrders.primaria).toContain('experiencia');
    expect(fullRes.sectionOrders.secundaria).toContain('contacto');

    // Modo 2: template-order (prioriza orden, mantiene visibilidad intacta)
    const orderRes = applyTemplateMode(currentState, format, activePreset, 'template-order');
    expect(orderRes.sectionVisibility).toEqual(currentState.sectionVisibility);
    expect(orderRes.sectionOrders.primaria).toContain('experiencia');
    expect(orderRes.sectionOrders.secundaria).toContain('contacto');

    // Modo 3: no-filters (preserva visibilidad y orden)
    const noFilterRes = applyTemplateMode(currentState, format, activePreset, 'no-filters');
    expect(noFilterRes.sectionVisibility).toEqual(currentState.sectionVisibility);
    expect(noFilterRes.sectionOrders).toEqual(currentState.sectionOrders);
  });

  it('debe repartir correctamente secciones en 2 columnas con modern-corporate activo y ats-one-column aplicado', () => {
    const preset = getPreset('modern-corporate');
    const format = getCvFormat('ats-one-column');
    const res = applyTemplateMode(
      { sectionVisibility: {}, sectionOrders: { primaria: [], secundaria: [] } },
      format,
      preset,
      'full-template'
    );

    // modern-corporate tiene ['datos-personales', 'contacto', 'competencias', 'informatica'] en sidebar
    // ats-one-column visible: ['contacto', 'redes', 'resumen', 'experiencia', 'formacion', 'habilidades', 'idiomas', 'certificados']
    expect(res.sectionOrders.secundaria).toEqual(['contacto']);
    expect(res.sectionOrders.primaria).toEqual(['redes', 'resumen', 'experiencia', 'formacion', 'habilidades', 'idiomas', 'certificados']);
  });

  it('debe combinar fechas correctamente mediante resolveDateRange', () => {
    expect(resolveDateRange({ startDate: '2019', current: true })).toBe('2019 - Presente');
    expect(resolveDateRange({ startDate: '2017', endDate: '2019' })).toBe('2017 - 2019');
    expect(resolveDateRange({ year: '2023' })).toBe('2023');
    expect(resolveDateRange({ periodo: '2020 - 2022' })).toBe('2020 - 2022');
  });

  it('debe tratar bulletPoints como array en buildStructuredRecordLayout', () => {
    const record = {
      role: 'Gerente de Proyectos',
      institution: 'BioInnovación',
      bulletPoints: [
        'Coordinación de 12 proyectos agroecológicos',
        'Obtención de certificación ISO 14001'
      ]
    };
    const layout = buildStructuredRecordLayout(record);
    expect(layout.block).toBeDefined();
    expect(Array.isArray(layout.block)).toBe(true);
    expect(layout.block).toHaveLength(2);
    expect((layout.block as string[])[0]).toContain('12 proyectos');
  });

  it('debe respetar sectionVisibility para ocultar y reaparecer secciones sin perder datos', () => {
    const hiddenData = {
      ...fixtures.cv_clasico_sample,
      sectionVisibility: {
        ...fixtures.cv_clasico_sample.sectionVisibility,
        experiencia: false
      }
    };
    const hiddenSections = cvDataToContentSections(hiddenData);
    expect(hiddenSections.map(s => s.id)).not.toContain('experiencia');

    const visibleData = {
      ...fixtures.cv_clasico_sample,
      sectionVisibility: {
        ...fixtures.cv_clasico_sample.sectionVisibility,
        experiencia: true
      }
    };
    const visibleSections = cvDataToContentSections(visibleData);
    expect(visibleSections.map(s => s.id)).toContain('experiencia');
  });

  it('debe incluir la firma incondicionalmente siempre que exista signature.dataUrl', () => {
    const dataWithSig = {
      ...fixtures.cv_clasico_sample,
      sectionVisibility: {
        firma: false
      }
    };
    const sections = cvDataToContentSections(dataWithSig);
    expect(sections.map(s => s.id)).toContain('firma');
  });

  it('debe adaptar cv_full_all_sections reteniendo todas las secciones activas', () => {
    const sections = cvDataToContentSections(fixtures.cv_full_all_sections);
    expect(sections.length).toBeGreaterThan(5);
  });
});
