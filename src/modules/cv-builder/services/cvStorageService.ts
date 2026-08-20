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

export const DEFAULT_PRESET_CVS = [
  {
    id: "cv_ejemplo_estandar",
    title: "CV - VALERIA SOLEDAD MEDINA - Agosto - 2025",
    candidate_name: "VALERIA SOLEDAD MEDINA",
    dni: "34.591.208",
    updated_at: "2025-01-02T12:00:00.000Z"
  }
];
