/**
 * cvStorageService.ts
 * Re-exports CV-specific methods backed by the generic documentStorageService.ts
 */

export { 
  supabase, 
  checkStorageStatus,
  getSavedCVsList,
  saveCV,
  saveDocumentAs,
  loadCVById,
  deleteCVById,
  saveDocument,
  loadDocumentById,
  getSavedDocumentsList,
  deleteDocumentById
} from '../../../shared/core/storage/documentStorageService';

import { saveDocumentAs } from '../../../shared/core/storage/documentStorageService';

export const saveCVAs = (cvData: any, versionLabel?: string) => saveDocumentAs(cvData, versionLabel, 'cv');

export const DEFAULT_PRESET_CVS = [];
