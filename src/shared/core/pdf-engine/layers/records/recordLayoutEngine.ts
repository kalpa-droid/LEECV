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

  // El filtrado de allowedFields se aplica más abajo, en allKeysToProcess.

  // Normalización de claves alternativas (ej: degree -> tituloOGrado, role -> cargo, etc.)
  const normalizedRecord: Record<string, any> = {};

  const processKeyValue = (k: string, v: any) => {
    if (v === undefined || v === null) return;
    if (typeof v === 'object' && !Array.isArray(v)) {
      for (const [subK, subV] of Object.entries(v)) {
        processKeyValue(subK, subV);
      }
      return;
    }
    const strVal = String(v).trim();
    if (!strVal || strVal === '[object Object]') return;

    let canonicalKey = k;
    if (k === 'degree' || k === 'title' || k === 'name' || k === 'course') canonicalKey = 'tituloOGrado';
    else if (k === 'role') canonicalKey = 'cargo';
    else if (k === 'institution' || k === 'company') canonicalKey = 'institucion';
    else if (k === 'year') canonicalKey = 'periodo';
    else if (k === 'hours') canonicalKey = 'cargaHoraria';
    else if (k === 'details' || k === 'description') canonicalKey = 'descripcion';

    if (!normalizedRecord[canonicalKey]) {
      normalizedRecord[canonicalKey] = strVal;
    }
  };

  for (const [key, rawVal] of Object.entries(record)) {
    processKeyValue(key, rawVal);
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
