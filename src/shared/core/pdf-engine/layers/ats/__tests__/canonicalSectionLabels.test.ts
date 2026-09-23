import { describe, it, expect } from 'vitest';
import { resolveCanonicalSection, findCanonicalLabel } from '../canonicalSectionLabels';

describe('resolveCanonicalSection', () => {
  it('Nivel 1: should find standard names correctly by sectionId regardless of titleText', () => {
    // Nivel 1 gana pase lo que pase con el título
    expect(resolveCanonicalSection({ sectionId: 'experiencia', titleText: 'Cosas que hice' })).toBe('Experiencia Laboral');
    expect(resolveCanonicalSection({ sectionId: 'formacion' })).toBe('Formación Académica');
  });

  it('Nivel 2: should find using exact aliases for custom sections (no sectionId)', () => {
    expect(resolveCanonicalSection({ titleText: 'Experiencia Laboral' })).toBe('Experiencia Laboral');
    expect(resolveCanonicalSection({ titleText: 'Educación' })).toBe('Formación Académica');
    expect(resolveCanonicalSection({ titleText: 'Trabajo' })).toBe('Experiencia Laboral');
    expect(resolveCanonicalSection({ titleText: 'Skills' })).toBe('Competencias Clave (Soft Skills)');
  });

  it('Nivel 2: should be case insensitive and ignore accents', () => {
    expect(resolveCanonicalSection({ titleText: 'EXPERIENCIA' })).toBe('Experiencia Laboral');
    expect(resolveCanonicalSection({ titleText: 'educación' })).toBe('Formación Académica');
    expect(resolveCanonicalSection({ titleText: 'Educacíón' })).toBe('Formación Académica');
    expect(resolveCanonicalSection({ titleText: 'educación :' })).toBe('Formación Académica'); // Strip trailing colon
  });

  it('Nivel 2: should enforce strict ^alias$ matching (no partial words or words inside titles)', () => {
    // "Trabajos" is not "trabajo"
    expect(resolveCanonicalSection({ titleText: 'Trabajos Destacados' })).toBeNull();
    
    // "Trabajo" appears inside a longer title, should not match because it requires exact match of the whole title
    expect(resolveCanonicalSection({ titleText: 'Trabajos de mi equipo' })).toBeNull();
    expect(resolveCanonicalSection({ titleText: 'Mi primer trabajo' })).toBeNull();
  });
});

describe('findCanonicalLabel (deprecated)', () => {
  it('should act as a wrapper for Nivel 2 resolution', () => {
    expect(findCanonicalLabel('Experiencia Laboral')).toBe('Experiencia Laboral');
    expect(findCanonicalLabel('Mi primer trabajo')).toBeNull();
  });
});
