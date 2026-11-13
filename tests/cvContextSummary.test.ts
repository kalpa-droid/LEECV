import { describe, it, expect } from 'vitest';
import { buildContextSummary } from '../src/shared/core/cv-import/cvContextSummary';

describe('cvContextSummary — buildContextSummary', () => {
  const fragment = {
    personalInfo: { fullName: 'Juan Pérez', email: 'juan@ejemplo.com' },
    languages: [{ language: 'Español', proficiency: 'Nativo' }],
    experience: [
      { role: 'Analista Junior', company: 'Accenture', startDate: '2019-03', endDate: '2021-06' },
      { role: 'Desarrollador Senior', company: 'Globant', startDate: '2021-07', endDate: 'Presente' },
    ],
    education: [{ institution: 'UBA', degree: 'Licenciatura en Sistemas' }],
  };

  it('incluye nombre, idioma, última sección y último registro con fecha', () => {
    const summary = buildContextSummary(fragment, 2);
    expect(summary).toContain('Juan Pérez');
    expect(summary).toContain('Español');
    expect(summary).toContain('experience');
    expect(summary).toContain('Desarrollador Senior en Globant');
    expect(summary).toContain('Presente');
    expect(summary).toContain('Página 2');
  });

  it('se mantiene compacto (~600 caracteres máx)', () => {
    const huge = {
      ...fragment,
      personalInfo: { fullName: 'A'.repeat(500) },
    };
    expect(buildContextSummary(huge, 1).length).toBeLessThanOrEqual(600);
  });

  it('fragmento nulo o vacío produce un resumen sin inventar datos', () => {
    expect(buildContextSummary(null, 1)).toBe('');
    const empty = buildContextSummary({}, 3);
    expect(empty).toContain('Página 3');
    expect(empty).toContain('Sin registros');
    expect(empty).not.toContain('Nombre detectado');
  });

  it('sin experience usa las secciones siguientes en el orden canónico', () => {
    const onlyEducation = {
      personalInfo: {},
      education: [{ institution: 'UTN', degree: 'Técnico en Programación', endDate: '2018' }],
    };
    const summary = buildContextSummary(onlyEducation, 2);
    expect(summary).toContain('education');
    expect(summary).toContain('UTN');
  });
});
