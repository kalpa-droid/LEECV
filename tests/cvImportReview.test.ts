import { describe, expect, it } from 'vitest';
import { applyImportReview, findImportDuplicateIndex, normalizeImportedCvData } from '../src/modules/cv-builder/utils/cvImportReview';

describe('CV import review', () => {
  it('preserves existing scalar values by default and completes empty values', () => {
    const current = {
      personalInfo: { fullName: 'Nombre manual', email: '' },
      summary: 'Resumen manual',
      objective: ''
    };
    const imported = {
      personalInfo: { fullName: 'Nombre detectado', email: 'persona@example.com' },
      summary: 'Resumen detectado',
      objective: 'Objetivo detectado'
    };

    expect(applyImportReview(current, imported, { scalarFields: {}, listItems: {} })).toMatchObject({
      personalInfo: { fullName: 'Nombre manual', email: 'persona@example.com' },
      summary: 'Resumen manual',
      objective: 'Objetivo detectado'
    });
  });

  it('only replaces scalar values explicitly selected for replacement', () => {
    const result = applyImportReview(
      { personalInfo: { fullName: 'Nombre manual' } },
      { personalInfo: { fullName: 'Nombre detectado' } },
      { scalarFields: { 'personalInfo.fullName': 'replace' }, listItems: {} }
    );

    expect(result.personalInfo.fullName).toBe('Nombre detectado');
  });

  it('adds new list records without dropping existing records', () => {
    const current = { experience: [{ id: 'old', role: 'Analista', company: 'Anterior' }] };
    const imported = { experience: [{ id: 'new', role: 'Diseñadora', company: 'Nueva' }] };

    const result = applyImportReview(current, imported, { scalarFields: {}, listItems: {} });

    expect(result.experience).toHaveLength(2);
    expect(result.experience[0]).toEqual(current.experience[0]);
    expect(result.experience[1]).toEqual(imported.experience[0]);
  });

  it('defaults likely duplicates to skip and supports replacing a selected item', () => {
    const current = { education: [{ id: 'edu', institution: 'Universidad Nacional', degree: 'Licenciatura', year: '2020' }] };
    const imported = { education: [{ id: 'imported', institution: 'Universidad Nacional', degree: 'Licenciatura' }] };

    expect(findImportDuplicateIndex('education', current.education, imported.education[0])).toBe(0);
    expect(applyImportReview(current, imported, { scalarFields: {}, listItems: {} }).education).toEqual(current.education);

    const replaced = applyImportReview(current, imported, {
      scalarFields: {},
      listItems: { 'education:0': { action: 'replace', targetIndex: 0 } }
    });
    expect(replaced.education[0]).toMatchObject({ id: 'edu', year: '2020' });
  });

  it('drops empty imported list records instead of treating their generated IDs as content', () => {
    expect(normalizeImportedCvData({
      experience: [{ company: '', role: '', description: '' }],
      education: [{ institution: 'Universidad', degree: 'Licenciatura' }]
    })).toMatchObject({
      experience: [],
      education: [{ institution: 'Universidad', degree: 'Licenciatura' }]
    });
  });
});
