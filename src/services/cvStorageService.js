import { createClient } from '@supabase/supabase-js';
import { optimizeCVImagesToWebP } from '../utils/imageCompressor';
import { monicaBurgosCVData, standardExampleCVData } from '../data/initialCVData';

// Optional Supabase Client initialization
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const SAVED_CVS_KEY = 'cv_premium_saved_list';

export const DEFAULT_PRESET_CVS = [
  {
    id: "cv_monica_burgos",
    title: "CV Mónica Daniela Burgos (Trayectoria Completa)",
    candidate_name: "MÓNICA DANIELA BURGOS",
    dni: "29334206",
    updated_at: "2025-01-01T12:00:00.000Z",
    cv_data: monicaBurgosCVData
  },
  {
    id: "cv_ejemplo_estandar",
    title: "CV Ejemplo Profesional (Estándar 3 Registros)",
    candidate_name: "CAMILA VALERIA SOSA",
    dni: "35.892.104",
    updated_at: "2025-01-02T12:00:00.000Z",
    cv_data: standardExampleCVData
  }
];

/**
 * Get all saved CVs from LocalStorage and Cloud (if Supabase configured)
 */
export const getSavedCVsList = async () => {
  let localList = [];
  try {
    const stored = localStorage.getItem(SAVED_CVS_KEY);
    if (stored) {
      localList = JSON.parse(stored);
    } else {
      localList = DEFAULT_PRESET_CVS;
      localStorage.setItem(SAVED_CVS_KEY, JSON.stringify(DEFAULT_PRESET_CVS));
    }
  } catch (err) {
    console.error('Error cargando CVs locales:', err);
    localList = DEFAULT_PRESET_CVS;
  }

  // Ensure default presets are always available in the list
  DEFAULT_PRESET_CVS.forEach(preset => {
    if (!localList.some(item => item.id === preset.id)) {
      localList.push(preset);
    }
  });

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('cvs')
        .select('id, title, candidate_name, dni, updated_at')
        .order('updated_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase no disponible, usando almacenamiento local:', err);
    }
  }

  return localList;
};

/**
 * Save a CV to storage (with automatic WebP image compression)
 */
export const saveCV = async (cvData) => {
  const optimizedCV = await optimizeCVImagesToWebP(cvData);

  const id = cvData.id || `cv_${Date.now()}`;
  const record = {
    id,
    title: `CV ${optimizedCV.personalInfo?.fullName || 'Nuevo'}`,
    candidate_name: optimizedCV.personalInfo?.fullName || 'Sin Nombre',
    dni: optimizedCV.personalInfo?.dni || '',
    updated_at: new Date().toISOString(),
    cv_data: { ...optimizedCV, id }
  };

  // 1. Always save to local list
  try {
    const list = await getSavedCVsList();
    const existingIdx = list.findIndex(item => item.id === id);
    if (existingIdx >= 0) {
      list[existingIdx] = record;
    } else {
      list.unshift(record);
    }
    localStorage.setItem(SAVED_CVS_KEY, JSON.stringify(list));
    localStorage.setItem(`cv_data_${id}`, JSON.stringify(record.cv_data));
  } catch (err) {
    console.error('Error guardando en almacenamiento local:', err);
  }

  // 2. Try saving to Supabase if configured
  if (supabase) {
    try {
      const { error } = await supabase.from('cvs').upsert({
        id,
        title: record.title,
        candidate_name: record.candidate_name,
        dni: record.dni,
        cv_data: record.cv_data,
        updated_at: record.updated_at
      });
      if (error) console.error('Error guardando en Supabase:', error);
    } catch (err) {
      console.warn('Error conectando a Supabase:', err);
    }
  }

  return record;
};

/**
 * Load a single CV by ID
 */
export const loadCVById = async (id) => {
  if (id === 'cv_monica_burgos') return monicaBurgosCVData;
  if (id === 'cv_ejemplo_estandar') return standardExampleCVData;

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
      console.warn('Supabase fetch error, fallback local:', err);
    }
  }

  try {
    const stored = localStorage.getItem(`cv_data_${id}`);
    if (stored) return JSON.parse(stored);

    const listStored = localStorage.getItem(SAVED_CVS_KEY);
    if (listStored) {
      const list = JSON.parse(listStored);
      const item = list.find(c => c.id === id);
      if (item?.cv_data) return item.cv_data;
    }
  } catch (err) {
    console.error('Error leyendo CV local:', err);
  }

  return null;
};

/**
 * Delete a saved CV by ID
 */
export const deleteCVById = async (id) => {
  try {
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
