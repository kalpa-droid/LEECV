/**
 * LocalDocumentStore — Driver Local-First en IndexedDB + índice liviano en localStorage (Fase 3).
 *
 * Garantías:
 * - Cero dependencias de red ni Supabase.
 * - Fuente de verdad única para listas, carga y guardado local.
 * - Aislamiento estricto por `docType` (neutraliza D7 de raíz).
 * - Sobres versionados con incremento monotónico de `revision`.
 */

import type {
  DocumentPersistenceDriver,
  StoredDocumentEnvelope,
  StoredDocumentSummary,
} from '../../contracts/persistenceContract';
import { idbStorage } from './storageIndexedDB';
import { unwrapDocumentEnvelope } from './documentEnvelope';
import { reportSilentError } from '../utils/errorHandler';

export const getLocalSummaryKey = (docType: string): string => `doc_${docType}_saved_list`;
export const getLocalDocKey = (docType: string, id: string): string => `doc_${docType}_data_${id}`;

function readLocalSummaryRaw(docType: string): any[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const stored = localStorage.getItem(getLocalSummaryKey(docType));
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    reportSilentError(err, `localDocumentStore.readSummary[${docType}]`);
    return [];
  }
}

function writeLocalSummaryRaw(docType: string, items: any[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(getLocalSummaryKey(docType), JSON.stringify(items));
  } catch (err) {
    reportSilentError(err, `localDocumentStore.writeSummary[${docType}]`);
  }
}

export const localDocumentStore: DocumentPersistenceDriver<string> = {
  kind: 'local',

  async list(docType: string): Promise<readonly StoredDocumentSummary<string>[]> {
    const rawItems = readLocalSummaryRaw(docType);
    const map = new Map<string, StoredDocumentSummary<string>>();

    for (const item of rawItems) {
      if (!item || typeof item.id !== 'string') continue;
      // Seguridad extra: ignorar entradas cuyo docType explícito no coincida
      const itemDocType = item.doc_type_id || item.docType || docType;
      if (itemDocType !== docType) continue;

      map.set(item.id, {
        id: item.id,
        docType,
        title: String(item.title || ''),
        displaySubtitle: item.candidate_name || item.displaySubtitle || undefined,
        updatedAt: String(item.updated_at || item.updatedAt || new Date().toISOString()),
        revision: typeof item.revision === 'number' ? item.revision : 1,
        isProvisional: Boolean(item.is_provisional ?? item.isProvisional),
        versionLabel: item.version_label || item.versionLabel || undefined,
        cloudBackupState: item.cloudBackupState || 'local-only',
      });
    }

    return [...map.values()].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  async load<T>(id: string, docType: string): Promise<StoredDocumentEnvelope<T, string> | null> {
    try {
      const idbRaw = await idbStorage.getItem(getLocalDocKey(docType, id));
      if (idbRaw) {
        return unwrapDocumentEnvelope<T>(idbRaw, docType);
      }
      if (typeof localStorage !== 'undefined') {
        const lsRaw = localStorage.getItem(getLocalDocKey(docType, id));
        if (lsRaw) {
          return unwrapDocumentEnvelope<T>(JSON.parse(lsRaw), docType);
        }
      }
      return null;
    } catch (err) {
      reportSilentError(err, `localDocumentStore.load[${docType}:${id}]`);
      return null;
    }
  },

  async save<T>(envelope: StoredDocumentEnvelope<T, string>): Promise<StoredDocumentEnvelope<T, string>> {
    const existing = await localDocumentStore.load<T>(envelope.id, envelope.docType);
    const nextRevision = Math.max(envelope.revision, (existing?.revision ?? 0) + 1);
    const stored: StoredDocumentEnvelope<T, string> = {
      ...envelope,
      envelopeVersion: 1,
      revision: nextRevision,
      updatedAt: envelope.updatedAt || new Date().toISOString(),
    };

    await idbStorage.setItem(getLocalDocKey(stored.docType, stored.id), stored);

    const summaryItems = readLocalSummaryRaw(stored.docType);
    const compatRecord = {
      id: stored.id,
      doc_type_id: stored.docType,
      title: stored.title,
      candidate_name: stored.displaySubtitle || '',
      dni: '',
      updated_at: stored.updatedAt,
      revision: stored.revision,
    };
    const idx = summaryItems.findIndex((item) => item?.id === stored.id);
    if (idx >= 0) {
      summaryItems[idx] = { ...summaryItems[idx], ...compatRecord };
    } else {
      summaryItems.unshift(compatRecord);
    }
    writeLocalSummaryRaw(stored.docType, summaryItems);

    return stored;
  },

  async delete(id: string, docType: string): Promise<void> {
    await idbStorage.removeItem(getLocalDocKey(docType, id));
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(getLocalDocKey(docType, id));
    }
    const filtered = readLocalSummaryRaw(docType).filter((item) => item?.id !== id);
    writeLocalSummaryRaw(docType, filtered);
  },
};
