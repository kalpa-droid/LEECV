import { useEffect } from 'react';
import { saveDocumentDraftLocal } from '../storage/documentStorageService';
import { inferDocumentTypeId } from '../capabilities/capabilityRegistry';
import { hasRealContent, AUTOSAVE_DEBOUNCE_MS } from './documentEngine/documentHelpers';

interface UseDraftAutosaveOptions {
  docData: any;
  isSwitchingDocument?: boolean;
  setHasPendingChanges?: (pending: boolean) => void;
  localStorageKey?: string;
}

/**
 * Hook reutilizable de autoguardado de borradores.
 * Resguarda en localStorage (backup rápido de sesión) e IndexedDB (persistencia de borrador)
 * con debounce de 1500ms y validación de contenido real via hasRealContent().
 */
export function useDraftAutosave({
  docData,
  isSwitchingDocument = false,
  setHasPendingChanges,
  localStorageKey = 'cv_premium_data'
}: UseDraftAutosaveOptions): void {
  useEffect(() => {
    if (isSwitchingDocument || !docData) return;
    const timeout = setTimeout(async () => {
      if (typeof window === 'undefined' || !docData) {
        if (setHasPendingChanges) setHasPendingChanges(false);
        return;
      }
      // a) Respaldo de sesión en localStorage
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(docData));
      } catch (e) {
        console.warn(`Error guardando respaldo local (${localStorageKey}):`, e);
      }

      // b) Persistencia como borrador en IndexedDB
      if (hasRealContent(docData)) {
        try {
          const docType = inferDocumentTypeId(docData) || 'cv';
          await saveDocumentDraftLocal(docData, docType);
        } catch (e) {
          console.warn('Autoguardado de documento falló:', e);
        }
      }
      if (setHasPendingChanges) setHasPendingChanges(false);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [docData, isSwitchingDocument, localStorageKey, setHasPendingChanges]);
}
