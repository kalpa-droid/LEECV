/**
 * Tests del núcleo LIDIO (asistente flotante): tips locales, límites,
 * parseo defensivo de estado, filtro de acciones sugeridas por la IA
 * y contrato OpenAPI 3.0 de app_guide_assistant.
 */
import { describe, it, expect } from 'vitest';
import {
  ALL_TIPS,
  ALWAYS_TIPS,
  MAX_TIPS_PER_SESSION,
  TAB_TIPS,
  canShowMoreTips,
  countSeen,
  filterSuggestedActions,
  getTipsForTab,
  markTipSeen,
  parseAssistantState,
  parseSessionCount,
  pickNextTip,
  serializeAssistantState,
  validateAssistantTargetTab,
} from '../src/shared/core/assistant/assistantTips';
import { AI_TASKS_CATALOG } from '../api/_lib/aiTasks/catalog';
import { isValidPanelTab } from '../src/shared/core/recruiter-rules/ruleTargetTabs';

describe('getTipsForTab', () => {
  it('pestaña con tips propios: específicos primero, transversales al final', () => {
    const tips = getTipsForTab('vacante');
    expect(tips[0].id).toBe('tip-vacante-1');
    expect(tips.map((t) => t.id)).toContain('tip-vacante-2');
    expect(tips.slice(-ALWAYS_TIPS.length).map((t) => t.id)).toEqual(ALWAYS_TIPS.map((t) => t.id));
  });
  it('pestaña sin tips propios o desconocida: solo transversales', () => {
    expect(getTipsForTab('guardados').map((t) => t.id)).toEqual(ALWAYS_TIPS.map((t) => t.id));
    expect(getTipsForTab(undefined).map((t) => t.id)).toEqual(ALWAYS_TIPS.map((t) => t.id));
  });
});

describe('pickNextTip', () => {
  it('elige el primer tip específico no visto', () => {
    expect(pickNextTip('vacante', [])?.id).toBe('tip-vacante-1');
  });
  it('salta los vistos y cae a los transversales', () => {
    const seen = ['tip-vacante-1', 'tip-vacante-2'];
    expect(pickNextTip('vacante', seen)?.id).toBe(ALWAYS_TIPS[0].id);
  });
  it('devuelve null cuando ya se vieron todos', () => {
    const all = ALL_TIPS.map((t) => t.id);
    expect(pickNextTip('vacante', all)).toBeNull();
  });
});

describe('markTipSeen / countSeen', () => {
  it('no duplica y acumula', () => {
    const s = markTipSeen(['tip-vacante-1'], 'tip-vacante-2');
    expect(s).toEqual(['tip-vacante-1', 'tip-vacante-2']);
    expect(markTipSeen(s, 'tip-vacante-1')).toHaveLength(2);
    expect(countSeen(['a', 'b', 'a'])).toBe(2);
  });
});

describe('canShowMoreTips', () => {
  it('modo silencio lo bloquea siempre', () => {
    expect(canShowMoreTips(true, 0)).toBe(false);
  });
  it('tope por sesión', () => {
    expect(canShowMoreTips(false, MAX_TIPS_PER_SESSION)).toBe(false);
    expect(canShowMoreTips(false, MAX_TIPS_PER_SESSION - 1)).toBe(true);
  });
});

describe('parseAssistantState', () => {
  it('basura → estado por defecto', () => {
    expect(parseAssistantState('not json')).toEqual({ seenTipIds: [], doNotDisturb: false });
    expect(parseAssistantState(null)).toEqual({ seenTipIds: [], doNotDisturb: false });
  });
  it('tolera campos faltantes y filtra ids no-string', () => {
    const s = parseAssistantState(JSON.stringify({ seenTipIds: ['a', 3, null, 'b'] }));
    expect(s.seenTipIds).toEqual(['a', 'b']);
    expect(s.doNotDisturb).toBe(false);
  });
  it('roundtrip con serializeAssistantState', () => {
    const raw = serializeAssistantState({ seenTipIds: ['x', 'x', 'y'], doNotDisturb: true });
    expect(parseAssistantState(raw)).toEqual({ seenTipIds: ['x', 'y'], doNotDisturb: true });
  });
});

describe('parseSessionCount', () => {
  it('basura → 0, negativos → 0, decimales → entero', () => {
    expect(parseSessionCount('abc')).toBe(0);
    expect(parseSessionCount('-3')).toBe(0);
    expect(parseSessionCount('2.7')).toBe(2);
    expect(parseSessionCount('3')).toBe(3);
  });
});

