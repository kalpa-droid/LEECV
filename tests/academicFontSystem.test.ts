import { describe, expect, it } from 'vitest';
import {
  ACADEMIC_FONT_CATALOG,
  findAcademicFontSpec,
} from '../src/shared/core/pdf-engine/layers/typography/academicFontCatalog';
import {
  isDynamicFontRegistered,
  registerDynamicFontFamily,
  sanitizeFontFamilyPure,
} from '../src/shared/core/pdf-engine/layers/typography/fontSanitizer';

describe('Sistema Universal de Fuentes Universitarias (Fase 9)', () => {
  it('expone las 6 fuentes principales requeridas en universidades (APA 7, Chicago, MLA)', () => {
    const names = ACADEMIC_FONT_CATALOG.map((f) => f.family);
    expect(names).toContain('Times New Roman');
    expect(names).toContain('Arial');
    expect(names).toContain('Calibri');
    expect(names).toContain('Georgia');
    expect(names).toContain('Garamond');
    expect(names).toContain('Computer Modern');
  });

  it('findAcademicFontSpec resuelve tanto nombre oficial como equivalente libre 1:1', () => {
    expect(findAcademicFontSpec('Times New Roman')?.openEquivalentName).toBe('Tinos');
    expect(findAcademicFontSpec('Arimo')?.family).toBe('Arial');
    expect(findAcademicFontSpec('Carlito')?.family).toBe('Calibri');
  });

  it('fontSanitizer respeta fuentes registradas dinámicamente y hace fallback determinístico si no están cargadas', () => {
    expect(sanitizeFontFamilyPure('Garamond')).toBe('Times-Roman');
    expect(sanitizeFontFamilyPure('Calibri')).toBe('Helvetica');

    registerDynamicFontFamily('Calibri');
    expect(isDynamicFontRegistered('Calibri')).toBe(true);
    expect(sanitizeFontFamilyPure('Calibri')).toBe('Calibri');
  });
});
