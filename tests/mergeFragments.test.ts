import { describe, it, expect } from 'vitest';
import { mergePageFragments } from '../src/shared/core/cv-import/mergeFragments';

describe('Merge fragments', () => {
  it('merges coursesAndCertificates, projects and experience across pages', () => {
    const page1 = {
      personalInfo: { fullName: 'Juan Perez' },
      experience: [{ role: 'Developer', company: 'ABC', description: 'Parte 1' }],
      coursesAndCertificates: [{ title: 'Curso React', institution: 'Online', year: '2023' }]
    };
    const page2 = {
      experience: [{ role: 'Developer', company: 'ABC', description: 'Parte 2', continuesFromPrevious: true }],
      coursesAndCertificates: [{ title: 'Curso Node', institution: 'Online', year: '2024' }],
      projects: [{ title: 'Plataforma Web', institution: 'ABC', year: '2024' }]
    };

    const merged = mergePageFragments([page1, page2]);

    expect(merged.personalInfo?.fullName).toBe('Juan Perez');
    expect(merged.experience).toHaveLength(1);
    expect(merged.experience?.[0].description).toBe('Parte 1 Parte 2');
    expect(merged.coursesAndCertificates).toHaveLength(2);
    expect(merged.projects).toHaveLength(1);
    expect(merged.projects?.[0].title).toBe('Plataforma Web');
  });

  it('deduplicates identical courses or projects across pages', () => {
    const page1 = {
      coursesAndCertificates: [{ title: 'Curso React', institution: 'Online' }]
    };
    const page2 = {
      coursesAndCertificates: [{ title: 'Curso React', institution: 'Online' }]
    };

    const merged = mergePageFragments([page1, page2]);
    expect(merged.coursesAndCertificates).toHaveLength(1);
  });
});
