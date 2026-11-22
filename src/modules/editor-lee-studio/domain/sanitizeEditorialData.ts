/**
 * Núcleo puro — Sanitizador de datos editoriales (sanitizeEditorialData.ts)
 *
 * Sanitizador propio para el tipo editorial. Debe llamarse desde
 * documentStorageService cuando docTypeId === 'editorial' (evita usar sanitizeCvData).
 *
 * Es un módulo de utilidades puras (sin React, sin DOM) para testeo en node.
 */

import { EditorialDocumentData, EditorialSection, EditorialRecord } from './editorialTypes';
import { registerDocumentSchemaHandler } from '../../../shared/core/storage/documentEnvelope';

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
    metadata: { ...(base.metadata ?? {}), ...(patch.metadata ?? {}) } as any,
    designConfig: { ...(base.designConfig ?? {}), ...(patch.designConfig ?? {}) } as any,
    tocConfig: { ...(base.tocConfig ?? {}), ...(patch.tocConfig ?? {}) } as any,
    manifestRules: { ...(base.manifestRules ?? {}), ...(patch.manifestRules ?? {}) } as any,
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

const isPlainObject = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const DEFAULT_TOC_CONFIG = {
  enabled: true,
  title: 'Índice',
  showSubtitles: true,
  position: 'tras-caratula',
} as const;

const DEFAULT_MANIFEST_RULES = {
  preserveScenes: true,
  preservePoems: true,
  preserveCitations: true,
  typographyCleanup: true,
  qrQuietZone: 4,
  qrMinSize: 20,
} as const;

function sanitizeRecord(raw: unknown, sectionId: string, index: number): Record<string, any> | null {
  if (!isPlainObject(raw)) return null;
  return {
    ...raw,
    id: typeof raw.id === 'string' && raw.id ? raw.id : `${sectionId}_rec_${index}`,
    type: typeof raw.type === 'string' && raw.type ? raw.type : 'paragraph',
    content: typeof raw.content === 'string' ? raw.content : '',
  };
}

function sanitizeSection(raw: unknown, index: number): Record<string, any> | null {
  if (!isPlainObject(raw)) return null;
  const id = typeof raw.id === 'string' && raw.id ? raw.id : `ed_seccion_${index}`;
  const records = Array.isArray(raw.records)
    ? raw.records
        .map((record: unknown, recIndex: number) => sanitizeRecord(record, id, recIndex))
        .filter((record): record is Record<string, any> => record !== null)
    : [];
  return {
    ...raw,
    id,
    title: typeof raw.title === 'string' ? raw.title : '',
    visible: raw.visible !== false,
    includeInToc: raw.includeInToc !== false,
    startNewPage: raw.startNewPage !== false,
    position: typeof raw.position === 'number' && Number.isFinite(raw.position) ? raw.position : index,
    records,
  };
}

/**
 * Sanitizador idempotente del documento editorial guardado.
 *
 * - Devuelve `null` si lo leído no es un documento editorial reconocible
 *   (por ejemplo, el "cascarón" `{ id, title }` que versiones previas
 *   escribían en el almacenamiento de CV).
 * - Nunca lanza: normaliza tipos y completa estructuras mínimas
 *   (metadatos, secciones, registros, índice, reglas) sin inventar contenido.
 * - Conserva campos desconocidos (diseño, carátula, etc.) para no perder datos.
 */
export function sanitizeEditorialData(raw: unknown): Record<string, any> | null {
  if (!isPlainObject(raw)) return null;
  if (raw.type !== undefined && raw.type !== 'editorial') return null;
  if (!Array.isArray(raw.sections) && !isPlainObject(raw.metadata)) return null;

  const metadata = isPlainObject(raw.metadata) ? raw.metadata : {};
  const sections = Array.isArray(raw.sections)
    ? raw.sections
        .map((section: unknown, index: number) => sanitizeSection(section, index))
        .filter((section): section is Record<string, any> => section !== null)
    : [];

  return {
    ...raw,
    type: 'editorial',
    metadata: {
      ...metadata,
      title: typeof metadata.title === 'string' ? metadata.title : '',
    },
    sections,
    tocConfig: { ...DEFAULT_TOC_CONFIG, ...(isPlainObject(raw.tocConfig) ? raw.tocConfig : {}) },
    manifestRules: { ...DEFAULT_MANIFEST_RULES, ...(isPlainObject(raw.manifestRules) ? raw.manifestRules : {}) },
    legalFields: isPlainObject(raw.legalFields) ? raw.legalFields : {},
  };
}

registerDocumentSchemaHandler('editorial', {
  currentVersion: 1,
  sanitize: (raw) => sanitizeEditorialData(raw),
});
