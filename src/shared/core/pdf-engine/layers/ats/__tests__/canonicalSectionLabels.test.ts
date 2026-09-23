import { describe, it, expect } from 'vitest';
import { findCanonicalLabel } from '../canonicalSectionLabels';

describe('findCanonicalLabel', () => {
  it('should find standard names correctly', () => {
    expect(findCanonicalLabel('Experiencia Laboral')).toBe('Experiencia Laboral');
    expect(findCanonicalLabel('Formación Académica')).toBe('Formación Académica');
  });

  it('should find using aliases', () => {
    expect(findCanonicalLabel('Educación')).toBe('Formación Académica');
    expect(findCanonicalLabel('Trabajo')).toBe('Experiencia Laboral');
    expect(findCanonicalLabel('Skills')).toBe('Competencias Clave (Soft Skills)');
  });

  it('should be case insensitive and ignore accents', () => {
    expect(findCanonicalLabel('EXPERIENCIA')).toBe('Experiencia Laboral');
    expect(findCanonicalLabel('educación')).toBe('Formación Académica');
    // Normalization test
    expect(findCanonicalLabel('Educacíón')).toBe('Formación Académica');
  });

  it('should not match partial words (no false positives for plurals if not in aliases)', () => {
    // This was the main bug: "Trabajos de mi equipo" matched "trabajo" via .includes()
    expect(findCanonicalLabel('Trabajos Destacados')).toBeNull();
    expect(findCanonicalLabel('Trabajos de mi equipo')).toBeNull();
  });

  it('should match if the exact alias appears as a full word', () => {
    // "trabajo" is an alias, so it should match if it appears as a whole word
    expect(findCanonicalLabel('Mi primer trabajo')).toBe('Experiencia Laboral');
  });
});
