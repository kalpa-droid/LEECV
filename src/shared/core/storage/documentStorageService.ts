import { supabase, checkStorageStatus } from '../lib/supabaseClient';
import { dal } from './dataAccessLayer';
import { optimizeCVImagesToWebP } from '../utils/imageCompressor';
import { idbStorage } from '../../../modules/cv-builder/services/storageIndexedDB';
import { SaveDocumentResult, DocumentRecord } from '../../../types/document';
import { getDocumentTypeConfig } from '../capabilities/capabilityRegistry';
import { getMonthNameEs } from '../utils/formatDate';
import { backupCvToGoogleDrive } from './driveBackupService';
import { dedupAssetsForLocalStorage, reconstructCvDataFromParts } from './driveDocumentPackager';
import { migrateCvData } from './cvMigrationEngine';

export { supabase, checkStorageStatus };

const getStorageKeyForType = (docTypeId: string) => `doc_${docTypeId}_saved_list`;

export const DEFAULT_PRESET_CVS: DocumentRecord[] = [];

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
          if (item && item.id) {
            map.set(item.id, item);
          }
        });
      }
    }
  } catch (err) {
    console.warn('LocalStorage summary list read error:', err);
  }

  // 2. Sync from Supabase in background
  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const remoteCVs = await dal.cvs.listByUser(user.id);
        if (remoteCVs && remoteCVs.length > 0) {
          remoteCVs.forEach(remote => {
            const formattedTitle = remote.title || `CV - ${remote.candidate_name || 'DOCUMENTO'}`;
            const rec: DocumentRecord = {
              id: remote.id,
              doc_type_id: docTypeId,
              title: formattedTitle,
              candidate_name: remote.candidate_name || '',
              dni: remote.dni || '',
              updated_at: remote.updated_at,
              syncState: 'synced',
              ...(remote.version_label ? { version_label: remote.version_label } : {})
            };
            map.set(remote.id, rec);
          });
        }
      }
    } catch (err) {
      console.warn('Supabase listByUser sync error:', err);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
};

const saveDocumentInternal = async (
  docData: any,
  docTypeId: string = 'cv',
  versionLabel?: string
): Promise<SaveDocumentResult> => {
  if (!docData) {
    return { success: false, error: 'DocumentData es nulo o indefinido' };
  }

  const docConfig = getDocumentTypeConfig(docTypeId);
  const id = docData.id || `doc_${docTypeId}_${Date.now()}`;

  try {
    const optimizedDoc = await optimizeCVImagesToWebP(docData);

    const candidateName = (
      optimizedDoc.personalInfo?.fullName || 
      `${optimizedDoc.personalInfo?.surname || ''} ${optimizedDoc.personalInfo?.givenNames || ''}`.trim() || 
      'DOCUMENTO'
    ).trim();
    const monthName = getMonthNameEs();
    const yearNum = new Date().getFullYear();
    const labelSuffix = versionLabel ? ` — ${versionLabel}` : '';
    const formattedTitle = `${docConfig.name.toUpperCase()} - ${candidateName}${labelSuffix} - ${monthName} - ${yearNum}`;
    const nowIso = new Date().toISOString();

    const summaryRecord: DocumentRecord = {
      id,
      doc_type_id: docTypeId,
      title: formattedTitle,
      candidate_name: candidateName,
      dni: optimizedDoc.personalInfo?.dni || '',
      updated_at: nowIso,
      ...(versionLabel ? { version_label: versionLabel } : {})
    };

    const fullDocObject = {
      ...optimizedDoc,
      id,
      doc_type_id: docTypeId,
      updated_at: nowIso,
      ...(versionLabel ? { version_label: versionLabel } : {})
    };

    // Deduplicación en el borde de almacenamiento (referencias asset://)
    const storedDocObject = await dedupAssetsForLocalStorage(fullDocObject);

    // 1. Primary Save to IndexedDB (Unlimited Capacity)
    await idbStorage.setItem(`doc_${docTypeId}_data_${id}`, storedDocObject);
    if (docTypeId === 'cv') {
      await idbStorage.setItem('cv_data_' + id, storedDocObject);
      await idbStorage.setItem('cv_premium_data', storedDocObject);
    }

    // 2. Save summary list to LocalStorage (liviano)
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
    } catch (lerr) {
      console.warn('Advertencia summary list LocalStorage:', lerr);
    }

    let syncState: 'local' | 'synced' | 'pending' = 'local';
    let driveSyncState: 'not-configured' | 'synced' | 'pending' = 'pending';

    // 3. Sync to Supabase in parallel
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const success = await dal.cvs.upsert({
            id,
            user_id: user.id,
            title: summaryRecord.title,
            candidate_name: summaryRecord.candidate_name,
            dni: summaryRecord.dni,
            cv_data: storedDocObject,
            updated_at: summaryRecord.updated_at
          });
          syncState = success ? 'synced' : 'pending';
        }
      } catch (err) {
        console.warn('Error conectando a Supabase:', err);
        syncState = 'pending';
      }
    }

    // 4. Respaldo incremental en segundo plano a Google Drive
    if (docTypeId === 'cv') {
      backupCvToGoogleDrive(fullDocObject).then(res => {
        if (res.success) {
          summaryRecord.driveSyncState = 'synced';
        }
      }).catch(err => {
        console.warn('Advertencia en respaldo a Google Drive:', err);
      });
    }

    return { 
      success: true, 
      syncState,
      driveSyncState,
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
 * Save any document type to storage (IndexedDB + LocalStorage Summary + Cloud Sync)
 */
export const saveDocument = async (docData: any, docTypeId: string = 'cv'): Promise<SaveDocumentResult> => {
  return saveDocumentInternal(docData, docTypeId);
};

/**
 * Save document as a new independent version with a custom version label
 */
export const saveDocumentAs = async (
  docData: any,
  versionLabel?: string,
  docTypeId: string = 'cv'
): Promise<SaveDocumentResult> => {
  const newId = `doc_${docTypeId}_${Date.now()}`;
  const dataWithNewId = { ...docData, id: newId };
  return saveDocumentInternal(dataWithNewId, docTypeId, versionLabel);
};

/**
 * Load a single document by ID with asset hydration and schema migration
 */
export const loadDocumentById = async (id: string, docTypeId: string = 'cv'): Promise<any> => {
  let raw: any = null;

  // 1. Check IndexedDB
  try {
    const idbData = await idbStorage.getItem(`doc_${docTypeId}_data_${id}`) || await idbStorage.getItem(`cv_data_${id}`);
    if (idbData) raw = idbData;
  } catch (err) {
    console.warn('idbStorage fetch error:', err);
  }

  // 2. Check Supabase
  if (!raw && supabase) {
    try {
      const cvData = await dal.cvs.getById(id);
      if (cvData) raw = cvData;
    } catch (err) {
      console.warn('Supabase fetch error:', err);
    }
  }

  // 3. Fallback LocalStorage
  if (!raw) {
    try {
      const stored = localStorage.getItem(`doc_${docTypeId}_data_${id}`) || localStorage.getItem(`cv_data_${id}`);
      if (stored) raw = JSON.parse(stored);
    } catch {}
  }

  if (!raw) return null;

  // 4. Hidratar referencias de assets si existen (asset://<hash>)
  const hydrated = await reconstructCvDataFromParts(raw);

  // 5. Aplicar migración universal de esquema
  return migrateCvData(hydrated);
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
      await dal.cvs.delete(id);
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
