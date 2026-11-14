import { describe, expect, it } from 'vitest';
import { AI_TASKS_CATALOG } from '../api/_lib/aiTasks/catalog';

/**
 * Contrato de esquemas para Gemini (OpenAPI 3.0, response_schema):
 * - type como array (["string","null"]) → usar nullable: true
 * - additionalProperties → Gemini no lo soporta; properties explícitas
 * - todos los tasks deben tener responseSchema
 */

function walkSchema(node: any, path: string, visit: (node: any, path: string) => void) {
  if (!node || typeof node !== 'object') return;
  visit(node, path);
  Object.entries(node.properties || {}).forEach(([key, value]) =>
    walkSchema(value, `${path}.properties.${key}`, visit)
  );
  if (node.items) walkSchema(node.items, `${path}.items`, visit);
}

describe('AI_TASKS_CATALOG — contrato de responseSchema para Gemini (OpenAPI 3.0)', () => {
  it('todos los tasks definen responseSchema', () => {
    for (const [taskId, task] of Object.entries(AI_TASKS_CATALOG)) {
      expect(task.responseSchema, `task ${taskId} sin responseSchema`).toBeDefined();
    }
  });

  it('ningún schema usa type como array (p. ej. ["string","null"])', () => {
    for (const [taskId, task] of Object.entries(AI_TASKS_CATALOG)) {
      walkSchema(task.responseSchema, taskId, (node, path) => {
        if (node?.type !== undefined) {
          expect(Array.isArray(node.type), `${path}: type como array`).toBe(false);
        }
      });
    }
  });

  it('ningún schema usa additionalProperties', () => {
    for (const [taskId, task] of Object.entries(AI_TASKS_CATALOG)) {
      walkSchema(task.responseSchema, taskId, (node, path) => {
        expect(node?.additionalProperties, `${path}: additionalProperties`).toBeUndefined();
      });
    }
  });

  it('suggest_records expone properties explícitas con los campos reales del catálogo', () => {
    const items = (AI_TASKS_CATALOG as any).suggest_records.responseSchema?.properties?.records?.items;
    const props = Object.keys(items?.properties || {});
    ['tituloOGrado', 'cargo', 'institucion', 'periodo', 'nivelDominio', 'personaReferencia', 'url', 'descripcion'].forEach(
      (id) => expect(props).toContain(id)
    );
  });

  it('explain_ats y ats_analysis tienen responseSchema válido con required correcto', () => {
    expect((AI_TASKS_CATALOG as any).explain_ats.responseSchema.required).toContain('explanation');
    const ats = (AI_TASKS_CATALOG as any).ats_analysis.responseSchema;
    expect(ats.required).toContain('semanticScore');
    expect(ats.required).toContain('findings');
    const findingProps = ats.properties.findings.items.properties;
    expect(Object.keys(findingProps)).toEqual(
      expect.arrayContaining(['id', 'category', 'title', 'detail', 'originalText', 'suggestedText'])
    );
  });

  it('rewrite_record: required = improvedFields, propiedades explícitas, missingDataNote nullable', () => {
    const schema = (AI_TASKS_CATALOG as any).rewrite_record?.responseSchema;
    expect(schema, 'rewrite_record sin responseSchema').toBeDefined();
    expect(schema.required).toEqual(['improvedFields']);

    // improvedFields es objeto con properties explícitas (nada de additionalProperties)
    const improved = schema.properties.improvedFields;
    expect(improved.type).toBe('object');
    const props = Object.keys(improved.properties || {});
    ['tituloOGrado', 'cargo', 'descripcion', 'logros', 'nivel', 'url'].forEach((id) =>
      expect(props).toContain(id)
    );
    expect(schema.additionalProperties).toBeUndefined();
    expect(improved.additionalProperties).toBeUndefined();

    // missingDataNote admite null sin romper el contrato OpenAPI 3.0
    expect(schema.properties.missingDataNote.nullable).toBe(true);
  });
});
