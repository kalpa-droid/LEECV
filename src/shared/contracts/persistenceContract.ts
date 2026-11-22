/**
 * Contratos puros de persistencia Local-First (0 dependencias externas).
 *
 * Invariante clave:
 * - Todo documento vive primero en almacenamiento local (`LocalDocumentStore` o `EncryptedVaultDriver`).
 * - Solo los tipos con `storage.kind === 'local'` y `cloudBackup` declarado pueden proyectar
 *   texto estructurado ligero a la nube (opt-in del usuario).
 * - Los tipos con `storage.kind === 'local-encrypted'` no admiten `cloudBackup` a nivel de tipos.
 */

export interface CloudBackupSpec {
  readonly projection: 'structured-text';
  readonly maxBytes: number;
}

export type StoragePolicy =
  | {
      readonly kind: 'local';
      readonly cloudBackup?: CloudBackupSpec;
    }
  | {
      readonly kind: 'local-encrypted';
      readonly cloudBackup?: never;
    };

export interface StoredDocumentEnvelope<T = unknown, TDocType extends string = string> {
  readonly envelopeVersion: 1;
  readonly id: string;
  readonly docType: TDocType;
  readonly schemaVersion: number;
  readonly revision: number;
  readonly title: string;
  readonly displaySubtitle?: string;
  readonly updatedAt: string;
  readonly payload: T;
}

export interface StoredDocumentSummary<TDocType extends string = string> {
  readonly id: string;
  readonly docType: TDocType;
  readonly title: string;
  readonly displaySubtitle?: string;
  readonly updatedAt: string;
  readonly revision: number;
  readonly isProvisional?: boolean;
  readonly versionLabel?: string;
  readonly cloudBackupState?: 'disabled' | 'local-only' | 'backed-up' | 'pending';
}

export type LocalAssetUri = `asset://${string}`;

export interface StoredAssetMeta {
  readonly id: string;
  readonly docId: string;
  readonly mimeType: string;
  readonly byteSize: number;
  readonly createdAt: string;
}

export interface LocalAssetStoreContract {
  putAsset(docId: string, blob: Blob | Uint8Array | string, mimeType: string): Promise<LocalAssetUri>;
  getAsset(uri: LocalAssetUri): Promise<{ data: Blob | string; mimeType: string } | null>;
  deleteAsset(uri: LocalAssetUri): Promise<void>;
  deleteDocumentAssets(docId: string): Promise<void>;
  listDocumentAssets(docId: string): Promise<readonly StoredAssetMeta[]>;
}

export interface CloudBackupProjection<TProjection = Record<string, unknown>> {
  readonly docId: string;
  readonly docType: string;
  readonly schemaVersion: number;
  readonly revision: number;
  readonly title: string;
  readonly updatedAt: string;
  readonly projection: TProjection;
}

export interface CloudBackupProjector<TData = unknown, TProjection = Record<string, unknown>> {
  readonly toCloudProjection: (data: TData) => TProjection;
  readonly fromCloudProjection: (projection: TProjection, defaults: TData) => TData;
}

export interface DocumentPersistenceDriver<TDocType extends string = string> {
  readonly kind: StoragePolicy['kind'];
  list(docType: TDocType): Promise<readonly StoredDocumentSummary<TDocType>[]>;
  load<T>(id: string, docType: TDocType): Promise<StoredDocumentEnvelope<T, TDocType> | null>;
  save<T>(envelope: StoredDocumentEnvelope<T, TDocType>): Promise<StoredDocumentEnvelope<T, TDocType>>;
  delete(id: string, docType: TDocType): Promise<void>;
}

export type SyncConflictResolution = 'keep-local-copy' | 'accept-remote' | 'merged';
