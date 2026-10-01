import { describe, it, expect } from 'vitest';
import { RULES_CATALOG } from './rulesCatalog';
import { CVData } from '../../../types/cv';

describe('Recruiter Rules Catalog', () => {
  it('sensitive_data: fails if DNI or birthDate is present and not hidden in ats format', () => {
    const rule = RULES_CATALOG.find(r => r.id === 'sensitive_data')!;
    
    const cvData: CVData = {
      activeFormatId: 'ats-one-column',
      personalInfo: {
        dni: '12345678',
        birthDate: '1990-01-01'
      }
    };
    
    // Falla si el formato es ats-one-column y los datos están visibles
    expect(rule.evaluate(cvData)).toBe('fail');
    
    // Si se ocultan (legacy o por policy/override), pasa
    cvData.hiddenFields = ['dni', 'birthDate'];
    expect(rule.evaluate(cvData)).toBe('pass');
    
    // Si el formato es latam-clasico, SIEMPRE pasa porque no penaliza datos personales
    cvData.activeFormatId = 'latam-clasico';
    cvData.hiddenFields = []; // Volvemos a mostrarlos
    expect(rule.evaluate(cvData)).toBe('pass');
  });

  it('summary_length: fails if summary is too long (> 400 chars)', () => {
    const rule = RULES_CATALOG.find(r => r.id === 'summary_length')!;
    
    const cvData: CVData = {
      summary: 'A'.repeat(401)
    };
    
    expect(rule.evaluate(cvData)).toBe('fail');
    
    cvData.summary = 'Corto y conciso';
    expect(rule.evaluate(cvData)).toBe('pass');
  });

  it('education_abandoned: fails if "abandonado" is used', () => {
    const rule = RULES_CATALOG.find(r => r.id === 'education_abandoned')!;
    
    const cvData: CVData = {
      education: [
        { id: '1', institution: 'UBA', degree: 'Ingeniería', description: 'Cursado hasta 3er año, luego abandonado' }
      ]
    };
    
    expect(rule.evaluate(cvData)).toBe('fail');
    
    cvData.education[0].description = 'En curso';
    expect(rule.evaluate(cvData)).toBe('pass');
  });

  it('tool_levels_visual: fails if progress symbols are used', () => {
    const rule = RULES_CATALOG.find(r => r.id === 'tool_levels_visual')!;
    
    const cvData: CVData = {
      hardSkills: ['Excel [████░░]']
    };
    
    expect(rule.evaluate(cvData)).toBe('fail');
    
    cvData.hardSkills = ['Excel (Avanzado)'];
    expect(rule.evaluate(cvData)).toBe('pass');
  });

  it('section_order: fails if education comes before experience', () => {
    const rule = RULES_CATALOG.find(r => r.id === 'section_order')!;
    
    const cvData: CVData = {
      experience: [{ id: '1', company: 'Tech', role: 'Dev' }],
      education: [{ id: '1', institution: 'UBA', degree: 'Lic' }],
      layout: {
        sectionOrder: ['formacion', 'experiencia']
      }
    };
    
    expect(rule.evaluate(cvData)).toBe('fail');
    
    cvData.layout!.sectionOrder = ['experiencia', 'formacion'];
    expect(rule.evaluate(cvData)).toBe('pass');
  });

  it('keyword_match: evaluates correctly based on jobTargetText', () => {
    const rule = RULES_CATALOG.find(r => r.id === 'keyword_match')!;
    
    const cvData: CVData = {
      experience: [{ id: '1', company: 'Tech', role: 'Desarrollador', description: 'Uso de Node.js' }]
    };
    
    // Si no hay texto, es not_applicable
    expect(rule.evaluate(cvData, undefined)).toBe('not_applicable');
    
    // Si la vacante pide React, falla
    expect(rule.evaluate(cvData, 'Se busca desarrollador con experiencia en React')).toBe('fail');
    const msg = rule.getDynamicMessage!(cvData, 'Se busca desarrollador con experiencia en React');
    expect(msg).toContain('react');
    
    // Si agregamos React, pasa
    cvData.experience![0].description = 'Uso de Node.js y React';
    expect(rule.evaluate(cvData, 'Se busca desarrollador con experiencia en React')).toBe('pass');
  });
});
