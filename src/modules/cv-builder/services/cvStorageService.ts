/**
 * cvStorageService.ts
 * Re-exports CV-specific methods backed by the generic documentStorageService.ts
 */

export { 
  supabase, 
  checkStorageStatus,
  getSavedCVsList,
  saveCV,
  loadCVById,
  deleteCVById,
  saveDocument,
  loadDocumentById,
  getSavedDocumentsList,
  deleteDocumentById
} from '../../../shared/core/storage/documentStorageService';

export const DEFAULT_PRESET_CVS = [];
