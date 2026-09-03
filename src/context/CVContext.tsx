import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { blankCVTemplate } from '../data/initialCVData';
import { saveCV as saveCVStorage, saveCVAs as saveCVAsStorage } from '../modules/cv-builder/services/cvStorageService';
import { sanitizeCvData } from '../shared/core/utils/cvDataSchema';
import { navigation } from '../shared/core/utils/navigation';
import { CVData } from '../types/cv';

interface CVContextType {
  cvData: CVData;
  setCvData: (action: CVData | ((prev: CVData) => CVData)) => void;
  updatePersonalInfo: (field: string, value: any) => void;
  updateTheme: (field: string, value: any) => void;
  applyThemePreset: (preset: any) => void;
  toggleSectionVisibility: (sectionKey: string) => void;
  resetToBlankCV: () => void;
  loadCVData: (newCVData: CVData) => void;
  saveCV: () => Promise<any>;
  saveCVAs: (versionLabel?: string) => Promise<any>;
  isSaving: boolean;
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
    const saved = typeof window !== 'undefined' ? localStorage.getItem('cv_premium_data') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return sanitizeCvData(parsed);
        }
      } catch {
        return sanitizeCvData(blankCVTemplate);
      }
    }
    return sanitizeCvData(blankCVTemplate);
  });

  const [isSaving, setIsSaving] = useState(false);

  // Per-document Undo / Redo History Map (up to 30 snapshots per document ID)
  const historyMapRef = useRef<Map<string, { stack: CVData[]; index: number }>>(new Map());
  const [, setHistoryState] = useState(0); // Trigger re-render for UI buttons

  const getDocId = useCallback((data: CVData) => data?.id || 'default_cv_doc', []);

  const setCvData = useCallback((action: CVData | ((prev: CVData) => CVData)) => {
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

      const currentStack = entry.stack.slice(0, entry.index + 1);
      const lastItem = currentStack[currentStack.length - 1];

      if (JSON.stringify(lastItem) !== JSON.stringify(nextData)) {
        currentStack.push(nextData);
        if (currentStack.length > 30) currentStack.shift();
        entry.stack = currentStack;
        entry.index = currentStack.length - 1;
        setHistoryState(n => n + 1);
      }

      return nextData;
    });
  }, [getDocId]);

  // Save to localStorage automatically on every change (Debounced 500ms)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (typeof window !== 'undefined' && cvData) {
        try {
          localStorage.setItem('cv_premium_data', JSON.stringify(cvData));
        } catch (e) {
          console.warn('Error guardando respaldo local:', e);
        }
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [cvData]);

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
      const order = prev?.layout?.sectionOrder || [];
      const isCurrentlyVisible = order.includes(sectionKey);
      
      let nextOrder: string[];
      if (isCurrentlyVisible) {
        nextOrder = order.filter((k: string) => k !== sectionKey);
      } else {
        nextOrder = [...order, sectionKey];
      }

      return {
        ...prev,
        layout: {
          ...prev.layout,
          sectionOrder: nextOrder
        }
      };
    });
  };

  const resetToBlankCV = () => {
    const blank = sanitizeCvData(blankCVTemplate);
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
  };

  const loadCVData = (newCVData: CVData) => {
    if (newCVData && typeof newCVData === 'object') {
      const docId = getDocId(newCVData);
      if (!historyMapRef.current.has(docId)) {
        historyMapRef.current.set(docId, { stack: [newCVData], index: 0 });
      }
      setCvData(newCVData);
    }
  };

  const saveCV = async () => {
    setIsSaving(true);
    try {
      const res = await saveCVStorage(cvData);
      if (res?.success && res.record?.id && res.record.id !== cvData.id) {
        setCvData((prev: CVData) => ({ ...prev, id: res.record!.id }));
      }
      return res;
    } catch (err) {
      console.error('Error guardando en CVContext:', err);
      return { success: false, error: err };
    } finally {
      setIsSaving(false);
    }
  };

  const saveCVAs = async (versionLabel?: string) => {
    setIsSaving(true);
    try {
      const res = await saveCVAsStorage(cvData, versionLabel);
      if (res?.success && res.record?.id) {
        setCvData((prev: CVData) => ({ ...prev, id: res.record!.id }));
      }
      return res;
    } catch (err) {
      console.error('Error en Guardar como en CVContext:', err);
      return { success: false, error: err };
    } finally {
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
