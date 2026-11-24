/**
 * Núcleo puro — Sanitizador de datos editoriales (sanitizeEditorialData.ts)
 *
 * Sanitizador propio para el tipo editorial. Debe llamarse desde
 * documentStorageService cuando docTypeId === 'editorial' (evita usar sanitizeCvData).
 *
 * Es un módulo de utilidades puras (sin React, sin DOM) para testeo en node.
 */

import {
  EditorialDocumentData,
  EditorialSection,
  EditorialRecord,
  EditorialSectionDividerConfig,
} from './editorialTypes';
import { registerDocumentSchemaHandler } from '../../../shared/core/storage/documentEnvelope';

export const DEFAULT_SECTION_DIVIDER_CONFIG: EditorialSectionDividerConfig = {
  enabled: false,
  scope: 'body-chapters',
  inheritCoverStyle: true,
  blankBackPage: false,
};

/**
 * Resuelve si una sección editorial debe renderizar una carátula separadora propia
 * antes de su contenido, combinando la configuración global (desactivada por defecto)
 * y el override puntual `section.sectionCover?.enabled`.
 */
export function resolveEditorialSectionCoverState(
  section: Partial<EditorialSection> | null | undefined,
  design: Record<string, any> | null | undefined,
  cover: Record<string, any> | null | undefined,
): {
  enabled: boolean;
  blankBackPage: boolean;
  coverStyleId: string;
  coverPaletteKey: string;
  kicker: string;
  subtitle: string;
} {
  const globalCfg: EditorialSectionDividerConfig = {
    ...DEFAULT_SECTION_DIVIDER_CONFIG,
    ...(design?.sectionDividers && typeof design.sectionDividers === 'object'
      ? design.sectionDividers
      : {}),
  };
  const override = section?.sectionCover;

  const isBib =
    section?.sectionKey === 'bibliografia' ||
    String(section?.id || '').includes('bibliografia');
  const isBody =
    !isBib &&
    (section?.category === 'cuerpo' ||
      section?.sectionKey === 'capitulo' ||
      section?.sectionKey === 'unidad' ||
      section?.sectionKey === 'desarrollo' ||
      section?.sectionKey === 'marco_teorico' ||
      section?.sectionKey === 'metodologia' ||
      section?.sectionKey === 'resultados' ||
      section?.sectionKey === 'discusion' ||
      (!section?.category && !section?.sectionKey));

  let enabled = false;
  if (typeof override?.enabled === 'boolean') {
    enabled = override.enabled;
  } else if (globalCfg.enabled && !isBib) {
    enabled = globalCfg.scope === 'all-sections' ? true : isBody;
  }

  const blankBackPage =
    typeof override?.blankBackPage === 'boolean'
      ? override.blankBackPage
      : Boolean(globalCfg.blankBackPage);

  const mainCoverStyle = cover?.coverStyleId || design?.coverStyleId || 'monica-classic';
  const mainCoverPalette = cover?.coverPaletteKey || design?.coverPaletteKey || 'sobrio';

  const coverStyleId =
    override?.coverStyleId ||
    (!globalCfg.inheritCoverStyle && globalCfg.coverStyleId ? globalCfg.coverStyleId : mainCoverStyle);

  const coverPaletteKey =
    override?.coverPaletteKey ||
    (!globalCfg.inheritCoverStyle && globalCfg.coverPaletteKey
      ? globalCfg.coverPaletteKey
      : mainCoverPalette);

  return {
    enabled,
    blankBackPage,
    coverStyleId,
    coverPaletteKey,
    kicker: typeof override?.kicker === 'string' ? override.kicker.trim() : '',
    subtitle: typeof override?.subtitle === 'string' ? override.subtitle.trim() : '',
  };
}

/** Cuenta cuántas páginas extra suma la carátula de una sección (0, 1 o 2 con hoja blanca detrás). */
export function countEditorialSectionCoverPages(
  section: Partial<EditorialSection> | null | undefined,
  design?: Record<string, any> | null,
  cover?: Record<string, any> | null,
): number {
  const state = resolveEditorialSectionCoverState(section, design, cover);
  if (!state.enabled) return 0;
  return state.blankBackPage ? 2 : 1;
}

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
  const sanitizedFootnotes = Array.isArray(raw.footnotes)
    ? raw.footnotes
        .filter((f: unknown): f is Record<string, any> => isPlainObject(f) && typeof f.text === 'string')
        .map((f, fIdx) => ({
          number: typeof f.number === 'number' && Number.isFinite(f.number) ? f.number : fIdx + 1,
          text: f.text,
        }))
    : undefined;
  const sanitizedCalloutItems = Array.isArray(raw.calloutItems)
    ? raw.calloutItems.filter((item: unknown): item is string => typeof item === 'string')
    : undefined;

  return {
    ...raw,
    id: typeof raw.id === 'string' && raw.id ? raw.id : `${sectionId}_rec_${index}`,
    type: typeof raw.type === 'string' && raw.type ? raw.type : 'paragraph',
    content: typeof raw.content === 'string' ? raw.content : '',
    ...(typeof raw.calloutTitle === 'string' ? { calloutTitle: raw.calloutTitle } : {}),
    ...(sanitizedCalloutItems ? { calloutItems: sanitizedCalloutItems } : {}),
    ...(sanitizedFootnotes ? { footnotes: sanitizedFootnotes } : {}),
    ...(typeof raw.preserveLineBreaks === 'boolean' ? { preserveLineBreaks: raw.preserveLineBreaks } : {}),
    ...(typeof raw.keepTogether === 'boolean' ? { keepTogether: raw.keepTogether } : {}),
    ...(typeof raw.tableHasHeaderRow === 'boolean' ? { tableHasHeaderRow: raw.tableHasHeaderRow } : {}),
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
  const validMasterModes = new Set(['auto', 'clean', 'preliminary', 'body']);
  return {
    ...raw,
    id,
    title: typeof raw.title === 'string' ? raw.title : '',
    sectionKey: typeof raw.sectionKey === 'string' && raw.sectionKey ? raw.sectionKey : undefined,
    category:
      raw.category === 'preliminares' ||
      raw.category === 'cuerpo' ||
      raw.category === 'cierre' ||
      raw.category === 'personalizada'
        ? raw.category
        : undefined,
    visible: raw.visible !== false,
    includeInToc: raw.includeInToc !== false,
    startNewPage: raw.startNewPage !== false,
    position: typeof raw.position === 'number' && Number.isFinite(raw.position) ? raw.position : index,
    ...(typeof raw.kickerLabel === 'string' ? { kickerLabel: raw.kickerLabel } : {}),
    ...(typeof raw.masterPageMode === 'string' && validMasterModes.has(raw.masterPageMode)
      ? { masterPageMode: raw.masterPageMode }
      : {}),
    ...(typeof raw.runningHeaderText === 'string' ? { runningHeaderText: raw.runningHeaderText } : {}),
    ...(typeof raw.epigraphText === 'string' ? { epigraphText: raw.epigraphText } : {}),
    ...(typeof raw.epigraphAuthor === 'string' ? { epigraphAuthor: raw.epigraphAuthor } : {}),
    ...(raw.columnCount === 1 || raw.columnCount === 2 ? { columnCount: raw.columnCount } : {}),
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
