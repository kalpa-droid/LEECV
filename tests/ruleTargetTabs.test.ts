/**
 * Regresión: mapa canónico regla ATS → pestaña del editor.
 * Los modales ATS saltaban a pestañas inexistentes ('experience' en inglés,
 * 'frase' absorbida en Datos Personales) dejando el panel en blanco.
 * resolveRuleTargetTab garantiza que todo destino es una pestaña real.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveRuleTargetTab,
  isValidPanelTab,
  FALLBACK_TAB,
} from '../src/shared/core/recruiter-rules/ruleTargetTabs';

describe('isValidPanelTab', () => {
  it('acepta pestañas estáticas del editor CV', () => {
    for (const tab of ['personales', 'resumen', 'experiencia', 'formacion', 'cursos', 'habilidades', 'competencias', 'vacante', 'diseno', 'nueva_seccion', 'firma']) {
      expect(isValidPanelTab(tab)).toBe(true);
    }
  });

  it('rechaza pestañas inexistentes (el bug reportado)', () => {
    expect(isValidPanelTab('experience')).toBe(false);
    expect(isValidPanelTab('frase')).toBe(false);
    expect(isValidPanelTab('')).toBe(false);
    expect(isValidPanelTab(null)).toBe(false);
    expect(isValidPanelTab(undefined)).toBe(false);
  });

  it('acepta secciones personalizadas dinámicas', () => {
    expect(isValidPanelTab('personalizada-3')).toBe(true);
    const cvData = { customSections: [{ id: 'custom_eco_1' }] };
    expect(isValidPanelTab('custom_eco_1', cvData)).toBe(true);
    expect(isValidPanelTab('custom_desconocido', cvData)).toBe(false);
  });
});

describe('resolveRuleTargetTab — mapa de reglas', () => {
  it('contacto / datos sensibles / título → personales', () => {
    expect(resolveRuleTargetTab('missing_contact')).toBe('personales');
    expect(resolveRuleTargetTab('sensitive_data')).toBe('personales');
    expect(resolveRuleTargetTab('document_title')).toBe('personales');
  });

  it('resumen y sus reglas → resumen', () => {
    expect(resolveRuleTargetTab('summary_length')).toBe('resumen');
  });

  it('reglas de experiencia → experiencia', () => {
    expect(resolveRuleTargetTab('experience_action_verbs')).toBe('experiencia');
    expect(resolveRuleTargetTab('short_jobs_unexplained')).toBe('experiencia');
    expect(resolveRuleTargetTab('no_experience_tips')).toBe('experiencia');
  });

  it('formación y cursos → formacion / cursos', () => {
    expect(resolveRuleTargetTab('education_abandoned')).toBe('formacion');
    expect(resolveRuleTargetTab('education_primary')).toBe('formacion');
    expect(resolveRuleTargetTab('courses_relevance')).toBe('cursos');
  });

  it('herramientas y competencias → habilidades / competencias', () => {
    expect(resolveRuleTargetTab('tool_levels_visual')).toBe('habilidades');
    expect(resolveRuleTargetTab('ai_tool_unspecific')).toBe('habilidades');
    expect(resolveRuleTargetTab('competencies_format')).toBe('competencias');
  });

  it('orden, diseño y vacante → experiencia / diseno / vacante', () => {
    expect(resolveRuleTargetTab('section_order')).toBe('experiencia');
    expect(resolveRuleTargetTab('multicol_layout')).toBe('diseno');
    expect(resolveRuleTargetTab('keyword_match')).toBe('vacante');
  });

  it('filler_words apunta al resumen si el relleno está sólo ahí', () => {
    const cv = { summary: 'altamente motivado y orientado a resultados' };
    expect(resolveRuleTargetTab('filler_words', cv)).toBe('resumen');
  });

  it('filler_words apunta a experiencia si el relleno está sólo ahí', () => {
    const cv = {
      summary: 'Técnico con 5 años de experiencia en retail.',
      experience: [{ description: 'Logros: amplia experiencia en logística y entrega.', bulletPoints: [] }],
    };
    expect(resolveRuleTargetTab('filler_words', cv)).toBe('experiencia');
  });

  it('filler_words sin cvData cae en experiencia (superficie más común)', () => {
    expect(resolveRuleTargetTab('filler_words')).toBe('experiencia');
  });

  it('non_standard_section_<id> dinámico resuelve a la sección si existe', () => {
    expect(resolveRuleTargetTab('non_standard_section_personalizada-2')).toBe('personalizada-2');
    const cv = { customSections: [{ id: 'custom_patentes' }] };
    expect(resolveRuleTargetTab('non_standard_section_custom_patentes', cv)).toBe('custom_patentes');
    expect(resolveRuleTargetTab('non_standard_section_experiencia')).toBe('experiencia');
  });

  it('non_standard_section_<id> incierto → nueva_seccion', () => {
    expect(resolveRuleTargetTab('non_standard_section_legacy-xyz')).toBe('nueva_seccion');
  });

  it('regla desconocida o nula → fallback seguro', () => {
    expect(resolveRuleTargetTab('cualquier_otro')).toBe(FALLBACK_TAB);
    expect(resolveRuleTargetTab('')).toBe(FALLBACK_TAB);
    expect(resolveRuleTargetTab(null)).toBe(FALLBACK_TAB);
    expect(resolveRuleTargetTab(undefined)).toBe(FALLBACK_TAB);
  });

  it('todo destino resuelto es una pestaña válida del editor', () => {
    const ids = [
      'missing_contact', 'sensitive_data', 'document_title', 'summary_length',
      'experience_action_verbs', 'short_jobs_unexplained', 'no_experience_tips',
      'filler_words', 'education_abandoned', 'education_primary', 'courses_relevance',
      'tool_levels_visual', 'ai_tool_unspecific', 'competencies_format',
      'section_order', 'multicol_layout', 'keyword_match',
    ];
    for (const id of ids) {
      expect(isValidPanelTab(resolveRuleTargetTab(id)), id).toBe(true);
    }
  });
});
