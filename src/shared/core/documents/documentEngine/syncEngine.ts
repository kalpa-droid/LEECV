import { supabase } from '../../storage/documentStorageService';
import { importLegacyCloudDocumentsOnce } from '../../storage/legacyCloudImporter';

export const syncEngine = {
  /**
   * Local-First (Fase 3): al iniciar sesión ejecuta únicamente la importación histórica
   * única desde `cvs` hacia `LocalDocumentStore` clasificada por `docType` real.
   * Ya no sobrescribe listas locales mezclando tipos ni sube `cv_data` completo.
   */
  syncAllLocalOnLogin: async () => {
    if (!supabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await importLegacyCloudDocumentsOnce(user.id);
    } catch (err) {
      console.warn('Error during syncAllLocalOnLogin', err);
    }
  },
};
