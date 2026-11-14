/**
 * Convierte un responseSchema (subset OpenAPI 3.0 que usan Groq y Gemini)
 * en una guía compacta de claves para el systemPrompt.
 *
 * Motivo: Groq fuerza `response_format: json_object` pero NO valida el JSON
 * contra el esquema — sin esta guía, tareas como suggest_records o
 * rewrite_record pueden devolver claves inventadas o en inglés.
 * Gemini sí valida; para Groq la guía va inline en el prompt.
 */

type SchemaNode = {
  type?: string;
  properties?: Record<string, SchemaNode>;
  required?: string[];
  items?: SchemaNode;
  nullable?: boolean;
  enum?: Array<string | number>;
};

const PRIMITIVE_LABELS: Record<string, string> = {
  string: 'texto',
  number: 'número',
  integer: 'número',
  boolean: 'verdadero/falso'
};

function describeType(node: SchemaNode | undefined): string {
  if (!node) return 'valor';
  if (node.enum && node.enum.length > 0) {
    return `uno de: ${node.enum.map((v) => JSON.stringify(v)).join(' | ')}`;
  }
  const base = node.type ? PRIMITIVE_LABELS[node.type] || node.type : 'valor';
  return node.nullable ? `${base} o null` : base;
}

/** Descarta un nodo de propiedades con demasiadas claves (no útil como guía) */
const MAX_PROPS_IN_GUIDE = 40;

function describeObject(node: SchemaNode, lines: string[], indent: string): void {
  const props = node.properties || {};
  const required = new Set(Array.isArray(node.required) ? node.required : []);
  const keys = Object.keys(props);
  if (keys.length > MAX_PROPS_IN_GUIDE) {
    lines.push(`${indent}// (demasiadas propiedades: solo se listan ${MAX_PROPS_IN_GUIDE})`);
  }
  for (const key of keys.slice(0, MAX_PROPS_IN_GUIDE)) {
    const prop = props[key];
    const mark = required.has(key) ? ' (requerido)' : '';
    if (prop?.type === 'object' && prop.properties) {
      lines.push(`${indent}"${key}": {`);
      describeObject(prop, lines, `${indent}  `);
      lines.push(`${indent}},${mark}`);
    } else if (prop?.type === 'array') {
      const itemDesc = describeType(prop.items);
      if (prop.items?.properties) {
        lines.push(`${indent}"${key}": [ {`);
        describeObject(prop.items, lines, `${indent}    `);
        lines.push(`${indent}  } ],${mark}`);
      } else {
        lines.push(`${indent}"${key}": [ ${itemDesc} ],${mark}`);
      }
    } else {
      lines.push(`${indent}"${key}": ${describeType(prop)},${mark}`);
    }
  }
}

/**
 * Guía determinística y corta. Devuelve '' si el schema no es un objeto usable.
 */
export function describeResponseSchema(schema: any): string {
  if (!schema || typeof schema !== 'object') return '';
  if (schema.type !== 'object' || !schema.properties) return '';

  const lines: string[] = [
    'FORMATO DE RESPUESTA OBLIGATORIO:',
    'Devolvé SOLO un objeto JSON válido con esta forma (sin markdown, sin texto antes ni después):',
    '{'
  ];
  describeObject(schema as SchemaNode, lines, '  ');
  lines.push('}');

  const required = Array.isArray(schema.required) ? schema.required.filter((k: any) => typeof k === 'string') : [];
  lines.push(`Claves requeridas: ${required.length ? required.join(', ') : 'ninguna'}`);
  lines.push('No agregues claves que no estén listadas.');
  return lines.join('\n');
}
