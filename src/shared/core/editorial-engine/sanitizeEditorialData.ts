/**
 * Núcleo puro — Sanitizador de datos editoriales (sanitizeEditorialData.ts)
 *
 * Sanitizador propio para el tipo editorial. Debe llamarse desde
 * documentStorageService cuando docTypeId === 'editorial' (evita usar sanitizeCvData).
 *
 * Es un módulo de utilidades puras (sin React, sin DOM) para testeo en node.
 */

import { EditorialDocumentData, EditorialSection, EditorialRecord } from './editorialTypes';

/**
 * Valida un dato editorial mínimo (metadata + secciones).
 * Devuelve un mensaje de error o null si es válido.
 */
export function validateEditorialDocument(doc: EditorialDocumentData): string | null {
  if (!doc || typeof doc !== 'object') {
    return 'Documento editorial inválido: tipo null.';
  }
  if (doc.type !== 'editorial') {
    return `Tipo inesperado: ${String((doc as any).type)}. Esperaba 'editorial'.`;
  }
  if (!doc.metadata || typeof doc.metadata.title !== 'string' || !doc.metadata.title.trim()) {
    return 'Documento editorial inválido: falta el título de la obra.';
  }
  if (!Array.isArray(doc.sections) || doc.sections.length === 0) {
    return 'Documento editorial inválido: no hay secciones.';
  }
  for (const section of doc.sections) {
    if (section && typeof section.title !== 'string') {
      return 'Documento editorial inválido: sección con título no string.';
    }
    if (!Array.isArray(section?.records)) {
      return `Documento editorial inválido: sección '${section?.title ?? ''}' sin records válidos.`;
    }
  }
  return null;
}

/**
 * Deep-merge parcial de un documento editorial (para updates de sección/registro).
 * No sobrescribe campos no enviados (merge defensivo).
 */
export function mergeEditorialDocument(
  base: EditorialDocumentData,
  patch: Partial<EditorialDocumentData>,
): EditorialDocumentData {
  const merged: EditorialDocumentData = {
    ...base,
    ...patch,
    metadata: { ...(base.metadata ?? {}), ...(patch.metadata ?? {}) },
    designConfig: { ...(base.designConfig ?? {}), ...(patch.designConfig ?? {}) },
    tocConfig: { ...(base.tocConfig ?? {}), ...(patch.tocConfig ?? {}) },
    manifestRules: { ...(base.manifestRules ?? {}), ...(patch.manifestRules ?? {}) },
    legalFields: { ...(base.legalFields ?? {}), ...(patch.legalFields ?? {}) },
    sections: patch.sections ?? base.sections ?? [],
  };
  return merged;
}

/**
 * Copia shallow de una sección (para updates de una sola sección).
 */
export function copySection(section: EditorialSection): EditorialSection {
  return {
    ...section,
    records: Array.isArray(section.records) ? section.records.map((r) => ({ ...r })) : [],
  };
}

/**
 * Copia shallow de un registro (para updates de un solo registro).
 */
export function copyRecord(record: EditorialRecord): EditorialRecord {
  return { ...record };
}
