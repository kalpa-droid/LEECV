import { supabase, checkStorageStatus } from '../lib/supabaseClient';
import { dal } from './dataAccessLayer';
import { optimizeCVImagesToWebP } from '../utils/imageCompressor';
import { idbStorage } from './storageIndexedDB';
import { SaveDocumentResult, DocumentRecord } from '../../../types/document';
import {
  getCloudBackupDocumentTypeIds,
  getDocumentTypeConfig,
  isEncryptedVaultDocumentType,
  isLocalOnlyDocumentType,
} from '../capabilities/capabilityRegistry';
import { getMonthNameEs } from '../utils/formatDate';
import { dedupAssetsForLocalStorage, reconstructCvDataFromParts } from './driveDocumentPackager';
import { migrateCvData } from './cvMigrationEngine';
import { reportSilentError } from '../utils/errorHandler';
import {
  getDocumentSchemaHandler,
  processLoadedDocumentPayload,
  registerDocumentSchemaHandler,
  unwrapDocumentEnvelope,
  wrapDocumentEnvelope,
} from './documentEnvelope';
import { externalizeInlineAssets, hydrateInlineAssets, localAssetStore } from './localAssetStore';
import { getLocalDocKey, getLocalSummaryKey, localDocumentStore } from './localDocumentStore';
import { encryptedVaultDriver } from './encryptedVaultDriver';
import { importLegacyCloudDocumentsOnce } from './legacyCloudImporter';
import { replicateDocumentBackupIfEnabled } from './cloudBackupReplicator';
import { ensurePersistentStorage } from './storageResilienceEngine';

let persistentStorageRequested = false;

function triggerPersistentStorageOnce(): void {
  if (persistentStorageRequested || typeof navigator === 'undefined') return;
  persistentStorageRequested = true;
  void ensurePersistentStorage().catch(() => {});
}

export { supabase, checkStorageStatus };

// Registro por defecto de migradores/sanitizadores por docType (cierra D8: cada tipo usa su esquema).
for (const cvFamilyType of getCloudBackupDocumentTypeIds()) {
  registerDocumentSchemaHandler(cvFamilyType, {
    currentVersion: 2,
    migrate: (payload) => migrateCvData(payload),
    sanitize: (raw) => (raw && typeof raw === 'object' ? raw : null),
  });
}

if (!getDocumentSchemaHandler('editorial')) {
  registerDocumentSchemaHandler('editorial', {
    currentVersion: 1,
    sanitize: (raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const candidate = raw as Record<string, unknown>;
      const hasEditorialShape =
        Array.isArray(candidate.sections) ||
        (candidate.metadata && typeof candidate.metadata === 'object') ||
        typeof candidate.activePresetId === 'string';
      if (!hasEditorialShape) return null;
      return candidate;
    },
  });
}

const getStorageKeyForType = getLocalSummaryKey;

export const DEFAULT_PRESET_CVS: DocumentRecord[] = [];

function getDriverForDocType(docTypeId: string) {
  return isEncryptedVaultDocumentType(docTypeId) ? encryptedVaultDriver : localDocumentStore;
}

/**
 * Get all saved documents of a given type (Local-First).
 *
 * - Para tipos estrictamente locales (`book`, `planner`, `editorial`, `invoice`): nunca consulta la nube.
 * - Para tipos con respaldo nube histórico (`cv`, `cover_letter`, `business_card`): si el usuario
 *   inició sesión y aún no migró sus registros legados de `cvs`, ejecuta una importación única
 *   clasificada por `docType` real (cierra D7) y devuelve siempre la lista local aislada por tipo.
 */
export const getSavedDocumentsList = async (docTypeId: string = 'cv'): Promise<DocumentRecord[]> => {
  if (supabase && !isLocalOnlyDocumentType(docTypeId)) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await importLegacyCloudDocumentsOnce(user.id);
      }
    } catch (err) {
      console.warn('Legacy cloud import warning:', err);
      reportSilentError(err, 'documentStorageService.getSavedDocumentsList.legacyImport');
    }
  }

  const driver = getDriverForDocType(docTypeId);
  const summaries = await driver.list(docTypeId);

  return summaries.map((s) => ({
    id: s.id,
    doc_type_id: s.docType,
    title: s.title,
    candidate_name: s.displaySubtitle || '',
    dni: '',
    updated_at: s.updatedAt,
    syncState: 'local',
    ...(s.versionLabel ? { version_label: s.versionLabel } : {}),
    ...(s.isProvisional !== undefined ? { is_provisional: s.isProvisional } : {}),
  }));
};

