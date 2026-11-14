import { describe, expect, it } from 'vitest';
import { describeResponseSchema } from '../api/_lib/aiProviders/schemaGuide';

/**
 * describeResponseSchema — guía compacta de claves que se inyecta en el
 * systemPrompt de Groq (que fuerza JSON pero no valida contra el esquema).
 * Debe ser legible, marcar los requeridos y no sugerir claves inventadas.
 */

describe('describeResponseSchema — guía compacta para el prompt', () => {
  it('marca las claves requeridas', () => {
    const guide = describeResponseSchema({
      type: 'object',
      properties: { a: { type: 'string' }, b: { type: 'string' } },
      required: ['a']
    });

    expect(guide).toContain('"a": texto, (requerido)');
    expect(guide).toContain('"b": texto,');
    expect(guide).toContain('Claves requeridas: a');
  });

  it('describe propiedades de objetos anidados e items de arrays', () => {
    const guide = describeResponseSchema({
      type: 'object',
      properties: {
        improvedFields: {
          type: 'object',
          properties: {
            cargo: { type: 'string' },
            logros: { type: 'string' }
          }
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' }
            }
          }
        }
      }
    });

    expect(guide).toContain('"improvedFields": {');
    expect(guide).toContain('"cargo": texto');
    expect(guide).toContain('"logros": texto');
    expect(guide).toContain('"items": [ {');
    expect(guide).toContain('"name": texto');
  });

  it('enum y nullable se describen sin ambigüedad', () => {
    const guide = describeResponseSchema({
      type: 'object',
      properties: {
        focus: { type: 'string', enum: ['claridad', 'ats'] },
        missingDataNote: { type: 'string', nullable: true }
      }
    });

    expect(guide).toContain('"focus": uno de: "claridad" | "ats"');
    expect(guide).toContain('"missingDataNote": texto o null');
  });

  it('schema no-objeto (o inválido) devuelve cadena vacía', () => {
    expect(describeResponseSchema({ type: 'string' })).toBe('');
    expect(describeResponseSchema({})).toBe('');
    expect(describeResponseSchema(null)).toBe('');
    expect(describeResponseSchema(undefined)).toBe('');
    expect(describeResponseSchema('string')).toBe('');
  });

  it('exige claves exactas: prohíbe additionalProperties y claves inventadas', () => {
    const guide = describeResponseSchema({
      type: 'object',
      properties: { a: { type: 'string' } },
      required: ['a']
    });

    expect(guide).toContain('No agregues claves que no estén listadas');
    expect(guide).not.toContain('additionalProperties');
  });
});
