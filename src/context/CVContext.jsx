import React, { createContext, useContext, useState, useEffect } from 'react';
import { standardExampleCVData, blankCVTemplate } from '../data/initialCVData';
import { saveCV as saveCVStorage } from '../modules/cv-builder/services/cvStorageService';

const CVContext = createContext(null);

export function CVProvider({ children }) {
  const [cvData, setCvData] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('clear')) {
      try { localStorage.clear(); } catch {}
    }
    const saved = typeof window !== 'undefined' ? localStorage.getItem('cv_premium_data') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            ...standardExampleCVData,
            ...parsed,
            showCoverPage: parsed.showCoverPage !== undefined ? parsed.showCoverPage : true,
            layoutStyle: parsed.layoutStyle || 'executive-sidebar',
            theme: {
              ...standardExampleCVData.theme,
              ...(parsed.theme || {})
            },
            sectionVisibility: {
              ...standardExampleCVData.sectionVisibility,
              ...(parsed.sectionVisibility || {})
            },
            personalInfo: { 
              ...standardExampleCVData.personalInfo, 
              ...(parsed.personalInfo || {})
            },
            roles: Array.isArray(parsed.roles) ? parsed.roles : [],
            education: Array.isArray(parsed.education) ? parsed.education : [],
            profession: Array.isArray(parsed.profession) ? parsed.profession : [],
            experience: Array.isArray(parsed.experience) ? parsed.experience : [],
            coursesAndCertificates: Array.isArray(parsed.coursesAndCertificates) ? parsed.coursesAndCertificates : [],
            certificatesScanned: Array.isArray(parsed.certificatesScanned) ? parsed.certificatesScanned : [],
            informatics: Array.isArray(parsed.informatics) ? parsed.informatics : [],
            ecology: (parsed.ecology && typeof parsed.ecology === 'object') ? { ...standardExampleCVData.ecology, ...parsed.ecology } : standardExampleCVData.ecology,
            layout: {
              ...standardExampleCVData.layout,
              ...(parsed.layout || {})
            },
            customSections: Array.isArray(parsed.customSections) ? parsed.customSections : [],
            signature: {
              ...standardExampleCVData.signature,
              ...(parsed.signature || {})
            },
            certificateDisplay: {
              ...standardExampleCVData.certificateDisplay,
              ...(parsed.certificateDisplay || {})
            }
          };
        }
      } catch {
        return standardExampleCVData;
      }
    }
    return standardExampleCVData;
  });

  const [isSaving, setIsSaving] = useState(false);

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

  const value = {
    cvData,
    setCvData,
    isSaving,
    updatePersonalInfo,
    updateTheme,
    applyThemePreset,
    toggleSectionVisibility,
    resetToBlankCV,
    loadCVData,
    saveCV
  };

  return <CVContext.Provider value={value}>{children}</CVContext.Provider>;
}

export function useCVContext() {
  const context = useContext(CVContext);
  if (!context) {
    throw new Error('useCVContext debe ser usado dentro de un CVProvider');
  }
  return context;
}
