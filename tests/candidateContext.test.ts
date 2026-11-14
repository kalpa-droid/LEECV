import { describe, expect, it } from 'vitest';
import { buildCandidateContext } from '../api/_lib/aiTasks/candidateContext';

/**
 * buildCandidateContext — contrato de privacidad y foco:
 * - Nunca expone metadata de UI/presentación (visibilidad, overrides, layout, tema, plantilla).
 * - Siempre redacta datos personales sensibles.
 * - Salida de UNA sola línea (JSON compacto, sin indentación).
 */

describe('buildCandidateContext — allowlist y privacidad', () => {
  it('sin datos devuelve "No context available"', () => {
    expect(buildCandidateContext(null)).toBe('No context available');
    expect(buildCandidateContext(undefined)).toBe('No context available');
  });

  it('descarta metadata de UI/presentación y mantiene la trayectoria', () => {
    const out = buildCandidateContext({
      personalInfo: { givenNames: 'Ana', surname: 'Pérez' },
      summary: 'Resumen profesional',
      experience: [{ cargo: 'Dev', institucion: 'Acme' }],
      jobTarget: { jobTitle: 'Senior Dev', companyName: 'TargetCo', jobDescription: 'React' },
      // metadata de UI que NO debe viajar al modelo:
      sectionVisibility: { experiencia: true },
      sectionTitleOverrides: { experiencia: 'OTRO' },
      layout: { columnAssignments: { experiencia: 'primaria' } },
      theme: 'dark',
      activePresetId: 'preset-xyz',
      sectionFieldSelection: { experiencia: ['cargo'] }
    });

    expect(out).toContain('Ana');
    expect(out).toContain('Resumen profesional');
    expect(out).toContain('Senior Dev');
    expect(out).toContain('Dev');
    expect(out).not.toContain('sectionVisibility');
    expect(out).not.toContain('sectionTitleOverrides');
    expect(out).not.toContain('columnAssignments');
    expect(out).not.toContain('activePresetId');
    expect(out).not.toContain('sectionFieldSelection');
    expect(out).not.toContain('preset-xyz');
  });

  it('redacta DNI/teléfono/email y elimina photoUrl', () => {
    const out = buildCandidateContext({
      personalInfo: {
        givenNames: 'Ana',
        dni: '12345678',
        cuit: '20-12345678-9',
        phone: '+54 9 11 5555 5555',
        email: 'ana@example.com',
        photoUrl: 'data:image/jpeg;base64,AAAABBBBCCCCDDDD'
      }
    });

    expect(out).not.toContain('12345678');
    expect(out).not.toContain('20-12345678-9');
    expect(out).not.toContain('5555 5555');
    expect(out).not.toContain('ana@example.com');
    expect(out).not.toContain('photoUrl');
    expect(out).toContain('[DATO_PROTEGIDO]');
  });

  it('quita dataUrl de certificados escaneados (ahorro de tokens)', () => {
    const out = buildCandidateContext({
      certificatesScanned: [
        { name: 'AWS SA', dataUrl: 'data:image/png;base64,ZZZZ', imageUrl: 'https://img/cert.png' }
      ]
    });

    expect(out).toContain('AWS SA');
    expect(out).not.toContain('dataUrl');
    expect(out).not.toContain('ZZZZ');
    expect(out).not.toContain('imageUrl');
  });

  it('omite secciones vacías para no quemar tokens', () => {
    const out = buildCandidateContext({
      summary: 'Texto resumen',
      experience: [],
      education: [],
      projects: null
    });

    expect(out).toContain('Texto resumen');
    expect(out).not.toContain('experience');
    expect(out).not.toContain('education');
    expect(out).not.toContain('projects');
  });

  it('la salida es una sola línea (sin saltos de línea)', () => {
    const out = buildCandidateContext({
      personalInfo: { givenNames: 'Ana' },
      summary: 'Resumen',
      experience: [{ cargo: 'Dev' }]
    });

    expect(out).not.toContain('\n');
    expect(() => JSON.parse(out)).not.toThrow();
  });
});
