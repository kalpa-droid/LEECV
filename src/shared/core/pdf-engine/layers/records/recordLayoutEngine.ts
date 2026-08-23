/**
 * NÚCLEO — MOTOR NATIVO DE JERARQUÍA Y REORGANIZACIÓN DINÁMICA DE CAMPOS (recordLayoutEngine.ts)
 *
 * Analiza un registro individual y organiza sus campos completados por roles visuales:
 * - Header (Título principal)
 * - Subheader (Subtítulo o Entidad)
 * - Badges (Etiquetas en línea colapsables)
 * - Extras (Metadatos, Resoluciones o Enlaces)
 * - Block (Bloque de texto completo para descripciones)
 *
 * Si un campo opcional está vacío, el motor colapsa la fila/etiqueta sin dejar
 * desalineaciones ni espacios en blanco.
 */

import { FIELD_CATALOG, FieldDefinition } from './fieldCatalog';

export interface RecordBadgeItem {
  id: string;
  label: string;
  value: string;
}

export interface RecordExtraItem {
  id: string;
  label: string;
  value: string;
  type?: 'text' | 'textarea' | 'url';
}

export interface StructuredRecordLayout {
  header: string | null;
  subheader: string | null;
  badges: RecordBadgeItem[];
  extras: RecordExtraItem[];
  block: string | null;
  hasData: boolean;
}

export function buildStructuredRecordLayout(
  record: Record<string, any>,
  allowedFields?: string[]
): StructuredRecordLayout {
  if (!record || typeof record !== 'object') {
    return { header: null, subheader: null, badges: [], extras: [], block: null, hasData: false };
  }

  // Si se especifican campos permitidos, los filtramos; de lo contrario usamos todo FIELD_CATALOG
  const fieldKeys = allowedFields && allowedFields.length > 0
    ? allowedFields
    : Object.keys(FIELD_CATALOG);

  let header: string | null = null;
  let subheader: string | null = null;
  const badges: RecordBadgeItem[] = [];
  const extras: RecordExtraItem[] = [];
  let block: string | null = null;
  let hasData = false;

  for (const fieldId of fieldKeys) {
    const rawVal = record[fieldId];
    if (rawVal === undefined || rawVal === null) continue;
    const val = String(rawVal).trim();
    if (!val) continue;

    hasData = true;
    const def: FieldDefinition | undefined = FIELD_CATALOG[fieldId];

    if (!def) {
      // Fallback genérico para campos no catalogados explicitamente
      if (!header) header = val;
      else extras.push({ id: fieldId, label: fieldId, value: val, type: 'text' });
      continue;
    }

    switch (def.pdfRole) {
      case 'title':
        if (!header) {
          header = val;
        } else {
          // Si ya hay header, lo pasamos a subheader o extra
          if (!subheader) subheader = val;
          else extras.push({ id: fieldId, label: def.label, value: val, type: def.type });
        }
        break;

      case 'subtitle':
        if (!subheader) {
          subheader = val;
        } else {
          extras.push({ id: fieldId, label: def.label, value: val, type: def.type });
        }
        break;

      case 'badge':
        badges.push({
          id: fieldId,
          label: def.label,
          value: val
        });
        break;

      case 'extra':
        extras.push({
          id: fieldId,
          label: def.label,
          value: val,
          type: def.type === 'url' ? 'url' : 'text'
        });
        break;

      case 'description':
        if (!block) {
          block = val;
        } else {
          block += `\n${val}`;
        }
        break;

      default:
        extras.push({ id: fieldId, label: def.label, value: val, type: def.type });
        break;
    }
  }

  // Fallback si no hay header pero hay subheader o datos
  if (!header && subheader) {
    header = subheader;
    subheader = null;
  }

  return {
    header,
    subheader,
    badges,
    extras,
    block,
    hasData
  };
}
