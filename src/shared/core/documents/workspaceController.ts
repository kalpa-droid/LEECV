/**
 * NÚCLEO — CONTROLADOR UNIFICADO DE ESPACIO DE TRABAJO (workspaceController.ts)
 *
 * Es el ÚNICO punto de orquestación entre:
 * 1. TabStore (estado de pestañas abiertas en la barra de UI)
 * 2. DocumentStore / documentStorageService (persistencia síncrona/asíncrona en storage/cloud)
 * 3. CVContext / cvData (estado activo renderizado en pantalla)
 *
 * Elimina completamente flags ad-hoc como `skipSaveCurrent` o condiciones de carrera donde
 * guardar resucitaba pestañas o cerrar borraba documentos.
 */

import * as TabStore from './tabStore';
import { loadDocumentById, saveDocument } from '../storage/documentStorageService';
import { markAsConfirmed, isProvisionalDocument, hasRealContent, isDraftDocumentId, inferDocTypeFromDraftId } from './documentLifecycleEngine';
import { getDefaultTitleForDocType } from '../capabilities/capabilityRegistry';
import { createBlankCVTemplate } from '../../../data/initialCVData';

export interface CurrentDocumentState {
  id: string;
  docType: 'cv' | 'business_card' | 'book' | 'cover_letter';
  data: any;
  isDirty?: boolean;
}

/**
 * Abre o conmuta directamente a un documento por ID y tipo.
 */
export async function openDocument(
  id: string,
  docType: TabStore.OpenTab['docType'] = 'cv',
  title?: string,
  setCvData?: (data: any) => void
): Promise<any> {
  const loaded = await loadDocumentById(id, docType);
  if (loaded) {
    const cleanTitle = title || loaded.title;
    TabStore.openTab(id, docType, cleanTitle);
    TabStore.setActiveTabId(id);
    if (setCvData) {
      setCvData(loaded);
    }
    return loaded;
  }
  return null;
}

/**
 * Conmuta entre pestañas abiertas. Si el documento actual tiene cambios pendientes (isDirty),
 * los guarda automáticamente ANTES de realizar la conmutación.
 */
export async function switchToTab(
  targetId: string,
  currentDoc: CurrentDocumentState | null,
  setCvData: (data: any) => void,
  options: { saveCurrentIfDirty?: boolean; targetDocType?: string } = { saveCurrentIfDirty: true }
): Promise<boolean> {
  if (!targetId || targetId === currentDoc?.id) return false;

  let targetTab = TabStore.getOpenTabs().find(t => t.id === targetId);

  // NUEVO — si la pestaña todavía no existe pero es un id de borrador conocido
  // (draft_cv, draft_card, draft_cover_letter, draft_book) o se indicó
  // explícitamente su tipo, registrarla ahora en vez de fallar. Esto es lo que
  // permite "ir al borrador fijo" sin que antes tenga que existir como pestaña.
  if (!targetTab) {
    const docType = options.targetDocType || (isDraftDocumentId(targetId) ? inferDocTypeFromDraftId(targetId) : null);
    if (!docType) return false; // sigue siendo un error real si no es un borrador conocido ni se indicó el tipo
    TabStore.openTab(targetId, docType as any, getDefaultTitleForDocType(docType));
    targetTab = TabStore.getOpenTabs().find(t => t.id === targetId);
  }

  // Si hay un documento activo con cambios pendientes, guardarlo antes de cambiar
  if (options.saveCurrentIfDirty && currentDoc?.isDirty && currentDoc?.data) {
    try {
      await saveDocument(currentDoc.data, currentDoc.docType);
      TabStore.setTabDirty(currentDoc.id, false);
    } catch (err) {
      console.warn('Error al autoguardar documento antes de conmutar pestaña:', err);
    }
  }

  // Cargar el documento — si no existe nada guardado todavía bajo este id
  // (caso real: primera vez que se usa este borrador), se abre en blanco,
  // no se trata como error:
  const loaded = await loadDocumentById(targetId, targetTab!.docType) || createBlankCVTemplate({ id: targetId, docTypeId: targetTab!.docType });
  TabStore.setActiveTabId(targetId);
  setCvData(loaded);
  return true;
}

/**
 * Cierra una pestaña abierta.
 * NUNCA llama a borrar el documento en storage — cerrar una pestaña jamás elimina datos.
 * Si no quedan pestañas abiertas, invoca `goToLandingPage`.
 */
export async function closeTab(
  id: string,
  currentDoc: CurrentDocumentState | null,
  setCvData: (data: any) => void,
  goToLandingPage: () => void,
  currentActiveId?: string
): Promise<void> {
  const activeId = currentActiveId ?? currentDoc?.id;

  if (
    currentDoc?.id === id &&
    currentDoc.data &&
    isProvisionalDocument(currentDoc.data) &&
    hasRealContent(currentDoc.data)
  ) {
    try {
      const confirmedData = markAsConfirmed(currentDoc.data);
      await saveDocument(confirmedData, currentDoc.docType);
      TabStore.setTabDirty(currentDoc.id, false);
    } catch (err) {
      console.warn('Error guardando documento antes de cerrar pestaña:', err);
    }
  }

  const remaining = TabStore.closeTab(id);

  if (id !== activeId) {
    return;
  }

  // Si quedan más pestañas abiertas, conmutar a la más reciente restante
  if (remaining.length > 0) {
    const nextTab = remaining[remaining.length - 1];
    await switchToTab(nextTab.id, null, setCvData, { saveCurrentIfDirty: false });
  } else {
    // 0 pestañas abiertas -> Limpiar ID activo y volver a la Landing Page
    TabStore.setActiveTabId(null);
    goToLandingPage();
  }
}
