import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const checkStorageStatus = () => {
  if (supabase) {
    return { isCloud: true, label: 'Nube Supabase Conectada' };
  }
  return { isCloud: false, label: 'Almacenamiento Local (IndexedDB)' };
};
