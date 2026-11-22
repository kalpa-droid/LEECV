/**
 * Sobre versionado (`StoredDocumentEnvelope`) y despacho de migraciones/sanitización por docType (Fase 3).
 *
 * - Lee transparentemente tanto sobres v1 como documentos legados planos (`schemaVersion = 1, revision = 1`).
 * - Despacha migración + sanitización según el `docType` registrado (cierra D8: nunca aplica
 *   `migrateCvData` a Libro, Agenda, FacturLee ni EditorLee).
 */

import type { StoredDocumentEnvelope } from '../../contracts/persistenceContract';

export interface DocumentSchemaHandler<T = any> {
  readonly currentVersion: number;
  readonly migrate?: (payload: any, fromVersion: number) => any;
  readonly sanitize: (raw: unknown) => T | null;
}

const schemaHandlers = new Map<string, DocumentSchemaHandler>();

export function registerDocumentSchemaHandler<T = any>(
  docType: string,
  handler: DocumentSchemaHandler<T>
): void {
  schemaHandlers.set(docType, handler);
}

export function getDocumentSchemaHandler(docType: string): DocumentSchemaHandler | undefined {
  return schemaHandlers.get(docType);
}

export function isStoredDocumentEnvelope(raw: unknown): raw is StoredDocumentEnvelope {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const candidate = raw as Record<string, unknown>;
  return (
    candidate.envelopeVersion === 1 &&
    typeof candidate.id === 'string' &&
    typeof candidate.docType === 'string' &&
    typeof candidate.schemaVersion === 'number' &&
    typeof candidate.revision === 'number' &&
    'payload' in candidate
  );
}

export interface WrapEnvelopeInput<T> {
  id: string;
  docType: string;
  title: string;
  payload: T;
  displaySubtitle?: string;
  schemaVersion?: number;
  previousRevision?: number;
  updatedAt?: string;
}

export function wrapDocumentEnvelope<T>(input: WrapEnvelopeInput<T>): StoredDocumentEnvelope<T> {
  const handler = schemaHandlers.get(input.docType);
  const schemaVersion = input.schemaVersion ?? handler?.currentVersion ?? 1;
  const revision = Math.max(1, (input.previousRevision ?? 0) + 1);
  return {
    envelopeVersion: 1,
    id: input.id,
    docType: input.docType,
    schemaVersion,
    revision,
    title: input.title,
    ...(input.displaySubtitle ? { displaySubtitle: input.displaySubtitle } : {}),
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    payload: input.payload,
  };
}

export function unwrapDocumentEnvelope<T = any>(
  raw: unknown,
  fallbackDocType: string
): StoredDocumentEnvelope<T> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  if (isStoredDocumentEnvelope(raw)) {
    return raw as StoredDocumentEnvelope<T>;
  }

  // Documento legado plano (sin sobre): lo envolvemos con schemaVersion=1 y revision=1
  const legacy = raw as Record<string, any>;
  const id = typeof legacy.id === 'string' ? legacy.id : '';
  const docType = typeof legacy.doc_type_id === 'string'
    ? legacy.doc_type_id
    : typeof legacy.docType === 'string'
      ? legacy.docType
      : fallbackDocType;

  return {
    envelopeVersion: 1,
    id,
    docType,
    schemaVersion: typeof legacy.schemaVersion === 'number' ? legacy.schemaVersion : 1,
    revision: typeof legacy.revision === 'number' && legacy.revision >= 1 ? legacy.revision : 1,
    title: typeof legacy.title === 'string' ? legacy.title : '',
    updatedAt:
      typeof legacy.updated_at === 'string'
        ? legacy.updated_at
        : typeof legacy.updatedAt === 'number'
          ? new Date(legacy.updatedAt).toISOString()
          : new Date().toISOString(),
    payload: legacy as T,
  };
}

/**
 * Ejecuta el pipeline migración -> sanitización correspondiente al `docType`.
 * Si no hay handler registrado para ese `docType`, devuelve el payload intacto (nunca aplica migrateCvData por error).
 */
export function processLoadedDocumentPayload<T = any>(
  docType: string,
  payload: unknown,
  fromVersion: number = 1
): T | null {
  if (!payload || typeof payload !== 'object') return null;

  const handler = schemaHandlers.get(docType);
  if (!handler) {
    return payload as T;
  }

  const migrated = handler.migrate ? handler.migrate(payload, fromVersion) : payload;
  return handler.sanitize(migrated) as T | null;
}
