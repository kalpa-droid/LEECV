import { describe, expect, it } from 'vitest';
import { migrateCvData } from '../src/shared/core/storage/cvMigrationEngine';

describe('document schema persistence contract', () => {
  it('preserves CV fields used by the editor, including a hidden section and job target', () => {
    const migrated = migrateCvData({
      id: 'cv_master_fixture',
      schemaVersion: 6,
      doc_type_id: 'cv',
      objective: 'Buscar un puesto de coordinación.',
      summary: 'Trayectoria en coordinación de equipos.',
      jobTarget: {
        jobTitle: 'Coordinación',
        companyName: 'Empresa de prueba',
        recipientName: 'Equipo de selección',
        jobDescription: 'Experiencia en liderazgo.'
      },
      experience: [{ id: 'experience-1', company: 'Empresa previa', role: 'Analista' }],
      sectionVisibility: { experiencia: false }
    });

    expect(migrated.objective).toBe('Buscar un puesto de coordinación.');
    expect(migrated.summary).toBe('Trayectoria en coordinación de equipos.');
    expect(migrated.jobTarget).toEqual({
      jobTitle: 'Coordinación',
      companyName: 'Empresa de prueba',
      recipientName: 'Equipo de selección',
      jobDescription: 'Experiencia en liderazgo.'
    });
    expect(migrated.experience).toEqual([
      { id: 'experience-1', company: 'Empresa previa', role: 'Analista' }
    ]);
    expect(migrated.sectionVisibility.experiencia).toBe(false);
  });

  it('preserves editable cover letter content and recipient details', () => {
    const migrated = migrateCvData({
      id: 'doc_cover_letter_fixture',
      schemaVersion: 6,
      doc_type_id: 'cover_letter',
      activePresetId: 'carta-clasica',
      sourceCvTabId: 'cv_master_fixture',
      date: '2026-10-10',
      jobTarget: {
        jobTitle: 'Diseñadora',
        companyName: 'Empresa de prueba',
        recipientName: 'Ana Pérez',
        jobDescription: 'Diseño de productos digitales.'
      },
      body: {
        salutation: 'Estimada Ana:',
        hookParagraph: 'Me interesa el puesto.',
        evidenceParagraph: 'Cuento con experiencia relevante.',
        closingParagraph: 'Quedo a disposición.',
        signoff: 'Saludos cordiales,'
      }
    });

    expect(migrated.activePresetId).toBe('carta-clasica');
    expect(migrated.sourceCvTabId).toBe('cv_master_fixture');
    expect(migrated.date).toBe('2026-10-10');
    expect(migrated.jobTarget.recipientName).toBe('Ana Pérez');
    expect(migrated.body).toEqual({
      salutation: 'Estimada Ana:',
      hookParagraph: 'Me interesa el puesto.',
      evidenceParagraph: 'Cuento con experiencia relevante.',
      closingParagraph: 'Quedo a disposición.',
      signoff: 'Saludos cordiales,'
    });
  });
});
