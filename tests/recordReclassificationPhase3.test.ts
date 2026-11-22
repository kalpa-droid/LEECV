import { describe, it, expect } from 'vitest';
import {
  getCompatibleTargetSections,
  planRecordMove,
  executeRecordMove,
} from '../src/shared/core/sections/recordReclassificationEngine';

describe('Fase 3 — Reclasificación segura de registros entre secciones compatibles', () => {
  it('1. Bloquea secciones incompatibles (redes sociales y referencias nunca aparecen ni se mueven hacia cursos)', () => {
    expect(getCompatibleTargetSections('redes')).toEqual([]);
    expect(getCompatibleTargetSections('referencias')).toEqual([]);

    const targetsFromCourses = getCompatibleTargetSections('cursos').map((t) => t.sectionKey);
    expect(targetsFromCourses).toContain('formacion');
    expect(targetsFromCourses).toContain('profesion');
    expect(targetsFromCourses).not.toContain('redes');
    expect(targetsFromCourses).not.toContain('referencias');

    const badPlan = planRecordMove({ plataforma: 'LinkedIn', usuario: '@valeria' }, 'redes', 'cursos');
    expect(badPlan.compatible).toBe(false);
  });

  it('2. Detecta campos extra al mover de Cursos a Formación y los preserva en Descripción si se confirma', () => {
    const cvData = {
      sectionVisibility: { cursos: true, formacion: false },
      coursesAndCertificates: [
        {
          id: 'cur_1',
          tituloOGrado: 'Diplomatura en Diseño Instruccional',
          title: 'Diplomatura en Diseño Instruccional',
          institucion: 'UNSa',
          institution: 'UNSa',
          periodo: '2024',
          year: '2024',
          cargaHoraria: '120 hs',
          hours: '120 hs',
          modalidad: 'Virtual',
          descripcion: 'Secuencias didácticas con IA.',
        },
      ],
      education: [],
      certificatesScanned: [
        {
          id: 'cert_1',
          title: 'Diplomatura en Diseño Instruccional',
          linkedRecordId: 'cur_1',
          linkedSection: 'cursos',
        },
      ],
    };

    const plan = planRecordMove(cvData.coursesAndCertificates[0], 'cursos', 'formacion', cvData);
    expect(plan.compatible).toBe(true);
    expect(plan.isLossless).toBe(false);
    expect(plan.overflowSummary.map((o) => o.fieldId)).toContain('cargaHoraria');
    expect(plan.overflowSummary.map((o) => o.fieldId)).toContain('modalidad');

    const moved = executeRecordMove(cvData, {
      sourceSectionKey: 'cursos',
      sourceFieldName: 'coursesAndCertificates',
      itemIndex: 0,
      targetSectionKey: 'formacion',
      mergeOverflowIntoDescription: true,
    });

    expect(moved.updatedCvData.coursesAndCertificates).toHaveLength(0);
    expect(moved.updatedCvData.education).toHaveLength(1);
    expect(moved.updatedCvData.education[0].tituloOGrado).toBe('Diplomatura en Diseño Instruccional');
    expect(moved.updatedCvData.education[0].degree).toBe('Diplomatura en Diseño Instruccional');
    expect(moved.updatedCvData.education[0].descripcion).toContain('Carga Horaria: 120 hs');
    expect(moved.updatedCvData.education[0].descripcion).toContain('Modalidad: Virtual');
    expect(moved.updatedCvData.sectionVisibility.formacion).toBe(true);
    expect(moved.updatedCvData.certificatesScanned[0].linkedSection).toBe('formacion');
  });

  it('3. Permite mover competencias ↔ habilidades técnicas sin mezclar tipos', () => {
    const targets = getCompatibleTargetSections('competencias').map((t) => t.sectionKey);
    expect(targets).toEqual(['habilidades']);

    const cvData = {
      skills: ['Liderazgo'],
      hardSkills: [],
      sectionVisibility: { competencias: true, habilidades: false },
    };

    const res = executeRecordMove(cvData, {
      sourceSectionKey: 'competencias',
      sourceFieldName: 'skills',
      itemIndex: 0,
      targetSectionKey: 'habilidades',
      mergeOverflowIntoDescription: true,
    });

    expect(res.updatedCvData.skills).toEqual([]);
    expect(res.updatedCvData.hardSkills).toHaveLength(1);
    expect(res.updatedCvData.hardSkills[0].name).toBe('Liderazgo');
    expect(res.updatedCvData.sectionVisibility.habilidades).toBe(true);
  });
});
