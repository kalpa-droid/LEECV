/**
 * EncryptedVaultDriver — Driver estrictamente local y cifrado (Fase 3).
 *
 * Aislamiento por construcción:
 * - Este módulo NO importa `supabaseClient`, `dataAccessLayer`, `syncEngine` ni ningún módulo de red.
 * - La regla `[vault-network-isolation]` de `scripts/check-import-graph.ts` bloquea en CI cualquier
 *   intento de agregar dependencias de red aquí.
 * - Solo almacena sobres cifrados/sellos locales en IndexedDB y metadatos mínimos (id + título) en localStorage.
 */

import type {
  DocumentPersistenceDriver,
  StoredDocumentEnvelope,
  StoredDocumentSummary,
} from '../../contracts/persistenceContract';
import { idbStorage } from './storageIndexedDB';
import { unwrapDocumentEnvelope } from './documentEnvelope';
import { reportSilentError } from '../utils/errorHandler';

const getVaultDocKey = (docType: string, id: string): string => `doc_${docType}_data_${id}`;
const getVaultListKey = (docType: string): string => `doc_${docType}_saved_list`;

function readVaultList(docType: string): any[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getVaultListKey(docType));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    reportSilentError(err, `encryptedVaultDriver.readList[${docType}]`);
    return [];
  }
}

function writeVaultList(docType: string, items: any[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(getVaultListKey(docType), JSON.stringify(items));
  } catch (err) {
    reportSilentError(err, `encryptedVaultDriver.writeList[${docType}]`);
  }
}

export const encryptedVaultDriver: DocumentPersistenceDriver<string> = {
  kind: 'local-encrypted',

  async list(docType: string): Promise<readonly StoredDocumentSummary<string>[]> {
    return readVaultList(docType)
      .filter((item) => item && typeof item.id === 'string')
      .map((item) => ({
        id: item.id,
        docType,
        title: String(item.title || ''),
        updatedAt: String(item.updated_at || item.updatedAt || new Date().toISOString()),
        revision: typeof item.revision === 'number' ? item.revision : 1,
        cloudBackupState: 'disabled' as const,
      }))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  async load<T>(id: string, docType: string): Promise<StoredDocumentEnvelope<T, string> | null> {
    try {
      const raw = await idbStorage.getItem(getVaultDocKey(docType, id));
      return raw ? unwrapDocumentEnvelope<T>(raw, docType) : null;
    } catch (err) {
      reportSilentError(err, `encryptedVaultDriver.load[${docType}:${id}]`);
      return null;
    }
  },

  async save<T>(envelope: StoredDocumentEnvelope<T, string>): Promise<StoredDocumentEnvelope<T, string>> {
    const existing = await encryptedVaultDriver.load<T>(envelope.id, envelope.docType);
    const stored: StoredDocumentEnvelope<T, string> = {
      ...envelope,
      envelopeVersion: 1,
      revision: Math.max(envelope.revision, (existing?.revision ?? 0) + 1),
      updatedAt: envelope.updatedAt || new Date().toISOString(),
    };

    await idbStorage.setItem(getVaultDocKey(stored.docType, stored.id), stored);

    // En localStorage solo vive el sello mínimo (id + título + fecha), nunca contenido sensible
    const list = readVaultList(stored.docType);
    const shell = {
      id: stored.id,
      doc_type_id: stored.docType,
      title: stored.title,
      candidate_name: '',
      updated_at: stored.updatedAt,
      revision: stored.revision,
    };
    const idx = list.findIndex((item) => item?.id === stored.id);
    if (idx >= 0) list[idx] = shell;
    else list.unshift(shell);
    writeVaultList(stored.docType, list);

    return stored;
  },

  async delete(id: string, docType: string): Promise<void> {
    await idbStorage.removeItem(getVaultDocKey(docType, id));
    const filtered = readVaultList(docType).filter((item) => item?.id !== id);
    writeVaultList(docType, filtered);
  },
};
