import { saveDocumentInternal, saveDocumentDraftLocal } from '../../storage/documentStorageService';

/**
 * Persistence Engine
 * Encapsulates the 3 explicit levels of saving according to the document lifecycle.
 */
export const persistenceEngine = {
  /**
   * 1. autosave
   * Guardado local y continuo en IndexedDB. No comprime excesivamente ni sube a la nube.
   */
  autosave: async (docData: any, docType: string) => {
    return saveDocumentDraftLocal(docData, docType);
  },
  
  /**
   * 2. confirm
   * Guardado explícito completo. Genera listado resumen, comprime, sube a IndexedDB,
   * Supabase (si tiene cloud_backup) y Google Drive (si tiene cloud_backup).
   */
  confirm: async (docData: any, docType: string, versionLabel?: string) => {
    return saveDocumentInternal(docData, docType, versionLabel);
  },
  
  /**
   * 3. flushAll
   * Guardado de emergencia síncrono al salir o cerrar pestaña.
   */
  flushAll: async (docData: any, docType: string) => {
    return saveDocumentInternal(docData, docType);
  }
};
