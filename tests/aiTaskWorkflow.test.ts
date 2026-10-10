import { describe, expect, it } from 'vitest';
import { AI_TASKS_CATALOG } from '../api/_lib/aiTasks/catalog';

describe('AI tasks for application workflow', () => {
  it('keeps objective writing distinct from the professional summary', () => {
    const objective = AI_TASKS_CATALOG.generate_objective;
    const summary = AI_TASKS_CATALOG.generate_summary;
    const objectivePrompt = objective.buildSystemPrompt('CV con experiencia en coordinación', {});
    const summaryPrompt = summary.buildSystemPrompt('CV con experiencia en coordinación', {});

    expect(objectivePrompt).toContain('objetivo profesional');
    expect(objectivePrompt).toContain('No inventes');
    expect(objective.buildUserPrompt({ jobTargetText: 'Puesto de coordinación' })).toContain('Puesto de coordinación');
    expect(summaryPrompt).toContain('extracto profesional');
    expect(summaryPrompt).toContain('no en sus metas o aspiraciones');
  });

  it('requires CV evidence for vacancy-aligned competency suggestions', () => {
    const task = AI_TASKS_CATALOG.suggest_competencies;
    const systemPrompt = task.buildSystemPrompt('Experiencia demostrada coordinando equipos');
    const userPrompt = task.buildUserPrompt({
      jobTargetText: 'Se busca liderazgo de equipos',
      currentSkills: ['Comunicación']
    });

    expect(systemPrompt).toContain('respaldadas explícitamente');
    expect(systemPrompt).toContain('evidencia concreta');
    expect(userPrompt).toContain('liderazgo de equipos');
    expect(userPrompt).toContain('Comunicación');
    expect(task.responseSchema.required).toContain('suggestions');
  });
});