export const saveDocumentInternal = async (
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
      optimizedDoc.metadata?.title ||
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
      ...(versionLabel ? { version_label: versionLabel } : {}),
      is_provisional: docData.isProvisional,
    };

    const fullDocObject = {
      ...optimizedDoc,
      id,
      doc_type_id: docTypeId,
      updated_at: nowIso,
      ...(versionLabel ? { version_label: versionLabel } : {}),
    };

    // Externalizar binarios embebidos hacia LocalAssetStore (asset://<hash>) + deduplicación legada
    const assetExternalized = await externalizeInlineAssets(id, fullDocObject);
    const storedDocObject = await dedupAssetsForLocalStorage(assetExternalized);

    const driver = getDriverForDocType(docTypeId);
    const existingEnvelope = await driver.load(id, docTypeId);
    const envelope = wrapDocumentEnvelope({
      id,
      docType: docTypeId,
      title: formattedTitle,
      displaySubtitle: candidateName,
      payload: storedDocObject,
      previousRevision: existingEnvelope?.revision ?? 0,
      updatedAt: nowIso,
    });

    // 1. Guardado primario Local-First (IndexedDB + resumen aislado por docType)
    const savedEnvelope = await driver.save(envelope);
    if (docTypeId === 'cv') {
      await idbStorage.setItem('cv_data_' + id, storedDocObject);
      await idbStorage.setItem('cv_premium_data', storedDocObject);
    }

    // 2. Respaldo en nube estrictamente opt-in (solo texto estructurado validado, nunca diseños/imágenes/FacturLee)
    const replication = await replicateDocumentBackupIfEnabled(savedEnvelope);
    const syncState: 'local' | 'synced' | 'pending' =
      replication.status === 'backed-up'
        ? 'synced'
        : replication.status === 'error'
          ? 'pending'
          : 'local';

    return {
      success: true,
      syncState,
      record: summaryRecord,
      title: summaryRecord.title,
      doc_data: fullDocObject,
    };
  } catch (err) {
    console.error(`Error crítico al guardar documento [${docTypeId}]:`, err);
    reportSilentError(err, `documentStorageService.saveDocumentInternal.critical[${docTypeId}]`);
    return { success: false, error: err };
  }
};

/**
 * Guarda el documento SOLO en IndexedDB (Local-First) y actualiza la lista local.
 * Ideal para el debounce de autoguardado continuo (1.5s).
 */
export const saveDocumentDraftLocal = async (
  docData: any,
  docTypeId: string = 'cv'
): Promise<SaveDocumentResult> => {
  if (!docData) return { success: false, error: 'DocumentData es nulo' };
  triggerPersistentStorageOnce();

  const docConfig = getDocumentTypeConfig(docTypeId);
  const id = docData.id || `doc_${docTypeId}_${Date.now()}`;

  try {
    const candidateName = (
      docData.personalInfo?.fullName ||
      `${docData.personalInfo?.surname || ''} ${docData.personalInfo?.givenNames || ''}`.trim() ||
      docData.metadata?.title ||
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
      dni: docData.personalInfo?.dni || '',
      updated_at: nowIso,
      is_provisional: docData.isProvisional,
    };

    const fullDocObject = {
      ...docData,
      id,
      doc_type_id: docTypeId,
      updated_at: nowIso,
      isProvisional: docData.isProvisional,
    };

    const externalized = await externalizeInlineAssets(id, fullDocObject);
    const driver = getDriverForDocType(docTypeId);
    const existingEnvelope = await driver.load(id, docTypeId);
    const envelope = wrapDocumentEnvelope({
      id,
      docType: docTypeId,
      title: formattedTitle,
      displaySubtitle: candidateName,
      payload: externalized,
      previousRevision: existingEnvelope?.revision ?? 0,
      updatedAt: nowIso,
    });

    await driver.save(envelope);
    if (docTypeId === 'cv') {
      await idbStorage.setItem('cv_data_' + id, externalized);
    }

    return {
      success: true,
      syncState: 'local',
      record: summaryRecord,
      title: summaryRecord.title,
      doc_data: fullDocObject,
    };
  } catch (err) {
    reportSilentError(err, `documentStorageService.saveDocumentDraftLocal.error`);
    return { success: false, error: err };
  }
};

