import { describe, expect, it } from 'vitest';
import { applyImportReview, buildValidatedImportFragment, findImportDuplicateIndex, normalizeImportedCvData, reclassifyRecord, SECTION_OPTIONS } from '../src/modules/cv-builder/utils/cvImportReview';

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

  describe('buildValidatedImportFragment', () => {
    it('includes user-edited scalar values even with no explicit replace selection', () => {
      const fragment = buildValidatedImportFragment(
        { summary: 'Editado a mano por la persona' },
        { scalarFields: {}, listItems: {} },
        { summary: '' }
      );
      expect(fragment.summary).toBe('Editado a mano por la persona');
    });

    it('excludes scalars the user kept and includes those explicitly replaced', () => {
      const fragment = buildValidatedImportFragment(
        {
          summary: 'Resumen detectado editado',
          objective: 'Objetivo detectado',
          personalInfo: { fullName: 'Nombre detectado editado', email: 'correo@example.com' }
        },
        {
          scalarFields: {
            summary: 'replace',
            objective: 'keep',
            'personalInfo.fullName': 'replace',
            'personalInfo.email': 'keep'
          },
          listItems: {}
        },
        { summary: 'Manual existente', objective: 'Objetivo manual' }
      );

      expect(fragment.summary).toBe('Resumen detectado editado');
      expect(fragment.objective).toBeUndefined();
      expect(fragment.personalInfo).toEqual({ fullName: 'Nombre detectado editado' });
      expect(fragment.personalInfo.email).toBeUndefined();
    });

    it('includes edited list records the user accepted and drops skipped ones', () => {
      const fragment = buildValidatedImportFragment(
        {
          experience: [
            { role: 'Diseñadora Senior', company: 'Nueva Co', description: 'Descripción editada' },
            { role: 'Pasante', company: 'Descartada' }
          ],
          skills: ['Figma', 'Trabajo descartado']
        },
        {
          scalarFields: {},
          listItems: {
            'experience:0': { action: 'add' },
            'experience:1': { action: 'skip' },
            'skills:0': { action: 'add' },
            'skills:1': { action: 'skip' }
          }
        }
      );

      expect(fragment.experience).toHaveLength(1);
      expect(fragment.experience[0]).toMatchObject({ role: 'Diseñadora Senior', company: 'Nueva Co' });
      expect(fragment.skills).toEqual(['Figma']);
    });

    it('persists nothing when the user rejected every detected value', () => {
      const fragment = buildValidatedImportFragment(
        { summary: 'Resumen detectado', experience: [{ role: 'CEO' }] },
        {
          scalarFields: { summary: 'keep' },
          listItems: { 'experience:0': { action: 'skip' } }
        },
        { summary: 'Existente', experience: [{ role: 'Analista' }] }
      );

      expect(fragment).toEqual({});
    });

    it('bypasses duplicate-skip heuristic by default when no current CV exists and nothing was explicitly rejected', () => {
      const fragment = buildValidatedImportFragment(
        { experience: [{ role: 'Cualquier cosa' }] },
        { scalarFields: {}, listItems: {} }
      );

      expect(fragment.experience).toHaveLength(1);
    });

    it('normalizes and imports extended canonical list fields (projects, achievements, hardSkills, etc.)', () => {
      const normalized = normalizeImportedCvData({
        projects: [{ name: 'Portal Web', institucion: 'Tech SA', descripcion: 'Desarrollo en React', year: '2024' }],
        achievements: [{ logro: 'Incremento 20%', empresa: 'Logística', metricas: '+20% eficiencia' }],
        hardSkills: [{ title: 'TypeScript', level: 'Avanzado' }],
        references: [{ persona: 'Juan Perez', cargo: 'Gerente', company: 'Tech SA', phone: '123456' }]
      });

      expect(normalized.projects[0]).toMatchObject({
        title: 'Portal Web',
        institution: 'Tech SA',
        details: 'Desarrollo en React',
        year: '2024'
      });
      expect(normalized.achievements[0]).toMatchObject({
        title: 'Incremento 20%',
        institution: 'Logística',
        details: '+20% eficiencia'
      });
      expect(normalized.hardSkills[0]).toMatchObject({
        name: 'TypeScript',
        level: 'Avanzado'
      });
      expect(normalized.references[0]).toMatchObject({
        personaReferencia: 'Juan Perez',
        cargo: 'Gerente',
        institution: 'Tech SA',
        contactoReferencia: '123456'
      });
    });
  });

  describe('reclassifyRecord & SECTION_OPTIONS', () => {
    it('contains at least 14 section options covering all canonical categories', () => {
      expect(SECTION_OPTIONS.length).toBeGreaterThanOrEqual(14);
      const keys = SECTION_OPTIONS.map((o) => o.fieldKey);
      expect(keys).toContain('coursesAndCertificates');
      expect(keys).toContain('experience');
      expect(keys).toContain('projects');
      expect(keys).toContain('education');
    });

    it('reclassifies an experience item to coursesAndCertificates adapting fields', () => {
      const expItem = { role: 'Certificación Cloud', company: 'Google Cloud', startDate: '2023', description: 'Arquitectura' };
      const reclassified = reclassifyRecord('experience', 'coursesAndCertificates', expItem);
      expect(reclassified).toEqual({
        title: 'Certificación Cloud',
        institution: 'Google Cloud',
        year: '2023'
      });
    });

    it('reclassifies an education item to projects adapting fields', () => {
      const eduItem = { degree: 'Tesis de Grado', institution: 'UBA', startDate: '2022', description: 'Sistema distribuido' };
      const reclassified = reclassifyRecord('education', 'projects', eduItem);
      expect(reclassified).toEqual({
        title: 'Tesis de Grado',
        institution: 'UBA',
        year: '2022',
        details: 'Sistema distribuido'
      });
    });

    it('returns the same item if fromField === toField', () => {
      const item = { role: 'Desarrollador', company: 'Tech' };
      expect(reclassifyRecord('experience', 'experience', item)).toBe(item);
    });
  });
});
