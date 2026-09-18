import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { blankCVTemplate, createBlankCVTemplate } from '../data/initialCVData';
import { saveCV as saveCVStorage, saveCVAs as saveCVAsStorage } from '../modules/cv-builder/services/cvStorageService';
import { sanitizeCvData } from '../shared/core/utils/cvDataSchema';
import { navigation } from '../shared/core/utils/navigation';
import { CVData } from '../types/cv';

import { getDocTypeForRoute, inferDocumentTypeId } from '../shared/core/capabilities/capabilityRegistry';
import { setTabDirty, updateTabTitle } from '../shared/core/documents/tabStore';
import { computeAutoDocumentTitle, markAsConfirmed, hasRealContent, getDraftIdForDocType } from '../shared/core/documents/documentLifecycleEngine';
import { saveDocumentDraftLocal } from '../shared/core/storage/documentStorageService';

interface CVContextType {
  cvData: CVData;
  setCvData: (action: CVData | ((prev: CVData) => CVData)) => void;
  updatePersonalInfo: (field: string, value: any) => void;
  updateTheme: (field: string, value: any) => void;
  applyThemePreset: (preset: any) => void;
  toggleSectionVisibility: (sectionKey: string) => void;
  resetToBlankCV: (options?: { activePresetId?: string }) => CVData;
  loadCVData: (newCVData: CVData) => void;
  saveCV: () => Promise<any>;
  saveCVAs: (versionLabel?: string) => Promise<any>;
  isSaving: boolean;
  hasPendingChanges: boolean;
  isSwitchingDocument: boolean;
  setIsSwitchingDocument: (switching: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const CVContext = createContext<CVContextType | null>(null);

export function CVProvider({ children }: { children: ReactNode }) {
  const [cvData, setCvDataState] = useState<CVData>(() => {
    if (navigation.getQueryParam('clear') !== null) {
      try { 
        localStorage.clear(); 
        navigation.cleanQueryParams();
      } catch {}
    }
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    const targetDocType = getDocTypeForRoute(currentPath);

    const saved = typeof window !== 'undefined' ? localStorage.getItem('cv_premium_data') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const parsedDocType = inferDocumentTypeId(parsed);
          if (parsedDocType === targetDocType) {
            return sanitizeCvData(parsed);
          }
        }
      } catch {}
    }

    const initialPresetId = targetDocType === 'business_card' ? 'tarjeta-personal'
      : targetDocType === 'cover_letter' ? 'carta-clasica'
      : 'cv-clasico';
    // Usar SIEMPRE el id fijo de borrador (draft_cv / draft_card / etc.) para el
    // documento con el que arranca la app, no uno generado al azar — así el motor
    // de pestañas lo reconoce como "borrador conocido" desde el primer render y le
    // crea su pestaña (ver workspaceController.switchToTab), en vez de quedar sin
    // ninguna pestaña hasta que el usuario haga una acción explícita.
    return sanitizeCvData(createBlankCVTemplate({
      id: getDraftIdForDocType(targetDocType as any),
      activePresetId: initialPresetId
    }));
  });

  const [isSaving, setIsSaving] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [isSwitchingDocument, setIsSwitchingDocument] = useState(false);

  // Per-document Undo / Redo History Map (up to 30 snapshots per document ID)
  const historyMapRef = useRef<Map<string, { stack: CVData[]; index: number }>>(new Map());
  const [, setHistoryState] = useState(0); // Trigger re-render for UI buttons

  const getDocId = useCallback((data: CVData) => data?.id || 'default_cv_doc', []);

  const setCvData = useCallback((action: CVData | ((prev: CVData) => CVData)) => {
    setHasPendingChanges(true);
    setCvDataState((prev) => {
      const nextData = typeof action === 'function' ? action(prev) : action;
      if (!nextData) return prev;

      const prevId = getDocId(prev);
      const nextId = getDocId(nextData);

      // Save previous document's history state if not existing
      if (!historyMapRef.current.has(prevId)) {
        historyMapRef.current.set(prevId, { stack: [prev], index: 0 });
      }

      // Document switch / load detection: switch to next document's history stack
      if (prevId !== nextId) {
        if (!historyMapRef.current.has(nextId)) {
          historyMapRef.current.set(nextId, { stack: [nextData], index: 0 });
        }
        setHistoryState(n => n + 1);
        return nextData;
      }

      // Same document: append to history if content changed
      let entry = historyMapRef.current.get(nextId);
      if (!entry) {
        entry = { stack: [nextData], index: 0 };
        historyMapRef.current.set(nextId, entry);
      }

      let finalData = nextData;
      const docType = inferDocumentTypeId(nextData);
      if (docType !== 'book') {
        const computedTitle = computeAutoDocumentTitle(nextData, docType as any, { isDirty: true });
        if (computedTitle && nextData.title !== computedTitle) {
          finalData = { ...nextData, title: computedTitle };
          updateTabTitle(nextId, computedTitle, nextData.version_label);
        }
      }

      const currentStack = entry.stack.slice(0, entry.index + 1);
      const lastItem = currentStack[currentStack.length - 1];

      if (JSON.stringify(lastItem) !== JSON.stringify(finalData)) {
        currentStack.push(finalData);
        if (currentStack.length > 30) currentStack.shift();
        entry.stack = currentStack;
        entry.index = currentStack.length - 1;
        setHistoryState(n => n + 1);
      }

      return finalData;
    });
  }, [getDocId]);

  // Save to IndexedDB automatically on every change (Debounced 1500ms)
  useEffect(() => {
    if (isSwitchingDocument) return;
    const timeout = setTimeout(async () => {
      if (typeof window === 'undefined' || !cvData) {
        setHasPendingChanges(false);
        return;
      }
      // a) Respaldo de sesión: SIEMPRE se actualiza, sin importar si hay contenido.
      //    Es una sola key global que se autopisa — no acumula nada — y es lo que
      //    permite recuperar el trabajo si cierran el navegador antes de que el
      //    borrador junte contenido real.
      try {
        localStorage.setItem('cv_premium_data', JSON.stringify(cvData));
      } catch (e) {
        console.warn('Error guardando respaldo local:', e);
      }

      // b) Persistencia como documento: SOLO si ya hay algo que valga la pena
      //    guardar. Mientras el borrador esté vacío, no se toca IndexedDB ni la
      //    lista de documentos guardados — así nunca se acumulan blancos.
      if (hasRealContent(cvData)) {
        try {
          await saveDocumentDraftLocal(cvData, inferDocumentTypeId(cvData) || 'cv');
        } catch (e) {
          console.warn('Autoguardado de documento falló:', e);
        }
      }
      setHasPendingChanges(false);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [cvData, isSwitchingDocument]);

  const undo = useCallback(() => {
    const activeId = getDocId(cvData);
    const entry = historyMapRef.current.get(activeId);
    if (entry && entry.index > 0) {
      entry.index -= 1;
      const prev = entry.stack[entry.index];
      setCvDataState(prev);
      setHistoryState(n => n + 1);
    }
  }, [cvData, getDocId]);

  const redo = useCallback(() => {
    const activeId = getDocId(cvData);
    const entry = historyMapRef.current.get(activeId);
    if (entry && entry.index < entry.stack.length - 1) {
      entry.index += 1;
      const next = entry.stack[entry.index];
      setCvDataState(next);
      setHistoryState(n => n + 1);
    }
  }, [cvData, getDocId]);

  const activeEntry = historyMapRef.current.get(getDocId(cvData));
  const canUndo = activeEntry ? activeEntry.index > 0 : false;
  const canRedo = activeEntry ? activeEntry.index < activeEntry.stack.length - 1 : false;

  // Atajos de teclado globales para Deshacer (Ctrl+Z / Cmd+Z) y Rehacer (Ctrl+Y / Cmd+Y / Cmd+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditingText = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      );

      if (isEditingText) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      const key = e.key.toLowerCase();
      if (key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if (key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const updatePersonalInfo = (field: string, value: any) => {
    setCvData((prev) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: value
      }
    }));
  };

  const updateTheme = (field: string, value: any) => {
    setCvData((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        [field]: value
      }
    }));
  };

  const applyThemePreset = (preset: any) => {
    setCvData((prev) => {
      const hasManualOverrides = prev.manualOverrides && Object.keys(prev.manualOverrides).length > 0;
      if (hasManualOverrides && typeof window !== 'undefined') {
        const confirmChange = window.confirm(
          'Advertencia: Cambiar la plantilla restablecerá los ajustes manuales aplicados a registros individuales. ¿Deseas continuar?'
        );
        if (!confirmChange) return prev;
      }

      return {
        ...prev,
        activePresetId: preset.id || preset.presetId || prev.activePresetId,
        manualOverrides: {},
        layout: {
          ...prev.layout,
          ...preset
        }
      };
    });
  };

  const toggleSectionVisibility = (sectionKey: string) => {
    setCvData((prev) => {
      const currentVis = prev?.sectionVisibility?.[sectionKey] !== false;
      return {
        ...prev,
        sectionVisibility: {
          ...(prev.sectionVisibility || {}),
          [sectionKey]: !currentVis
        }
      };
    });
  };

  const resetToBlankCV = (options?: { activePresetId?: string }) => {
    const blank = sanitizeCvData(createBlankCVTemplate(options));
    const blankId = getDocId(blank);
    historyMapRef.current.set(blankId, { stack: [blank], index: 0 });
    setCvData(blank);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('cv_premium_data', JSON.stringify(blank));
      } catch (e) {
        console.warn('Error guardando plantilla en blanco:', e);
      }
    }
    return blank;
  };

  const loadCVData = (newCVData: CVData) => {
    if (newCVData && typeof newCVData === 'object') {
      const docWithId = newCVData.id ? newCVData : { ...newCVData, id: `cv_${Date.now()}` };
      const docId = getDocId(docWithId);
      if (!historyMapRef.current.has(docId)) {
        historyMapRef.current.set(docId, { stack: [docWithId], index: 0 });
      }
      setCvData(docWithId);
    }
  };

  const saveCV = async () => {
    setIsSaving(true);
    try {
      const confirmedData = markAsConfirmed(cvData);
      const res = await saveCVStorage(confirmedData);
      if (res?.success && res.record?.id && res.record.id !== cvData.id) {
        setCvDataState((prev: CVData) => markAsConfirmed({ ...prev, id: res.record!.id }));
      } else if (res?.success) {
        setCvDataState((prev: CVData) => markAsConfirmed(prev));
      }
      return res;
    } catch (err) {
      console.error('Error guardando en CVContext:', err);
      return { success: false, error: err };
    } finally {
      if (cvData?.id) setTabDirty(cvData.id, false);
      setHasPendingChanges(false);
      setIsSaving(false);
    }
  };

  const saveCVAs = async (versionLabel?: string) => {
    setIsSaving(true);
    try {
      const confirmedData = markAsConfirmed(cvData);
      const res = await saveCVAsStorage(confirmedData, versionLabel);
      if (res?.success && res.record?.id) {
        setCvDataState((prev: CVData) => markAsConfirmed({ ...prev, id: res.record!.id }));
      } else if (res?.success) {
        setCvDataState((prev: CVData) => markAsConfirmed(prev));
      }
      return res;
    } catch (err) {
      console.error('Error en Guardar como en CVContext:', err);
      return { success: false, error: err };
    } finally {
      if (cvData?.id) setTabDirty(cvData.id, false);
      setHasPendingChanges(false);
      setIsSaving(false);
    }
  };

  return (
    <CVContext.Provider
      value={{
        cvData,
        setCvData,
        updatePersonalInfo,
        updateTheme,
        applyThemePreset,
        toggleSectionVisibility,
        resetToBlankCV,
        loadCVData,
        saveCV,
        saveCVAs,
        isSaving,
        hasPendingChanges,
        isSwitchingDocument,
        setIsSwitchingDocument,
        undo,
        redo,
        canUndo,
        canRedo
      }}
    >
      {children}
    </CVContext.Provider>
  );
}

export function useCVContext() {
  const context = useContext(CVContext);
  if (!context) {
    throw new Error('useCVContext debe ser usado dentro de un CVProvider');
  }
  return context;
}