/**
 * Save any document type to storage (Local-First IndexedDB + LocalStorage Summary)
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
 * Load a single document by ID with envelope unwrapping, local asset hydration and per-type schema migration.
 */
export const loadDocumentById = async (id: string, docTypeId: string = 'cv'): Promise<any> => {
  const isLocalOnly = isLocalOnlyDocumentType(docTypeId);
  const driver = getDriverForDocType(docTypeId);

  let envelope = await driver.load<any>(id, docTypeId);

  // Compatibilidad hacia atrás: claves legadas `cv_data_<id>` solo para tipos no locales-exclusivos
  if (!envelope && !isLocalOnly) {
    try {
      const legacyIdb = await idbStorage.getItem(`cv_data_${id}`);
      if (legacyIdb) {
        envelope = unwrapDocumentEnvelope(legacyIdb, docTypeId);
      }
    } catch (err) {
      reportSilentError(err, `documentStorageService.loadDocumentById.legacyIdb[${docTypeId}]`);
    }
  }

  if (!envelope && !isLocalOnly && typeof localStorage !== 'undefined') {
    try {
      const legacyLs = localStorage.getItem(`cv_data_${id}`);
      if (legacyLs) {
        envelope = unwrapDocumentEnvelope(JSON.parse(legacyLs), docTypeId);
      }
    } catch (err) {
      reportSilentError(err, `documentStorageService.loadDocumentById.legacyLs[${docTypeId}]`);
    }
  }

  // Fallback de solo lectura a `cvs` remoto únicamente para recuperar documentos históricos aún no importados
  if (!envelope && supabase && !isLocalOnly) {
    try {
      const remoteData = await dal.cvs.getById(id);
      if (remoteData) {
        envelope = unwrapDocumentEnvelope(remoteData, docTypeId);
      }
    } catch (err) {
      console.warn('Supabase legacy fetch error:', err);
      reportSilentError(err, `documentStorageService.loadDocumentById.supabase[${docTypeId}]`);
    }
  }

  if (!envelope) return null;

  // Hidratar assets de LocalAssetStore + referencias legadas `asset://`
  const hydratedAssets = await hydrateInlineAssets(envelope.payload);
  const hydrated = await reconstructCvDataFromParts(hydratedAssets);

  // Despacho de migración/sanitización por docType registrado (cierra D8)
  return processLoadedDocumentPayload(docTypeId, hydrated, envelope.schemaVersion);
};

/**
 * Delete a saved document by ID (Local-First + limpieza de LocalAssetStore)
 */
export const deleteDocumentById = async (id: string, docTypeId: string = 'cv'): Promise<void> => {
  const isLocalOnly = isLocalOnlyDocumentType(docTypeId);
  const driver = getDriverForDocType(docTypeId);

  try {
    await driver.delete(id, docTypeId);
    await localAssetStore.deleteDocumentAssets(id);
    if (!isLocalOnly) {
      await idbStorage.removeItem(`cv_data_${id}`);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`cv_data_${id}`);
        localStorage.removeItem(getLocalDocKey(docTypeId, id));
      }
    }
  } catch (err) {
    console.error(`Error eliminando documento local [${docTypeId}]:`, err);
    reportSilentError(err, `documentStorageService.deleteDocumentById.local[${docTypeId}]`);
  }

  if (supabase && !isLocalOnly) {
    try {
      await dal.cvs.delete(id);
    } catch (err) {
      console.warn('Error eliminando en Supabase:', err);
      reportSilentError(err, `documentStorageService.deleteDocumentById.supabase[${docTypeId}]`);
    }
  }
};

/**
 * Backward compatibility wrappers for CV-specific calls
 */
export const getSavedCVsList = () => getSavedDocumentsList('cv');
export const saveCV = (cvData: any) => saveDocument(cvData, 'cv');
export const saveCVAs = (cvData: any, versionLabel?: string) => saveDocumentAs(cvData, versionLabel, 'cv');
export const loadCVById = (id: string) => loadDocumentById(id, 'cv');
export const deleteCVById = (id: string) => deleteDocumentById(id, 'cv');

/**
 * Convenience wrappers for Card and Cover Letter calls
 */
