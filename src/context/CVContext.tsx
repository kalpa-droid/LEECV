import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { blankCVTemplate } from '../data/initialCVData';
import { saveCV as saveCVStorage } from '../modules/cv-builder/services/cvStorageService';
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

  // Undo / Redo History Stack (up to 30 snapshots)
  const historyRef = useRef<CVData[]>([cvData]);
  const historyIndexRef = useRef(0);
  const [, setHistoryState] = useState(0); // Trigger re-render for UI buttons

  const setCvData = useCallback((action: CVData | ((prev: CVData) => CVData)) => {
    setCvDataState((prev) => {
      const nextData = typeof action === 'function' ? action(prev) : action;
      if (!nextData) return prev;

      // Append to history if data changed
      const currentHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
      if (JSON.stringify(currentHistory[currentHistory.length - 1]) !== JSON.stringify(nextData)) {
        currentHistory.push(nextData);
        if (currentHistory.length > 30) currentHistory.shift();
        historyRef.current = currentHistory;
        historyIndexRef.current = currentHistory.length - 1;
        setHistoryState(n => n + 1);
      }

      return nextData;
    });
  }, []);

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
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const prev = historyRef.current[historyIndexRef.current];
      setCvDataState(prev);
      setHistoryState(n => n + 1);
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const next = historyRef.current[historyIndexRef.current];
      setCvDataState(next);
      setHistoryState(n => n + 1);
    }
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

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
    setCvData((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        ...preset
      }
    }));
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
      setCvData(newCVData);
    }
  };

  const saveCV = async () => {
    setIsSaving(true);
    try {
      const res = await saveCVStorage(cvData);
      return res;
    } catch (err) {
      console.error('Error guardando en CVContext:', err);
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
