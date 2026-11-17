/**
 * Tests de la sección Firma Digital en cvDataToContentSections (bug "firma vacía").
 *
 * Regresión: el guard anterior exigía signature.dataUrl || signature.signerName, pero
 * signature.signerName solo se hidrataba desde personalInfo.fullName (esquema legacy).
 * Con el esquema moderno (givenNames/surname) la firma JAMÁS aparecía en el PDF aunque
 * los datos personales estuvieran cargados.
 */
import { describe, it, expect } from 'vitest';
import { cvDataToContentSections } from '../src/shared/core/pdf-engine/layers/records/cvDataAdapter';
import { sanitizeCvData } from '../src/shared/core/utils/cvDataSchema';

const baseCv = (overrides: Record<string, any> = {}) => ({
  personalInfo: { givenNames: 'Mónica', surname: 'Burgos' },
  signature: {},
  ...overrides
});

const firmaSection = (cvData: any) => {
  const sections = cvDataToContentSections(cvData);
  return sections.find(s => s.id === 'firma');
};

describe('cvDataToContentSections - sección Firma (regresión "firma vacía")', () => {
  it('emite la firma con datos personales modernos (givenNames/surname) sin imagen dibujada', () => {
    const firma = firmaSection(baseCv());
    expect(firma).toBeDefined();
    expect((firma!.records[0] as any).fields.signerName).toBe('Mónica Burgos');
  });

  it('NO emite la firma sin nombre real ni imagen (nunca imprime "Postulante")', () => {
    const firma = firmaSection(baseCv({ personalInfo: {} }));
    expect(firma).toBeUndefined();
  });

  it('emite la firma con imagen dibujada aunque falte el nombre (sin "Postulante")', () => {
    const firma = firmaSection(baseCv({
      personalInfo: {},
      signature: { dataUrl: 'data:image/png;base64,AAA' }
    }));
    expect(firma).toBeDefined();
    expect((firma!.records[0] as any).fields.signerName).toBe('');
    expect((firma!.records[0] as any).fields.dataUrl).toBe('data:image/png;base64,AAA');
  });

  it('emite la firma con un nombre explícito guardado (legacy) y sin datos personales', () => {
    const firma = firmaSection(baseCv({
      personalInfo: {},
      signature: { signerName: 'Firmante Legacy' }
    }));
    expect(firma).toBeDefined();
    expect((firma!.records[0] as any).fields.signerName).toBe('Firmante Legacy');
  });

  it('respeta el nombre EN VIVO: el nombre guardado no congela el firmante si hay datos personales', () => {
    // Un CV legacy hidrató signerName con un nombre viejo; al renderizar con datos
    // personales actuales, el PDF muestra el nombre actual (resolución en vivo).
    const firma = firmaSection(baseCv({
      personalInfo: { givenNames: 'Nombre', surname: 'Actual' },
      signature: { signerName: 'Nombre Viejo' }
    }));
    expect(firma).toBeDefined();
    expect((firma!.records[0] as any).fields.signerName).toBe('Nombre Actual');
  });

  it('no crashea cuando signature es undefined y emite la firma con nombre real', () => {
    const cvData = baseCv();
    cvData.signature = undefined;
    expect(() => cvDataToContentSections(cvData)).not.toThrow();
    expect(firmaSection(cvData)).toBeDefined();
  });

  it('emite la firma tras sanitizeCvData con esquema legacy (fullName)', () => {
    const sanitized = sanitizeCvData({ personalInfo: { fullName: 'MONICA DANIELA BURGOS' } });
    expect(firmaSection(sanitized)).toBeDefined();
  });

  it('emite la firma tras sanitizeCvData con esquema moderno (givenNames/surname)', () => {
    const sanitized = sanitizeCvData({ personalInfo: { givenNames: 'Mónica', surname: 'Burgos' } });
    expect(firmaSection(sanitized)).toBeDefined();
  });

  it('respeta firma oculta (sectionVisibility.firma = false)', () => {
    const firma = firmaSection(baseCv({ sectionVisibility: { firma: false } }));
    expect(firma).toBeUndefined();
  });

  it('la firma queda siempre como sección terminal del documento', () => {
    const sections = cvDataToContentSections(baseCv());
    expect(sections[sections.length - 1].id).toBe('firma');
  });
});
