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

  // Normalización de claves alternativas (ej: degree -> tituloOGrado, role -> cargo, etc.)
  const normalizedRecord: Record<string, any> = {};
  for (const [key, rawVal] of Object.entries(record)) {
    if (rawVal === undefined || rawVal === null) continue;
    const strVal = String(rawVal).trim();
    if (!strVal) continue;

    let canonicalKey = key;
    if (key === 'degree' || key === 'title' || key === 'name' || key === 'course') canonicalKey = 'tituloOGrado';
    else if (key === 'role') canonicalKey = 'cargo';
    else if (key === 'institution' || key === 'company') canonicalKey = 'institucion';
    else if (key === 'year') canonicalKey = 'periodo';
    else if (key === 'hours') canonicalKey = 'cargaHoraria';
    else if (key === 'details' || key === 'description') canonicalKey = 'descripcion';

    if (!normalizedRecord[canonicalKey]) {
      normalizedRecord[canonicalKey] = strVal;
    }
  }

  let header: string | null = null;
  let subheader: string | null = null;
  const badges: RecordBadgeItem[] = [];
  const extras: RecordExtraItem[] = [];
  let block: string | null = null;
  let hasData = false;

  // Procesamos tanto los campos universales como cualquier campo personalizado
  const allKeysToProcess = Array.from(new Set([
    ...(allowedFields && allowedFields.length > 0 ? allowedFields : []),
    ...Object.keys(FIELD_CATALOG),
    ...Object.keys(normalizedRecord)
  ]));

  for (const fieldId of allKeysToProcess) {
    const rawVal = normalizedRecord[fieldId];
    if (rawVal === undefined || rawVal === null) continue;
    const val = String(rawVal).trim();
    if (!val) continue;

    hasData = true;
    const def: FieldDefinition | undefined = FIELD_CATALOG[fieldId];

    if (!def) {
      if (!header) header = val;
      else extras.push({ id: fieldId, label: fieldId, value: val, type: 'text' });
      continue;
    }

    switch (def.pdfRole) {
      case 'title':
        if (!header) {
          header = val;
        } else if (!subheader) {
          subheader = val;
        } else {
          extras.push({ id: fieldId, label: def.label, value: val, type: def.type });
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
