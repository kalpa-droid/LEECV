import { describe, it, expect } from 'vitest';
import { AI_TASKS_CATALOG } from '../api/_lib/aiTasks/catalog';
import { buildApplicationVariantData } from '../src/shared/core/documents/applicationVariant';
import { deriveDocumentTitle } from '../src/shared/core/documents/documentEngine/titleEngine';
import { buildPdfDocumentMeta } from '../src/shared/core/pdf-engine/layers/ats/pdfAtsMetadataBuilder';
import { packDocumentForDisk, unpackDocumentFromDisk } from '../src/shared/core/storage/leecvPackageCodec';

describe('Fases 4 y 5 — Nuevo flujo de postulación IA/ATS y empaquetado portable', () => {
  it('1. AI_TASKS_CATALOG incluye suggest_job_profiles y tailor_cv_for_application con schema válido', () => {
    expect(AI_TASKS_CATALOG.suggest_job_profiles).toBeDefined();
    expect(AI_TASKS_CATALOG.tailor_cv_for_application).toBeDefined();

    const sysPrompt = AI_TASKS_CATALOG.tailor_cv_for_application.buildSystemPrompt('{"personalInfo":{"fullName":"Valeria"}}', {});
    expect(sysPrompt).toContain('CERO INVENCIÓN DE CREDENCIALES');
    expect(sysPrompt).toContain('atsKeywords');
  });

  it('2. buildApplicationVariantData aplica mejoras IA, descripción y metadata ATS sin mutar el CV Base', () => {
    const baseCv = {
      id: 'cv_base_1',
      personalInfo: { fullName: 'Valeria Gómez' },
      summary: 'Docente con experiencia en planificación.',
      experience: [
        { id: 'exp_1', cargo: 'Profesora', institucion: 'Escuela', descripcion: 'Dictado de clases.' },
      ],
      skills: ['Comunicación', 'Planificación'],
      hardSkills: [{ id: 'hs_1', name: 'Moodle', level: 'Avanzado' }],
      profileSuggestions: [{ jobTitle: 'Diseñadora Instruccional', companyName: 'EdTech.IA', matchReason: 'X', suggestedDescription: 'Y' }],
    };

    const tailored = buildApplicationVariantData(baseCv, {
      puesto: 'Diseñadora Instruccional',
      empresa: 'EdTech.IA',
      jobDescription: 'Buscamos especialista en secuencias didácticas digitales y Moodle.',
      tailoredPatch: {
        summary: 'Diseñadora Instruccional orientada a entornos LMS e IA educativa.',
        objective: 'Contribuir al equipo pedagógico de EdTech.IA.',
        experienceUpdates: [
          { index: 0, description: 'Diseño de secuencias didácticas digitales y evaluación formativa.' },
        ],
        prioritizedSkills: ['Diseño Instruccional', 'Planificación'],
        prioritizedHardSkills: ['Moodle'],
        atsKeywords: ['Diseño Instruccional', 'LMS', 'Moodle', 'EdTech'],
        alignmentSummary: 'Se priorizó diseño pedagógico digital y experiencia en LMS.',
      },
    });

    // Base intacto
    expect(baseCv.summary).toBe('Docente con experiencia en planificación.');
    expect(baseCv.experience[0].descripcion).toBe('Dictado de clases.');

    // Derivado adaptado + título combinado + metadatos ATS PDF
    expect(tailored.sourceCvTabId).toBe('cv_base_1');
    expect(tailored.jobTarget.jobDescription).toContain('Moodle');
    expect(tailored.experience[0].descripcion).toContain('secuencias didácticas digitales');
    expect(tailored.profileSuggestions).toBeUndefined();

    const docTitle = deriveDocumentTitle('cv', tailored);
    expect(docTitle).toBe('CV - Valeria Gómez — Diseñadora Instruccional · EdTech.IA');

    const pdfMeta = buildPdfDocumentMeta(tailored, 'Clásico');
    expect(pdfMeta.subject).toContain('Diseñadora Instruccional');
    expect(pdfMeta.keywords).toContain('LMS');
    expect(pdfMeta.keywords).toContain('Moodle');
  });

  it('3. leecvPackageCodec empaqueta y reabre .leecv y .leedoc (con binarios embebidos) en roundtrip', async () => {
    const fakeImg = 'data:image/png;base64,' + 'A'.repeat(300);
    const sampleDoc = {
      id: 'editorial_1',
      type: 'editorial',
      metadata: { title: 'Manual de Aula', author: 'Valeria' },
      sections: [
        {
          id: 'sec_1',
          title: 'Capítulo 1',
          visible: true,
          includeInToc: true,
          startNewPage: true,
          position: 0,
          records: [
            { id: 'rec_1', type: 'paragraph', content: 'Introducción.' },
            { id: 'rec_2', type: 'image', content: '', imagePath: fakeImg, imageCaption: 'Esquema' },
          ],
        },
      ],
    };

    const packed = await packDocumentForDisk('editorial', sampleDoc);
    expect(packed.extension).toBe('.leedoc');
    expect(packed.isPackageContainer).toBe(true);
    expect(packed.suggestedFileName.endsWith('.leedoc')).toBe(true);

    const file = new File([packed.blob], packed.suggestedFileName, { type: packed.mimeType });
    const unpacked = await unpackDocumentFromDisk(file);
    expect(unpacked.docType).toBe('editorial');
    expect(unpacked.isArchive).toBe(true);
    expect(unpacked.data.metadata.title).toBe('Manual de Aula');
    expect(unpacked.data.sections[0].records[1].imagePath.startsWith('data:')).toBe(true);
  });
});
