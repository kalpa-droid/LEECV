import { getSavedDocumentsList } from '../../storage/documentStorageService';
import { supabase } from '../../storage/documentStorageService';

export const syncEngine = {
  syncAllLocalOnLogin: async () => {
    if (!supabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Sincronizar todos los tipos de documento principales de forma asíncrona
      await Promise.allSettled([
        getSavedDocumentsList('cv'),
        getSavedDocumentsList('cover_letter'),
        getSavedDocumentsList('business_card'),
        getSavedDocumentsList('portfolio')
      ]);
    } catch (err) {
      console.warn('Error during syncAllLocalOnLogin', err);
    }
  }
};
