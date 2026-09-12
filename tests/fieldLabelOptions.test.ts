import { describe, it, expect } from 'vitest';
import { FIELD_CATALOG } from '../src/shared/core/pdf-engine/layers/records/fieldCatalog';
import { getFieldLabelOptions } from '../src/shared/core/pdf-engine/layers/records/fieldLabelOptions';
import { buildStructuredRecordLayout } from '../src/shared/core/pdf-engine/layers/records/recordLayoutEngine';
import { cvDataToContentSections } from '../src/shared/core/pdf-engine/layers/records/cvDataAdapter';

describe('fieldLabelOptions Unit Tests', () => {
  it('1. debe derivar opciones dinámicas separadas por " / " para campos compuestos (ej. url)', () => {
    const urlDef = FIELD_CATALOG.url;
    expect(urlDef).toBeDefined();
    const options = getFieldLabelOptions(urlDef);
    expect(options).toEqual(['Enlace', 'Portfolio', 'DOI']);
  });

  it('2. debe usar el escape hatch labelOptions explícito en usuario omitiendo el paréntesis', () => {
    const usuarioDef = FIELD_CATALOG.usuario;
    expect(usuarioDef).toBeDefined();
    const options = getFieldLabelOptions(usuarioDef);
    expect(options).toEqual(['Usuario', 'Manija']);
    expect(options).not.toContain('(@usuario)');
  });

  it('3. debe retornar un array con la etiqueta original única para campos sin "/"', () => {
    const idiomaDef = FIELD_CATALOG.idioma;
    expect(idiomaDef).toBeDefined();
    const options = getFieldLabelOptions(idiomaDef);
    expect(options).toEqual(['Idioma']);
  });

  it('4. debe aplicar la etiqueta elegida a nivel de registro puntual en buildStructuredRecordLayout', () => {
    // Registro 1: sin selección de etiqueta -> toma por defecto la primera opción o pdfLabel
    const rec1 = {
      id: 'rec-redes-0',
      kind: 'social-link',
      targetSectorRole: 'sidebar',
      fields: {
        plataforma: 'ResearchGate',
        url: 'https://doi.org/10.1000/182'
      }
    };
    const layout1 = buildStructuredRecordLayout(rec1 as any);
    const extra1 = layout1.extras.find(e => e.id === 'url');
    expect(extra1).toBeDefined();
    expect(extra1?.label).toBe('Enlace / Portfolio / DOI');

    // Registro 1 modificado: con selección de etiqueta "DOI"
    const rec1Custom = {
      ...rec1,
      fieldLabelOverrides: { url: 'DOI' }
    };
    const layout1Custom = buildStructuredRecordLayout(rec1Custom as any);
    const extra1Custom = layout1Custom.extras.find(e => e.id === 'url');
    expect(extra1Custom).toBeDefined();
    expect(extra1Custom?.label).toBe('DOI');

    // Registro 2: en el mismo dataset sin selección -> mantiene su etiqueta independiente ("Enlace / Portfolio / DOI")
    const rec2 = {
      id: 'rec-redes-1',
      kind: 'social-link',
      targetSectorRole: 'sidebar',
      fields: {
        plataforma: 'Portfolio',
        url: 'https://misitio.com'
      }
    };
    const layout2 = buildStructuredRecordLayout(rec2 as any);
    const extra2 = layout2.extras.find(e => e.id === 'url');
    expect(extra2).toBeDefined();
    expect(extra2?.label).toBe('Enlace / Portfolio / DOI');
  });

  it('5. debe propagar fieldLabelOverrides desde cvData a ContentSection y ContentRecord', () => {
    const cvData = {
      sectionVisibility: { redes: true },
      redes: [
        {
          plataforma: 'DOI',
          url: 'https://doi.org/10.1234/test',
          fieldLabelOverrides: { url: 'DOI' }
        },
        {
          plataforma: 'Personal',
          url: 'https://ejemplo.com'
        }
      ]
    };
    const sections = cvDataToContentSections(cvData);
    const redesSec = sections.find(s => s.id === 'redes');
    expect(redesSec).toBeDefined();
    expect(redesSec?.records[0].fieldLabelOverrides).toEqual({ url: 'DOI' });
    expect(redesSec?.records[1].fieldLabelOverrides).toBeUndefined();

    const layout0 = buildStructuredRecordLayout(redesSec!.records[0]);
    expect(layout0.extras.find(e => e.id === 'url')?.label).toBe('DOI');
  });
});
