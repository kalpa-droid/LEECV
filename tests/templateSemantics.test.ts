import { describe, it, expect } from 'vitest';
import { applyTemplateMode } from '../src/shared/core/pdf-engine/layers/presets/templateApplicationEngine';
import { applyPresetLevel } from '../src/shared/core/pdf-engine/layers/presets/presetHierarchyEngine';
import { cvDataToContentSections } from '../src/shared/core/pdf-engine/layers/records/cvDataAdapter';
import { getPreset } from '../src/shared/core/pdf-engine/layers/presets/presetRegistry';
import { initialCVData } from '../src/data/initialCVData';

const modernCorporate = getPreset('modern-corporate');

describe('Semántica de plantillas — preservar decisiones manuales de columna', () => {
  const currentConMovimientoManual = {
    sectionVisibility: { 'datos-personales': true, 'contacto': true },
    sectionOrders: {
      primaria: ['datos-personales'], // el usuario lo movió a mano a la columna principal
      secundaria: ['contacto']
    }
  };

  it('full-template conserva la columna elegida a mano (no la vuelve a tirar al sidebar)', () => {
    const format: any = {
      id: 'test-format',
      name: 'Test',
      defaultVisibleSections: ['contacto', 'datos-personales', 'experiencia', 'formacion'],
      personalFieldPolicy: { dni: 'user', cuit: 'user', birthDate: 'user', estadoCivil: 'user', nacionalidad: 'user', profilePhoto: 'user' }
    };
    const result = applyTemplateMode(currentConMovimientoManual, format, modernCorporate, 'full-template');

    expect(result.sectionOrders.primaria).toContain('datos-personales');
    expect(result.sectionOrders.secundaria).not.toContain('datos-personales');
    // Sin asignación manual → manda la columna base del preset activo
    expect(result.sectionOrders.secundaria).toContain('contacto');
  });

  it('la visibilidad de la plantilla se sigue aplicando (lo que sí debe resetear la plantilla)', () => {
    const format: any = {
      id: 'test-format',
      name: 'Test',
      defaultVisibleSections: ['contacto'],
      personalFieldPolicy: { dni: 'user', cuit: 'user', birthDate: 'user', estadoCivil: 'user', nacionalidad: 'user', profilePhoto: 'user' }
    };
    const result = applyTemplateMode(currentConMovimientoManual, format, modernCorporate, 'full-template');

    expect(result.sectionVisibility['contacto']).toBe(true);
    expect(result.sectionVisibility['datos-personales']).toBe(false);
  });

  it('applyPresetLevel(format) respeta la columna manual vía sectionOrders', () => {
    const moved: any = {
      ...initialCVData,
      sectionVisibility: { ...initialCVData.sectionVisibility, 'datos-personales': true },
      layout: {
        ...(initialCVData.layout || {}),
        columnAssignments: { ...(initialCVData.layout?.columnAssignments || {}), 'datos-personales': 'primaria' },
        sectionOrders: { primaria: ['datos-personales'], secundaria: ['contacto'] }
      }
    };

    const out: any = applyPresetLevel(moved, 'format', { formatId: 'europass', applicationMode: 'curated' });
    expect(out.layout.sectionOrders.primaria).toContain('datos-personales');
    expect(out.layout.sectionOrders.secundaria).not.toContain('datos-personales');
  });
});

describe('Nivel preset — slots personalizada-1..5 vacíos no se encienden solos', () => {
  it('preset no fuerza visibilidad de slots vacíos (anti botones fantasma)', () => {
    const out: any = applyPresetLevel(initialCVData as any, 'preset', { presetId: 'cv-clasico' });
    for (let n = 1; n <= 5; n++) {
      expect(out.sectionVisibility[`personalizada-${n}`]).toBe(false);
    }
    // Las secciones canónicas sí se prenden como antes
    expect(out.sectionVisibility['experiencia']).toBe(true);
  });

  it('preset conserva un slot personalizada visible si tiene contenido', () => {
    const withSlot: any = {
      ...initialCVData,
      sectionVisibility: { ...initialCVData.sectionVisibility, 'personalizada-2': true },
      'personalizada-2': [{ tituloOGrado: 'Mi sección' }]
    };
    const out: any = applyPresetLevel(withSlot, 'preset', { presetId: 'cv-clasico' });
    expect(out.sectionVisibility['personalizada-2']).toBe(true);
  });
});

