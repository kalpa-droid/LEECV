const DB_NAME = 'LEECV_IndexedDB';
const DB_VERSION = 1;
const STORE_NAME = 'cv_drafts';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está soportado en este navegador.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event: Event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event: Event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

const memoryStore = new Map<string, any>();

function getLocalStorageSafely(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof localStorage !== 'undefined' && localStorage) {
    return localStorage;
  }
  return null;
}

export const idbStorage = {
  async getItem(key: string): Promise<any> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      try {
        const ls = getLocalStorageSafely();
        if (ls) {
          const item = ls.getItem(key);
          return item ? JSON.parse(item) : null;
        }
        return memoryStore.get(key) ?? null;
      } catch {
        return memoryStore.get(key) ?? null;
      }
    }
  },

  async setItem(key: string, value: any): Promise<boolean> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch {
      try {
        const ls = getLocalStorageSafely();
        if (ls) {
          ls.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        } else {
          memoryStore.set(key, value);
        }
        return true;
      } catch {
        memoryStore.set(key, value);
        return true;
      }
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      try {
        const ls = getLocalStorageSafely();
        if (ls) {
          ls.removeItem(key);
        }
        memoryStore.delete(key);
      } catch {
        memoryStore.delete(key);
      }
    }
  },

  async keys(): Promise<string[]> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAllKeys();
        req.onsuccess = () => resolve((req.result as string[]) || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      try {
        const ls = getLocalStorageSafely();
        if (ls) {
          return Object.keys(ls);
        }
        return Array.from(memoryStore.keys());
      } catch {
        return Array.from(memoryStore.keys());
      }
    }
  }
};
