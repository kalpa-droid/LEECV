import { supabase, checkStorageStatus } from '../lib/supabaseClient';
import { optimizeCVImagesToWebP } from '../utils/imageCompressor';
import { standardExampleCVData } from '../../../data/initialCVData';
import { idbStorage } from '../../../modules/cv-builder/services/storageIndexedDB';
import { SaveDocumentResult, DocumentRecord } from '../../../types/document';
import { getDocumentTypeConfig } from '../capabilities/capabilityRegistry';

export { supabase, checkStorageStatus };

const getStorageKeyForType = (docTypeId: string) => `doc_${docTypeId}_saved_list`;

const getMonthNameEs = (date = new Date()) => {
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return months[date.getMonth()];
};

/**
 * Get all saved documents of a given type from LocalStorage / IndexedDB / Cloud
 */
export const getSavedDocumentsList = async (docTypeId: string = 'cv'): Promise<DocumentRecord[]> => {
  const map = new Map<string, DocumentRecord>();
  const storageKey = getStorageKeyForType(docTypeId);

  // 1. Read Local Storage summary list
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        parsed.forEach((item: DocumentRecord) => {
          if (item && item.id && item.id !== 'cv_ejemplo_estandar') {
            map.set(item.id, {
              id: item.id,
              doc_type_id: item.doc_type_id || docTypeId,
              title: item.title,
              candidate_name: item.candidate_name,
              dni: item.dni,
              updated_at: item.updated_at
            });
          }
        });
      }
    }
  } catch (err) {
    console.error(`Error leyendo LocalStorage para ${docTypeId}:`, err);
  }

  // 2. Read Cloud Supabase documents if available
  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('cvs')
          .select('id, title, candidate_name, dni, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          data.forEach((item: any) => {
            if (item && item.id && item.id !== 'cv_ejemplo_estandar') {
              map.set(item.id, {
                ...item,
                doc_type_id: docTypeId
              });
            }
          });
        }
      }
    } catch (err) {
      console.warn(`Advertencia leyendo Supabase para ${docTypeId}:`, err);
    }
  }

  const result = Array.from(map.values());
  result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  return result;
};

/**
 * Save any document type to storage (IndexedDB + LocalStorage Summary + Cloud Sync)
 */
export const saveDocument = async (docData: any, docTypeId: string = 'cv'): Promise<SaveDocumentResult> => {
  try {
    const docConfig = getDocumentTypeConfig(docTypeId);
    const optimizedDoc = docTypeId === 'cv' ? await optimizeCVImagesToWebP(docData) : docData;

    const id = docData.id || `doc_${docTypeId}_${Date.now()}`;
    const candidateName = (
      optimizedDoc.personalInfo?.fullName || 
      `${optimizedDoc.personalInfo?.surname || ''} ${optimizedDoc.personalInfo?.givenNames || ''}`.trim() || 
      'DOCUMENTO'
    ).trim();
    const monthName = getMonthNameEs();
    const yearNum = new Date().getFullYear();
    const formattedTitle = `${docConfig.name.toUpperCase()} - ${candidateName} - ${monthName} - ${yearNum}`;
    const nowIso = new Date().toISOString();

    const summaryRecord: DocumentRecord = {
      id,
      doc_type_id: docTypeId,
      title: formattedTitle,
      candidate_name: candidateName,
      dni: optimizedDoc.personalInfo?.dni || '',
      updated_at: nowIso
    };

    const fullDocObject = { ...optimizedDoc, id, doc_type_id: docTypeId, updated_at: nowIso };

    // 1. Primary Save to IndexedDB (Unlimited Capacity)
    await idbStorage.setItem(`doc_${docTypeId}_data_${id}`, fullDocObject);
    if (docTypeId === 'cv') {
      await idbStorage.setItem('cv_data_' + id, fullDocObject);
      await idbStorage.setItem('cv_premium_data', fullDocObject);
    }

    // 2. Save summary list to LocalStorage
    try {
      const storageKey = getStorageKeyForType(docTypeId);
      const list = await getSavedDocumentsList(docTypeId);
      const existingIdx = list.findIndex(item => item.id === id);
      if (existingIdx >= 0) {
        list[existingIdx] = summaryRecord;
      } else {
        list.unshift(summaryRecord);
      }
      localStorage.setItem(storageKey, JSON.stringify(list));
      if (docTypeId === 'cv') {
        localStorage.setItem('cv_premium_data', JSON.stringify(fullDocObject));
      }
    } catch (lerr) {
      console.warn('Advertencia summary list LocalStorage:', lerr);
    }

    let syncState: 'local' | 'synced' | 'pending' = 'local';

    // 3. Sync to Supabase in parallel
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase.from('cvs').upsert({
            id,
            user_id: user.id,
            title: summaryRecord.title,
            candidate_name: summaryRecord.candidate_name,
            dni: summaryRecord.dni,
            cv_data: fullDocObject,
            updated_at: summaryRecord.updated_at
          });
          if (!error) {
            syncState = 'synced';
          } else {
            console.error('Error guardando en Supabase:', error);
            syncState = 'pending';
          }
        }
      } catch (err) {
        console.warn('Error conectando a Supabase:', err);
        syncState = 'pending';
      }
    }

    return { 
      success: true, 
      syncState,
      record: summaryRecord, 
      title: summaryRecord.title, 
      doc_data: fullDocObject 
    };
  } catch (err) {
    console.error(`Error crítico al guardar documento [${docTypeId}]:`, err);
    return { success: false, error: err };
  }
};