describe('Datos Personales — la política de formato se respeta, el adapter no filtra en silencio información distinta', () => {
  const baseHiddenData = {
    ...initialCVData,
    activeFormatId: 'us-resume',
    personalInfo: {
      ...initialCVData.personalInfo,
      dni: '33444555',
      cuit: '27-33444555-9',
      birthDate: '1992-07-14',
      nacionalidad: 'Argentina',
      estadoCivil: 'Casado/a',
      phone: '',
      email: '',
      address: '',
      cityProvince: '',
      profilePhoto: '',
      givenNames: 'Maria',
      surname: 'Gomez'
    }
  };

  it('us-resume (oculta dni/cuit/fechas): la sección Datos Personales no se emite aunque haya datos', () => {
    const sections = cvDataToContentSections(baseHiddenData as any);
    expect(sections.find((s) => s.id === 'datos-personales')).toBeUndefined();
  });

  it('latam-clasico (mismos datos): la sección sí se emite', () => {
    const latam: any = {
      ...baseHiddenData,
      activeFormatId: 'latam-clasico',
      personalInfo: { ...baseHiddenData.personalInfo }
    };
    const sections = cvDataToContentSections(latam);
    expect(sections.find((s) => s.id === 'datos-personales')).toBeDefined();
  });

  it('ATS apaga datos-personales pero no contacto: el adapter emite Contacto y omite Datos Personales', () => {
    const atsData: any = {
      ...initialCVData,
      activeFormatId: 'latam-clasico',
      sectionVisibility: { contacto: true, 'datos-personales': false },
      personalInfo: {
        ...initialCVData.personalInfo,
        phone: '11-5555-5555',
        email: 'maria@example.com',
        dni: '33444555',
        birthDate: '1992-07-14'
      }
    };
    const sections = cvDataToContentSections(atsData);
    expect(sections.find((s) => s.id === 'contacto')).toBeDefined();
    expect(sections.find((s) => s.id === 'datos-personales')).toBeUndefined();
  });
});

describe('Nivel preset — opcionales no universales apagadas sin contenido no se encienden (sin secciones fantasma)', () => {
  it('preset no enciende logros/publicaciones/referencias/idiomas/redes que estaban apagadas y vacías', () => {
    const sinNada: any = {
      ...initialCVData,
      languages: [],
      redes: [],
      publications: [],
      references: [],
      achievements: [],
      sectionVisibility: {
        ...(initialCVData.sectionVisibility || {}),
        idiomas: false,
        redes: false,
        publicaciones: false,
        referencias: false,
        logros: false
      }
    };
    const out: any = applyPresetLevel(sinNada, 'preset', { presetId: 'cv-clasico' });
    expect(out.sectionVisibility['idiomas']).toBe(false);
    expect(out.sectionVisibility['redes']).toBe(false);
    expect(out.sectionVisibility['publicaciones']).toBe(false);
    expect(out.sectionVisibility['referencias']).toBe(false);
    expect(out.sectionVisibility['logros']).toBe(false);
  });

  it('preset sí enciende una opcional si estaba apagada pero tiene contenido real', () => {
    const conIdiomas: any = {
      ...initialCVData,
      languages: [{ id: 'l1', idioma: 'Inglés', nivel: 'B2' }],
      sectionVisibility: { ...(initialCVData.sectionVisibility || {}), idiomas: false }
    };
    const out: any = applyPresetLevel(conIdiomas, 'preset', { presetId: 'cv-clasico' });
    expect(out.sectionVisibility['idiomas']).toBe(true);
  });
});

describe('Nivel preset — activeFormatId se conserva si el formato recomienda ese preset', () => {
  it('preset compatible con el formato activo: activeFormatId se conserva', () => {
    const conFormato: any = { ...initialCVData, activeFormatId: 'europass' };
    const out: any = applyPresetLevel(conFormato, 'preset', { presetId: 'modern-corporate' });
    expect(out.activeFormatId).toBe('europass');
  });

  it('preset NO compatible con el formato activo: activeFormatId se re-resuelve', () => {
    const conFormato: any = { ...initialCVData, activeFormatId: 'europass' };
    const out: any = applyPresetLevel(conFormato, 'preset', { presetId: 'minimal-editorial' });
    expect(out.activeFormatId).not.toBe('europass');
  });
});