export const getSavedCardsList = () => getSavedDocumentsList('business_card');
export const saveCard = (cardData: any) => saveDocument(cardData, 'business_card');
export const loadCardById = (id: string) => loadDocumentById(id, 'business_card');
export const deleteCardById = (id: string) => deleteDocumentById(id, 'business_card');

export const getSavedCoverLettersList = () => getSavedDocumentsList('cover_letter');
export const saveCoverLetter = (letterData: any) => saveDocument(letterData, 'cover_letter');
export const loadCoverLetterById = (id: string) => loadDocumentById(id, 'cover_letter');
export const deleteCoverLetterById = (id: string) => deleteDocumentById(id, 'cover_letter');

/**
 * Convenience wrappers for Book-specific calls
 */
export const getSavedBooksList = () => getSavedDocumentsList('book');
export const saveBook = (bookData: any) => saveDocument(bookData, 'book');
export const loadBookById = (id: string) => loadDocumentById(id, 'book');
export const deleteBookById = (id: string) => deleteDocumentById(id, 'book');

export const getSavedPlannersList = () => getSavedDocumentsList('planner');
export const savePlanner = (plannerData: any) => saveDocument(plannerData, 'planner');
export const loadPlannerById = (id: string) => loadDocumentById(id, 'planner');
export const deletePlannerById = (id: string) => deleteDocumentById(id, 'planner');

/**
 * FacturLee — la pestaña es un "sobre" mínimo (id + título). Los datos fiscales
 * NUNCA pasan por acá: viven cifrados en la bóveda (IndexedDB) y jamás se
 * sincronizan a Supabase (`invoice` no declara `cloud_backup`).
 */
/**
 * Lista los shells guardados de FacturLee SOLO desde localStorage.
 * A diferencia de getSavedDocumentsList, NUNCA consulta Supabase: FacturLee es 100% local.
 */
export const getSavedInvoicesList = async (): Promise<DocumentRecord[]> => {
  const storageKey = getStorageKeyForType('invoice');
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    reportSilentError(err, 'documentStorageService.getSavedInvoicesList.error');
    return [];
  }
};

export const saveInvoiceShell = async (shell: { id: string; title: string }): Promise<SaveDocumentResult> => {
  const nowIso = new Date().toISOString();
  const record: DocumentRecord = {
    id: shell.id,
    doc_type_id: 'invoice',
    title: shell.title,
    candidate_name: '',
    updated_at: nowIso,
  };
  const data = { id: shell.id, doc_type_id: 'invoice', title: shell.title, updated_at: nowIso };

  try {
    await idbStorage.setItem(`doc_invoice_data_${shell.id}`, data);
    try {
      const storageKey = getStorageKeyForType('invoice');
      const list = await getSavedInvoicesList();
      const existingIdx = list.findIndex(item => item.id === shell.id);
      if (existingIdx >= 0) list[existingIdx] = record;
      else list.unshift(record);
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch (lerr) {
      reportSilentError(lerr, 'documentStorageService.saveInvoiceShell.localStorageSummary');
    }
    return { success: true, syncState: 'local', record, title: shell.title, doc_data: data };
  } catch (err) {
    reportSilentError(err, 'documentStorageService.saveInvoiceShell.error');
    return { success: false, error: err };
  }
};

export const loadInvoiceShellById = async (id: string): Promise<any> => {
  try {
    return await idbStorage.getItem(`doc_invoice_data_${id}`);
  } catch (err) {
    reportSilentError(err, 'documentStorageService.loadInvoiceShellById.error');
    return null;
  }
};

export const deleteInvoiceShellById = async (id: string): Promise<void> => {
  await idbStorage.removeItem(`doc_invoice_data_${id}`);
  try {
    const storageKey = getStorageKeyForType('invoice');
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const list = JSON.parse(stored).filter((c: any) => c.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(list));
    }
  } catch (err) {
    reportSilentError(err, 'documentStorageService.deleteInvoiceShellById.error');
  }
};

/**
 * Wrappers para EditorLee (publicaciones editoriales, libros, informes)
 */
export const getSavedEditorialsList = () => getSavedDocumentsList('editorial');
export const saveEditorial = (editorialData: any) => saveDocument(editorialData, 'editorial');
export const loadEditorialById = (id: string) => loadDocumentById(id, 'editorial');
export const deleteEditorialById = (id: string) => deleteDocumentById(id, 'editorial');


