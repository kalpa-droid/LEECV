import { describe, it, expect } from 'vitest';
import { jobTemplatesCatalog, getJobRoleBySlug } from '../src/shared/core/seo/jobTemplatesCatalog';

describe('jobTemplatesCatalog integridad', () => {
  it('tiene exactamente 52 profesiones', () => {
    expect(jobTemplatesCatalog).toHaveLength(52);
  });

  it('todos los slugs son únicos', () => {
    const slugs = jobTemplatesCatalog.map(r => r.slug);
    const uniq = new Set(slugs);
    expect(uniq.size).toBe(slugs.length);
  });

  it('cada rol tiene slug, title, description, sections', () => {
    for (const r of jobTemplatesCatalog) {
      expect(r.slug).toBeTruthy();
      expect(r.title).toBeTruthy();
      expect(typeof r.description === 'string').toBe(true);
      expect(Array.isArray(r.sections)).toBe(true);
      expect(r.sections.length).toBeGreaterThan(0);
    }
  });

  it('cada rol tiene al menos un keywords y un acrExample', () => {
    for (const r of jobTemplatesCatalog) {
      expect(Array.isArray(r.keywords)).toBe(true);
      expect(r.keywords.length).toBeGreaterThan(0);
      expect(typeof r.acrExample === 'string').toBe(true);
      expect(r.acrExample.length).toBeGreaterThan(0);
    }
  });

  it('getJobRoleBySlug resuelve el slug analista-de-datos', () => {
    const r = getJobRoleBySlug('analista-de-datos');
    expect(r?.slug).toBe('analista-de-datos');
    expect(r?.title).toContain('Analista de Datos');
  });

  it('getJobRoleBySlug retorna undefined para slug inexistente', () => {
    expect(getJobRoleBySlug('no-existo')).toBeUndefined();
  });

  it('incluye la categoría tecnología y otras', () => {
    const tech = jobTemplatesCatalog.filter(r => r.category === 'tecnologia');
    expect(tech.length).toBeGreaterThanOrEqual(10);
    const wellness = jobTemplatesCatalog.find(r => r.slug === 'enfermero');
    expect(wellness?.category).toBe('salud');
  });
});
