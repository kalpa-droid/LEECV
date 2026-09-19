import { describe, it, expect } from 'vitest';
import { hasRealContent } from '../src/shared/core/documents/documentEngine/documentHelpers';
import { getDocTypeForRoute } from '../src/shared/core/capabilities/capabilityRegistry';
import { createBlankCVTemplate } from '../src/data/initialCVData';

describe('Cover Letter Integration & Route Sync', () => {
  it('hasRealContent reconoce campos reales de Carta de Presentación (body & jobTarget)', () => {
    // Objeto vacío
    const emptyDoc = {};
    expect(hasRealContent(emptyDoc)).toBe(false);

    // Carta con solo jobTarget (puesto objetivo)
    const docWithJobTarget = {
      jobTarget: {
        jobTitle: 'Desarrollador Senior',
        companyName: 'Tech Corp'
      }
    };
    expect(hasRealContent(docWithJobTarget)).toBe(true);

    // Carta con solo párrafos de cuerpo
    const docWithBody = {
      body: {
        hookParagraph: 'Me dirijo a usted con gran entusiasmo...'
      }
    };
    expect(hasRealContent(docWithBody)).toBe(true);

    // Carta con evidencia en body
    const docWithEvidence = {
      body: {
        evidenceParagraph: 'Cuento con más de 5 años de experiencia en React y Node.'
      }
    };
    expect(hasRealContent(docWithEvidence)).toBe(true);
  });

  it('getDocTypeForRoute mapea correctamente rutas a tipo de documento', () => {
    expect(getDocTypeForRoute('/crear-carta')).toBe('cover_letter');
    expect(getDocTypeForRoute('/crear-tarjeta')).toBe('business_card');
    expect(getDocTypeForRoute('/crear-cv')).toBe('cv');
    expect(getDocTypeForRoute('/')).toBe('cv');
  });

  it('createBlankCVTemplate deriva el preset correcto según docType', () => {
    const blankCV = createBlankCVTemplate({ docType: 'cv' });
    expect(blankCV.activePresetId).toBe('cv-clasico');

    const blankCarta = createBlankCVTemplate({ docType: 'carta' });
    expect(blankCarta.activePresetId).toBe('carta-clasica');

    const blankTarjeta = createBlankCVTemplate({ docType: 'tarjeta' });
    expect(blankTarjeta.activePresetId).toBe('tarjeta-personal');
  });
});
