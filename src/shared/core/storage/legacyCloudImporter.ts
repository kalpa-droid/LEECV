/**
 * legacyCloudImporter.ts — Importación única de datos históricos desde `cvs` hacia Local-First (Fase 3).
 *
 * Comportamiento seguro para usuarios existentes:
 * 1. Se ejecuta como máximo UNA vez por `userId` (marca `leecv_legacy_cloud_imported_v1_<userId>`).
 * 2. Lee las filas históricas de `dal.cvs.listByUser(userId)` sin borrar nada en la nube.
 * 3. Clasifica el `docType` real de cada fila usando `inferDocumentTypeId(row.cv_data || row)`
 *    (resuelve D7: CVs, Cartas y Tarjetas quedan separados en su lista local real).
 * 4. Solo importa tipos cuyo registro sea `storage.kind === 'local'` (nunca `local-encrypted`).
 * 5. No sobrescribe documentos locales más recientes que el remoto.
 */

import { dal } from './dataAccessLayer';
import { localDocumentStore } from './localDocumentStore';
import { wrapDocumentEnvelope } from './documentEnvelope';
import {
  inferDocumentTypeId,
  isEncryptedVaultDocumentType,
} from '../capabilities/capabilityRegistry';
import { reportSilentError } from '../utils/errorHandler';

const IMPORT_MARKER_PREFIX = 'leecv_legacy_cloud_imported_v1_';
const inFlightByUser = new Map<string, Promise<LegacyCloudImportResult>>();

export interface LegacyCloudImportResult {
  alreadyImported: boolean;
  importedCount: number;
  skippedCount: number;
  byDocType: Record<string, number>;
}

export function getLegacyCloudImportedAt(userId: string): string | null {
  if (typeof localStorage === 'undefined' || !userId) return null;
  try {
    return localStorage.getItem(`${IMPORT_MARKER_PREFIX}${userId}`);
  } catch {
    return null;
  }
}

export function resetLegacyCloudImportCacheForTests(): void {
  inFlightByUser.clear();
}

export async function importLegacyCloudDocumentsOnce(userId: string): Promise<LegacyCloudImportResult> {
  if (!userId) {
    return { alreadyImported: true, importedCount: 0, skippedCount: 0, byDocType: {} };
  }

  if (getLegacyCloudImportedAt(userId)) {
    return { alreadyImported: true, importedCount: 0, skippedCount: 0, byDocType: {} };
  }

  const existingPromise = inFlightByUser.get(userId);
  if (existingPromise) return existingPromise;

  const task = (async (): Promise<LegacyCloudImportResult> => {
    const byDocType: Record<string, number> = {};
    let importedCount = 0;
    let skippedCount = 0;

    try {
      const remoteRows = await dal.cvs.listByUser(userId);
      if (Array.isArray(remoteRows)) {
        for (const row of remoteRows) {
          if (!row || typeof row.id !== 'string') {
            skippedCount++;
            continue;
          }

          // Recuperar payload completo si el listado solo devolvió metadatos
          const fullPayload = row.cv_data ?? (await dal.cvs.getById(row.id)) ?? null;
          const classificationSource = fullPayload
            ? { ...fullPayload, id: row.id, doc_type_id: row.doc_type_id ?? fullPayload.doc_type_id }
            : row;

          const trueDocType = inferDocumentTypeId(classificationSource);
          if (isEncryptedVaultDocumentType(trueDocType)) {
            skippedCount++;
            continue;
          }

          const existingLocal = await localDocumentStore.load(row.id, trueDocType);
          const remoteTs = row.updated_at ? new Date(row.updated_at).getTime() : 0;
          const localTs = existingLocal?.updatedAt ? new Date(existingLocal.updatedAt).getTime() : 0;

          if (existingLocal && localTs >= remoteTs) {
            skippedCount++;
            continue;
          }

          const payloadToSave = fullPayload
            ? { ...fullPayload, id: row.id, doc_type_id: trueDocType }
            : { id: row.id, doc_type_id: trueDocType, title: row.title || '' };

          const envelope = wrapDocumentEnvelope({
            id: row.id,
            docType: trueDocType,
            title: row.title || `${trueDocType.toUpperCase()} - ${row.candidate_name || 'DOCUMENTO'}`,
            displaySubtitle: row.candidate_name || '',
            payload: payloadToSave,
            updatedAt: row.updated_at || new Date().toISOString(),
            previousRevision: existingLocal?.revision ?? 0,
          });

          await localDocumentStore.save(envelope);
          importedCount++;
          byDocType[trueDocType] = (byDocType[trueDocType] || 0) + 1;
        }
      }

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`${IMPORT_MARKER_PREFIX}${userId}`, new Date().toISOString());
      }
    } catch (err) {
      reportSilentError(err, 'legacyCloudImporter.importLegacyCloudDocumentsOnce');
    } finally {
      inFlightByUser.delete(userId);
    }

    return {
      alreadyImported: false,
      importedCount,
      skippedCount,
      byDocType,
    };
  })();

  inFlightByUser.set(userId, task);
  return task;
}
