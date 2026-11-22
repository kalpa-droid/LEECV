/**
 * CloudBackupReplicator — Respaldo en nube estrictamente opt-in de texto estructurado (Fase 4).
 *
 * - Desactivado por defecto (`cloudBackupEnabled = false`): nada sale del equipo sin activación explícita.
 * - Solo replica tipos cuyo registro declara `storage.cloudBackup` (CV, Tarjeta, Carta).
 * - Valida toda proyección con `validateCloudBackupProjection` (sin diseños, sin imágenes/base64, bajo tope de bytes).
 * - Concurrencia optimista por `revision`: si el respaldo remoto es más nuevo, conserva copia local sin pisar.
 * - Tolera entornos donde aún no corrió la migración SQL (`42P01`) sin romper el guardado local.
 */

import type { StoredDocumentEnvelope } from '../../contracts/persistenceContract';
import { supabase } from '../lib/supabaseClient';
import {
  getCloudBackupProjector,
  validateCloudBackupProjection,
} from './cloudBackupProjections';
import { localDocumentStore } from './localDocumentStore';
import { wrapDocumentEnvelope } from './documentEnvelope';
import { getDocumentTypeConfig } from '../capabilities/capabilityRegistry';
import { reportSilentError } from '../utils/errorHandler';

const CLOUD_BACKUP_OPT_IN_KEY = 'leecv_cloud_backup_opt_in_v1';

export interface CloudReplicationResult {
  status: 'disabled' | 'not-eligible' | 'backed-up' | 'conflict' | 'rejected' | 'skipped-no-auth' | 'error';
  reason?: string;
  remoteRevision?: number;
}

export interface CloudRestoreResult {
  restoredCount: number;
  conflictsKeptLocal: number;
  skippedCount: number;
}

export function isCloudBackupOptInEnabled(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(CLOUD_BACKUP_OPT_IN_KEY) === 'true';
  } catch {
    return false;
  }
}

export async function setCloudBackupOptInEnabled(enabled: boolean): Promise<void> {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(CLOUD_BACKUP_OPT_IN_KEY, enabled ? 'true' : 'false');
    } catch (err) {
      reportSilentError(err, 'cloudBackupReplicator.setOptIn.localStorage');
    }
  }

  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_preferences').upsert({
      user_id: user.id,
      cloud_backup_enabled: enabled,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    // Tolerar migración pendiente (42P01) sin bloquear al usuario
    reportSilentError(err, 'cloudBackupReplicator.setOptIn.supabase');
  }
}

export async function replicateDocumentBackupIfEnabled(
  envelope: StoredDocumentEnvelope<any, string>
): Promise<CloudReplicationResult> {
  if (!isCloudBackupOptInEnabled()) {
    return { status: 'disabled' };
  }

  const config = getDocumentTypeConfig(envelope.docType);
  if (config.storage.kind !== 'local' || !('cloudBackup' in config.storage) || !config.storage.cloudBackup) {
    return { status: 'not-eligible', reason: `storage.kind=${config.storage.kind}` };
  }

  const projector = getCloudBackupProjector(envelope.docType);
  if (!projector) {
    return { status: 'not-eligible', reason: 'sin proyector registrado' };
  }

  const projection = projector.toCloudProjection(envelope.payload);
  const validation = validateCloudBackupProjection(envelope.docType, projection);
  if (!validation.valid) {
    return { status: 'rejected', reason: validation.error };
  }

  if (!supabase) {
    return { status: 'skipped-no-auth' };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { status: 'skipped-no-auth' };

    // Concurrencia optimista: revisar si existe una revisión remota más nueva
    const { data: existingRemote, error: selectErr } = await supabase
      .from('document_backups')
      .select('revision, updated_at')
      .eq('user_id', user.id)
      .eq('doc_id', envelope.id)
      .maybeSingle();

    if (selectErr) {
      if ((selectErr as any)?.code === '42P01') {
        return { status: 'error', reason: 'migracion_pendiente_document_backups' };
      }
      reportSilentError(selectErr, 'cloudBackupReplicator.checkRemoteRevision');
      return { status: 'error', reason: selectErr.message };
    }

    if (existingRemote && typeof existingRemote.revision === 'number' && existingRemote.revision > envelope.revision) {
      return {
        status: 'conflict',
        reason: 'remote_revision_newer',
        remoteRevision: existingRemote.revision,
      };
    }

    const { error: upsertErr } = await supabase.from('document_backups').upsert({
      user_id: user.id,
      doc_id: envelope.id,
      doc_type: envelope.docType,
      schema_version: envelope.schemaVersion,
      revision: envelope.revision,
      title: envelope.title,
      projection,
      updated_at: envelope.updatedAt,
    });

    if (upsertErr) {
      reportSilentError(upsertErr, 'cloudBackupReplicator.upsert');
      return { status: 'error', reason: upsertErr.message };
    }

    return { status: 'backed-up' };
  } catch (err: any) {
    reportSilentError(err, 'cloudBackupReplicator.replicate');
    return { status: 'error', reason: err?.message || 'unknown_error' };
  }
}

/**
 * Restaura en este equipo las proyecciones de texto respaldadas en `document_backups`,
 * aplicando el diseño por defecto local de cada tipo sin pisar copias locales más recientes.
 */
export async function restoreCloudBackupsToLocal(
  buildDefaultsForType: (docType: string) => Record<string, unknown> = () => ({})
): Promise<CloudRestoreResult> {
  if (!supabase) return { restoredCount: 0, conflictsKeptLocal: 0, skippedCount: 0 };

  let restoredCount = 0;
  let conflictsKeptLocal = 0;
  let skippedCount = 0;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { restoredCount: 0, conflictsKeptLocal: 0, skippedCount: 0 };

    const { data: rows, error } = await supabase
      .from('document_backups')
      .select('doc_id, doc_type, schema_version, revision, title, projection, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error || !Array.isArray(rows)) {
      if (error) reportSilentError(error, 'cloudBackupReplicator.restore.select');
      return { restoredCount: 0, conflictsKeptLocal: 0, skippedCount: 0 };
    }

    for (const row of rows) {
      const projector = getCloudBackupProjector(row.doc_type);
      if (!projector || !row.projection || typeof row.projection !== 'object') {
        skippedCount++;
        continue;
      }

      const existingLocal = await localDocumentStore.load(row.doc_id, row.doc_type);
      if (existingLocal && existingLocal.revision >= row.revision) {
        // Conservar copia local más reciente (sin sobrescribir silenciosamente)
        conflictsKeptLocal++;
        continue;
      }

      const defaults = buildDefaultsForType(row.doc_type);
      const hydrated = projector.fromCloudProjection(row.projection, defaults);
      const envelope = wrapDocumentEnvelope({
        id: row.doc_id,
        docType: row.doc_type,
        title: row.title || getDocumentTypeConfig(row.doc_type).defaultTitle,
        payload: { ...hydrated, id: row.doc_id, doc_type_id: row.doc_type },
        schemaVersion: row.schema_version || 1,
        previousRevision: Math.max(0, (row.revision || 1) - 1),
        updatedAt: row.updated_at || new Date().toISOString(),
      });

      await localDocumentStore.save(envelope);
      restoredCount++;
    }
  } catch (err) {
    reportSilentError(err, 'cloudBackupReplicator.restore');
  }

  return { restoredCount, conflictsKeptLocal, skippedCount };
}
