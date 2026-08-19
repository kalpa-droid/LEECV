import { supabase, checkStorageStatus } from '../../../lib/supabaseClient';
import { optimizeCVImagesToWebP } from '../../../utils/imageCompressor';
import { standardExampleCVData } from '../../../data/initialCVData';
import { idbStorage } from './storageIndexedDB';

export { supabase, checkStorageStatus };

const SAVED_CVS_KEY = 'cv_premium_saved_list';

const getMonthNameEs = (date = new Date()) => {
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return months[date.getMonth()];
};

export const DEFAULT_PRESET_CVS = [
  {
    id: "cv_ejemplo_estandar",
    title: "CV - VALERIA SOLEDAD MEDINA - Agosto - 2025",
    candidate_name: "VALERIA SOLEDAD MEDINA",
    dni: "34.591.208",
    updated_at: "2025-01-02T12:00:00.000Z"
  }
];

/**
 * Get all saved CVs from LocalStorage / IndexedDB / Cloud
 */
export const getSavedCVsList = async () => {
  let localList = [];
  try {
    const stored = localStorage.getItem(SAVED_CVS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Exclude sample preset from saved modal list as requested
      localList = (Array.isArray(parsed) ? parsed : []).filter(item => item.id !== 'cv_ejemplo_estandar').map(item => ({
        id: item.id,
        title: item.title,
        candidate_name: item.candidate_name,
        dni: item.dni,
        updated_at: item.updated_at
      }));
    }
  } catch (err) {
    console.error('Error cargando CVs locales:', err);
    localList = [];
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('cvs')
        .select('id, title, candidate_name, dni, updated_at')
        .order('updated_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.filter(item => item.id !== 'cv_ejemplo_estandar');
      }
    } catch (err) {
      console.warn('Supabase no disponible, usando almacenamiento IndexedDB local:', err);
    }
  }

  return localList;
};

/**
 * Save a CV to storage (IndexedDB + LocalStorage Summary + Cloud Sync)
 */
export const saveCV = async (cvData) => {
  try {
    const optimizedCV = await optimizeCVImagesToWebP(cvData);

    const id = cvData.id || `cv_${Date.now()}`;
    const candidateName = (
      optimizedCV.personalInfo?.fullName || 
      `${optimizedCV.personalInfo?.surname || ''} ${optimizedCV.personalInfo?.givenNames || ''}`.trim() || 
      'POSTULANTE'
    ).trim();
    const monthName = getMonthNameEs();
    const yearNum = new Date().getFullYear();
    const formattedTitle = `CV - ${candidateName} - ${monthName} - ${yearNum}`;
    const nowIso = new Date().toISOString();

    const summaryRecord = {
      id,
      title: formattedTitle,
      candidate_name: candidateName,
      dni: optimizedCV.personalInfo?.dni || '',
      updated_at: nowIso
    };

    const fullCVObject = { ...optimizedCV, id, updated_at: nowIso };

    // 1. Primary Save to IndexedDB (Unlimited Capacity) & Local Active Key
    await idbStorage.setItem(`cv_data_${id}`, fullCVObject);
    await idbStorage.setItem('cv_premium_data', fullCVObject);

    // 2. Save lightweight summary list to LocalStorage
    try {
      const list = await getSavedCVsList();
      const existingIdx = list.findIndex(item => item.id === id);
      if (existingIdx >= 0) {
        list[existingIdx] = summaryRecord;
      } else {
        list.unshift(summaryRecord);
      }
      localStorage.setItem(SAVED_CVS_KEY, JSON.stringify(list));
      localStorage.setItem('cv_premium_data', JSON.stringify(fullCVObject));
    } catch (lerr) {
      console.warn('Advertencia summary list LocalStorage:', lerr);
    }

    let syncState = 'local'; // 'local' | 'synced' | 'pending'

    // 3. Sync to Supabase in parallel if online
    if (supabase) {
      try {
        const { error } = await supabase.from('cvs').upsert({
          id,
          title: summaryRecord.title,
          candidate_name: summaryRecord.candidate_name,
          dni: summaryRecord.dni,
          cv_data: fullCVObject,
          updated_at: summaryRecord.updated_at
        });
        if (!error) {
          syncState = 'synced';
        } else {
          console.error('Error guardando en Supabase:', error);
          syncState = 'pending';
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
      cv_data: fullCVObject 
    };
  } catch (err) {
    console.error('Error crítico al guardar CV:', err);
    return { success: false, error: err };
  }
};

/**
 * Load a single CV by ID (IndexedDB -> Supabase -> LocalStorage)
 */
export const loadCVById = async (id) => {
  if (id === 'cv_ejemplo_estandar') return standardExampleCVData;

  // 1. Check IndexedDB
  try {
    const idbData = await idbStorage.getItem(`cv_data_${id}`);
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
    const stored = localStorage.getItem(`cv_data_${id}`);
    if (stored) return JSON.parse(stored);
  } catch {}

  return null;
};

/**
 * Delete a saved CV by ID
 */
export const deleteCVById = async (id) => {
  try {
    await idbStorage.removeItem(`cv_data_${id}`);
    const listStored = localStorage.getItem(SAVED_CVS_KEY);
    if (listStored) {
      const list = JSON.parse(listStored).filter(c => c.id !== id);
      localStorage.setItem(SAVED_CVS_KEY, JSON.stringify(list));
    }
    localStorage.removeItem(`cv_data_${id}`);
  } catch (err) {
    console.error('Error eliminando CV local:', err);
  }

  if (supabase) {
    try {
      await supabase.from('cvs').delete().eq('id', id);
    } catch (err) {
      console.warn('Error eliminando en Supabase:', err);
    }
  }
};
