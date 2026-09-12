import { describe, it, expect } from 'vitest';
import { getEffectiveCoverFeaturedItems, getCoverFeaturedBadges } from '../src/shared/core/pdf-engine/layers/sectors/coverFeaturedEngine';

describe('coverFeaturedEngine — Resolución Unificada de Insignias de Portada', () => {

  it('1. Retorna array vacío cuando cvData es undefined o está vacío', () => {
    expect(getEffectiveCoverFeaturedItems(null)).toEqual([]);
    expect(getEffectiveCoverFeaturedItems({})).toEqual([]);
    expect(getCoverFeaturedBadges({})).toEqual([]);
  });

  it('2. Prioriza Formación Destacada cuando coverFeaturedEducationId está definido', () => {
    const cvData = {
      education: [{ id: 'edu-1', degree: 'Ingeniero en Sistemas' }],
      coverFeaturedEducationId: 'edu-1',
      roles: ['Desarrollador FullStack'],
      personalInfo: { titlePrefix: 'Licenciado' }
    };
    const items = getEffectiveCoverFeaturedItems(cvData);
    expect(items).toHaveLength(1);
    expect(items[0].label).toBe('Ingeniero en Sistemas');
    expect(items[0].source).toBe('education');
    expect(items[0].isFallback).toBe(false);
  });

  it('3. Retorna Títulos de Roles agregados explícitamente cuando no hay educación ni profesión destacada', () => {
    const cvData = {
      roles: ['Diseñador UI/UX', 'Líder de Proyecto'],
      personalInfo: { titlePrefix: 'Arquitecto' }
    };
    const items = getEffectiveCoverFeaturedItems(cvData);
    expect(items).toHaveLength(2);
    expect(items[0].label).toBe('Diseñador UI/UX');
    expect(items[1].label).toBe('Líder de Proyecto');
    expect(items[0].source).toBe('roles');
    expect(items[0].isFallback).toBe(false);
  });

  it('4. Cae en personalInfo.titlePrefix como respaldo cuando no hay roles ni formación destacada', () => {
    const cvData = {
      roles: [],
      personalInfo: { titlePrefix: 'Abogado Corporativo' }
    };
    const items = getEffectiveCoverFeaturedItems(cvData);
    expect(items).toHaveLength(1);
    expect(items[0].label).toBe('Abogado Corporativo');
    expect(items[0].source).toBe('titlePrefix');
    expect(items[0].isFallback).toBe(true);

    const badges = getCoverFeaturedBadges(cvData);
    expect(badges).toEqual(['Abogado Corporativo']);
  });
});