/**
 * Load a single document by ID
 */
export const loadDocumentById = async (id: string, docTypeId: string = 'cv'): Promise<any> => {
  if (id === 'cv_ejemplo_estandar' && docTypeId === 'cv') return standardExampleCVData;

  // 1. Check IndexedDB
  try {
    const idbData = await idbStorage.getItem(`doc_${docTypeId}_data_${id}`) || await idbStorage.getItem(`cv_data_${id}`);
    if (idbData) return idbData;
  } catch (err) {
    console.warn('idbStorage fetch error:', err);
  }

  // 2. Check Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('cvs')
        .select('cv_data')
        .eq('id', id)
        .single();
      if (!error && data?.cv_data) {
        return data.cv_data;
      }
    } catch (err) {
      console.warn('Supabase fetch error:', err);
    }
  }

  // 3. Fallback LocalStorage
  try {
    const stored = localStorage.getItem(`doc_${docTypeId}_data_${id}`) || localStorage.getItem(`cv_data_${id}`);
    if (stored) return JSON.parse(stored);
  } catch {}

  return null;
};

/**
 * Delete a saved document by ID
 */
export const deleteDocumentById = async (id: string, docTypeId: string = 'cv'): Promise<void> => {
  const storageKey = getStorageKeyForType(docTypeId);
  try {
    await idbStorage.removeItem(`doc_${docTypeId}_data_${id}`);
    await idbStorage.removeItem(`cv_data_${id}`);
    const listStored = localStorage.getItem(storageKey);
    if (listStored) {
      const list = JSON.parse(listStored).filter((c: any) => c.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(list));
    }
    localStorage.removeItem(`doc_${docTypeId}_data_${id}`);
    localStorage.removeItem(`cv_data_${id}`);
  } catch (err) {
    console.error(`Error eliminando documento local [${docTypeId}]:`, err);
  }

  if (supabase) {
    try {
      await supabase.from('cvs').delete().eq('id', id);
    } catch (err) {
      console.warn('Error eliminando en Supabase:', err);
    }
  }
};

/**
 * Backward compatibility wrappers for CV-specific calls
 */
export const getSavedCVsList = () => getSavedDocumentsList('cv');
export const saveCV = (cvData: any) => saveDocument(cvData, 'cv');
export const loadCVById = (id: string) => loadDocumentById(id, 'cv');
export const deleteCVById = (id: string) => deleteDocumentById(id, 'cv');
