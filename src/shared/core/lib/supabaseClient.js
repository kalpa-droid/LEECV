import { createClient } from '@supabase/supabase-js';

let rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (rawUrl && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
  if (rawUrl.includes('.')) {
    rawUrl = `https://${rawUrl}`;
  } else {
    rawUrl = `https://${rawUrl}.supabase.co`;
  }
}

let client = null;
if (rawUrl && rawKey) {
  try {
    client = createClient(rawUrl, rawKey);
  } catch (err) {
    console.warn('No se pudo inicializar el cliente de Supabase:', err);
  }
}

export const supabase = client;

export const checkStorageStatus = () => {
  if (supabase) {
    return { isCloud: true, label: 'Nube Supabase Conectada' };
  }
  return { isCloud: false, label: 'Almacenamiento Local (IndexedDB)' };
};
