/**
 * Document & Capability Composition Architecture Types
 *
 * `DocumentTypeId` se deriva directamente de `DOCUMENT_TYPE_REGISTRY`
 * (fuente única de verdad, cierra D10).
 */

import type {
  RegisteredDocumentTypeId,
  RegisteredDocumentTypeConfig,
} from '../shared/core/capabilities/capabilityRegistry';
import type { CapabilityConfig } from '../shared/contracts/appContract';

export type DocumentTypeId = RegisteredDocumentTypeId;
export type DocumentTypeConfig = RegisteredDocumentTypeConfig;
export type { CapabilityConfig };

export interface DocumentRecord {
  id: string;
  doc_type_id: string;
  title: string;
  candidate_name?: string;
  dni?: string;
  updated_at: string;
  syncState?: 'local' | 'synced' | 'pending';
  driveSyncState?: 'not-configured' | 'synced' | 'pending';
  version_label?: string;
  is_provisional?: boolean;
}
export interface SaveDocumentResult {
  success: boolean;
  syncState?: 'local' | 'synced' | 'pending';
  driveSyncState?: 'not-configured' | 'synced' | 'pending';
  record?: DocumentRecord;
  title?: string;
  doc_data?: any;
  error?: any;
}
