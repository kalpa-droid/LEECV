import { describe, it, expect } from 'vitest';
import { RULES_CATALOG } from './rulesCatalog';
import { CVData } from '../../../types/cv';

describe('Recruiter Rules Catalog', () => {
  it('sensitive_data: fails if DNI or birthDate is present and not hidden', () => {
    const rule = RULES_CATALOG.find(r => r.id === 'sensitive_data')!;
    
    const cvData: CVData = {
      personalInfo: {
        dni: '12345678',
        birthDate: '1990-01-01'
      }
    };
    
    expect(rule.evaluate(cvData)).toBe('fail');
    
    cvData.hiddenFields = ['dni', 'birthDate'];
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
});
