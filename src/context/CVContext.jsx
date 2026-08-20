import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { standardExampleCVData, blankCVTemplate } from '../data/initialCVData';
import { saveCV as saveCVStorage } from '../modules/cv-builder/services/cvStorageService';
import { sanitizeCvData } from '../shared/core/utils/cvDataSchema';

const CVContext = createContext(null);

export function CVProvider({ children }) {
  const [cvData, setCvDataState] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('clear')) {
      try { localStorage.clear(); } catch {}
    }
    const saved = typeof window !== 'undefined' ? localStorage.getItem('cv_premium_data') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return sanitizeCvData({
            ...standardExampleCVData,
            ...parsed
          });
        }
      } catch {
        return sanitizeCvData(standardExampleCVData);
      }
    }
    return sanitizeCvData(standardExampleCVData);
  });

  const [isSaving, setIsSaving] = useState(false);

  // Undo / Redo History Stack (up to 30 snapshots)
  const historyRef = useRef([cvData]);
  const historyIndexRef = useRef(0);
  const [, setHistoryState] = useState(0); // Trigger re-render for UI buttons

  const setCvData = useCallback((action) => {
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

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const targetState = historyRef.current[historyIndexRef.current];
      setCvDataState(targetState);
      setHistoryState(n => n + 1);
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const targetState = historyRef.current[historyIndexRef.current];
      setCvDataState(targetState);
      setHistoryState(n => n + 1);
    }
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  // Keyboard shortcuts (Ctrl+Z for undo, Ctrl+Y or Ctrl+Shift+Z for redo)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if (modifier && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Pure Action Dispatchers
  const updatePersonalInfo = (field, value) => {
    setCvData(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: value
      }
    }));
  };

  const updateTheme = (field, value) => {
    setCvData(prev => ({
      ...prev,
      theme: {
        ...prev.theme,
        [field]: value
      }
    }));
  };

  const applyThemePreset = (preset) => {
    setCvData(prev => ({
      ...prev,
      theme: {
        ...prev.theme,
        presetId: preset.id,
        primaryColor: preset.primaryColor,
        secondaryColor: preset.secondaryColor,
        accentColor: preset.accentColor,
        textColor: preset.textColor,
        bgCorridor: preset.bgCorridor,
        fontFamily: preset.fontFamily
      }
    }));
  };

  const toggleSectionVisibility = (sectionKey) => {
    setCvData(prev => {
      const isVisible = prev.sectionVisibility?.[sectionKey] !== false;
      return {
        ...prev,
        sectionVisibility: {
          ...prev.sectionVisibility,
          [sectionKey]: !isVisible
        }
      };
    });
  };

  const resetToBlankCV = () => {
    setCvData(blankCVTemplate);
  };

  const loadCVData = (newCVData) => {
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
