/**
 * Ultra-Fast Native IndexedDB Key-Value Storage Service
 * Provides unlimited, non-blocking binary & JSON storage for LEECV drafts and image assets
 */

const DB_NAME = 'LEECV_IndexedDB';
const DB_VERSION = 1;
const STORE_NAME = 'cv_drafts';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está soportado en este navegador.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

export const idbStorage = {
  async getItem(key) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('idbStorage.getItem fallback to localStorage:', err);
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch {
        return null;
      }
    }
  },

  async setItem(key, value) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('idbStorage.setItem fallback to localStorage:', err);
      try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        return true;
      } catch (lerr) {
        console.error('Error al guardar en localStorage fallback:', lerr);
        return false;
      }
    }
  },

  async removeItem(key) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
  }
};