describe('validateAssistantTargetTab', () => {
  it('acepta pestañas reales, rechaza inventadas', () => {
    expect(validateAssistantTargetTab('vacante')).toBe('vacante');
    expect(validateAssistantTargetTab('carta')).toBe('carta');
    expect(validateAssistantTargetTab('experience')).toBeNull();
    expect(validateAssistantTargetTab('no_existe_esto')).toBeNull();
    expect(validateAssistantTargetTab(null)).toBeNull();
    expect(validateAssistantTargetTab('personalizada-2')).toBe('personalizada-2');
  });
});

describe('filterSuggestedActions', () => {
  it('descarta targetTabs inventados pero conserva el label', () => {
    const out = filterSuggestedActions([
      { label: 'Ver la vacante', targetTab: 'vacante' },
      { label: 'Master falsada', targetTab: 'master_section' },
    ]);
    expect(out).toEqual([
      { label: 'Ver la vacante', targetTab: 'vacante' },
      { label: 'Master falsada' },
    ]);
  });
  it('descarta labels vacíos y recorta a 2 acciones como máximo', () => {
    const out = filterSuggestedActions([
      { label: '' },
      { label: 'A', targetTab: 'vacante' },
      { label: 'B', targetTab: 'carta' },
      { label: 'C', targetTab: 'diseno' },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].label).toBe('A');
    expect(out[1].label).toBe('B');
  });
  it('entrada nula → array vacío', () => {
    expect(filterSuggestedActions(null)).toEqual([]);
    expect(filterSuggestedActions(undefined)).toEqual([]);
  });
});

describe('catálogo de tips — integridad', () => {
  it('ids únicos en todos los tips', () => {
    const ids = ALL_TIPS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('todo targetTab de tip es una pestaña real del editor', () => {
    for (const tip of ALL_TIPS) {
      if (tip.targetTab) expect(isValidPanelTab(tip.targetTab), tip.id).toBe(true);
    }
  });
  it('incluye el bloque de conocimiento de columnas aprobado por Kalpa', () => {
    const bodies = ALWAYS_TIPS.map((t) => t.body).join(' ');
    expect(bodies).toContain('Columna Principal');
    expect(bodies).toContain('Barra Lateral');
    expect(bodies).toContain('Ubicación y Orden Relativo');
    expect(ALWAYS_TIPS.some((t) => t.body.includes('Experiencia'))).toBe(true);
  });
  it('cada pestaña con tips tiene el targetTab igual a su clave', () => {
    for (const [tab, tips] of Object.entries(TAB_TIPS)) {
      for (const tip of tips) {
        if (tip.targetTab) expect(tip.targetTab).toBe(tab);
      }
    }
  });
});

describe('app_guide_assistant — contrato OpenAPI 3.0', () => {
  const task = AI_TASKS_CATALOG.app_guide_assistant;

  it('la tarea existe con taskId correcto', () => {
    expect(task).toBeDefined();
    expect(task.taskId).toBe('app_guide_assistant');
  });

  it('responseSchema válido: answer requerido, strings, sin type arrays ni additionalProperties', () => {
    expect(task.responseSchema).toBeDefined();
    expect(task.responseSchema.required).toEqual(['answer']);
    expect(task.responseSchema.properties.answer.type).toBe('string');
    const walk = (node: any) => {
      if (!node || typeof node !== 'object') return;
      if (node.type !== undefined) expect(Array.isArray(node.type)).toBe(false);
      expect(node.additionalProperties).toBeUndefined();
      Object.values(node.properties || {}).forEach(walk);
      if (node.items) walk(node.items);
    };
    walk(task.responseSchema);
  });

  it('el prompt incluye el bloque de conocimiento de columnas', () => {
    const prompt = task.buildSystemPrompt('', { question: 'x', activeTab: 'vacante', docType: 'cv' });
    expect(prompt).toContain('Columna Principal');
    expect(prompt).toContain('Barra Lateral');
    expect(prompt).toContain('Ubicación en Hoja');
    expect(prompt).toContain('Posición en Secuencia');
    expect(prompt).toContain('candado');
  });

  it('buildUserPrompt inyecta la pregunta y la pestaña activa escapadas como datos', () => {
    const prompt = task.buildUserPrompt({ question: '¿cómo muevo Idiomas?', activeTab: 'idiomas', docType: 'cv' });
    expect(prompt).toContain('¿cómo muevo Idiomas?');
    expect(prompt).toContain('idiomas');
  });
});
