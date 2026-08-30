/**
 * Document & Capability Composition Architecture Types
 */

export interface CapabilityConfig {
  id: string;
  name: string;
  description: string;
  category: 'styling' | 'content' | 'attachments' | 'branding' | 'utility';
  defaultData: any;
}

export interface DocumentTypeConfig {
  id: string;
  name: string;
  description: string;
  iconName: string;
  capabilities: string[]; // Capability IDs used by this document type
  defaultPaperSize?: string;
  defaultActivePresetId?: string;
}

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
