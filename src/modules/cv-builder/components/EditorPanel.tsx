import React, { useState, useEffect } from 'react';
import { fontOptions } from '../../../data/fontOptions';
import { getCvFormat } from '../../../shared/core/formats/cvFormatRegistry';
import { getSavedCVsList, loadCVById, deleteCVById, saveCV } from '../services/cvStorageService';
import { LogrosSection } from './editor/sections/LogrosSection';
import { IdiomasSection } from './editor/sections/IdiomasSection';
import { ProyectosSection } from './editor/sections/ProyectosSection';
import { PublicacionesSection } from './editor/sections/PublicacionesSection';
import { ReferenciasSection } from './editor/sections/ReferenciasSection';
import { FormacionSection } from './editor/sections/FormacionSection';
import { ProfesionSection } from './editor/sections/ProfesionSection';
import { ExperienciaSection } from './editor/sections/ExperienciaSection';
import { CursosSection } from './editor/sections/CursosSection';
import { InformaticaSection } from './editor/sections/InformaticaSection';
import { CertificadosSection } from './editor/sections/CertificadosSection';
import { GuardadosSection } from './editor/sections/GuardadosSection';
import { RedesSection } from './editor/sections/RedesSection';
import { CompetenciasSection } from './editor/sections/CompetenciasSection';
import { ResumenSection } from './editor/sections/ResumenSection';
import { ObjetivoSection } from './editor/sections/ObjetivoSection';
import { PortafolioSection } from './editor/sections/PortafolioSection';
import { HabilidadesSection } from './editor/sections/HabilidadesSection';
import { FirmaSection } from './editor/sections/FirmaSection';
import { FormatConfirmationModal, FormatApplicationMode } from './FormatConfirmationModal';
import PersonalInfoSection from './editor/PersonalInfoSection';
import { CardExtractSection } from './editor/sections/CardExtractSection';
import { CardLogoSection } from './editor/sections/CardLogoSection';
import { CardFrontSection } from './editor/sections/CardFrontSection';
import { CardBackSection } from './editor/sections/CardBackSection';
import { CardQrSection } from './editor/sections/CardQrSection';
import { CardSizeSection } from './editor/sections/CardSizeSection';
import { NuevaSeccionSection } from './editor/sections/NuevaSeccionSection';
import { PersonalizadaSection } from './editor/sections/PersonalizadaSection';
import { DisenoSection } from './editor/sections/DisenoSection';
import { PortadaSection } from './editor/sections/PortadaSection';
import { CoverLetterEditorPanel } from '../../cover-letter/components/CoverLetterEditorPanel';
import { applyPresetLevel } from '../../../shared/core/pdf-engine/layers/presets/presetHierarchyEngine';
import { triggerPresetTransition } from '../../../shared/core/pdf-engine/layers/presets/presetTransitionEngine';
import { getEffectiveCoverFeaturedItems } from '../../../shared/core/pdf-engine/layers/sectors/coverFeaturedEngine';

import { useToast } from '../../../shared/core/ui/Toast';
import { useConfirm } from '../../../shared/core/ui/ConfirmDialog';
export default function EditorPanel({ 
  cvData, 
  setCvData, 
  activeTab,
  setActiveTab,
  docType = 'cv',
  onOpenPhotoCropper, 
  onOpenSignature
}: any) {
  const { showSuccess, showError, showWarning } = useToast();
  const { confirm } = useConfirm();

  const changeActiveTab = (tabId: string) => {
    if (typeof setActiveTab === 'function') {
      setActiveTab(tabId);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pdf-anchor-scroll', { detail: { tabId } }));
    }
  };

  // States for Guardados tab
  const [savedList, setSavedList] = useState([]);
  const [isSavingFromPanel, setIsSavingFromPanel] = useState(false);

  // State for Format Confirmation Modal
  const [pendingFormatId, setPendingFormatId] = useState<string | null>(null);
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);

  const refreshSavedList = async () => {
    try {
      const list = await getSavedCVsList();
      setSavedList(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'guardados') {
      refreshSavedList();
    }
  }, [activeTab]);

  const handleOpenSavedFromPanel = async (id) => {
    const data = await loadCVById(id);
    if (data) {
      setCvData(data);
      showSuccess('CV cargado correctamente en el editor y vista previa.');
    }
  };

  const handleDeleteSavedFromPanel = async (id, title) => {
    confirm({
      title: '¿Eliminar CV guardado?',
      message: `¿Estás seguro de que deseas eliminar "${title}" de tus currículums guardados?`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        await deleteCVById(id);
        refreshSavedList();
        showSuccess('CV eliminado correctamente.');
      }
    });
  };

  const handleSaveFromPanel = async () => {
    setIsSavingFromPanel(true);
    try {
      await saveCV(cvData);
      showSuccess(`CV de "${cvData?.personalInfo?.fullName || 'Postulante'}" guardado correctamente.`);
      refreshSavedList();
    } catch (err) {
      console.error(err);
      showError('Error al guardar el currículum.');
    } finally {
      setIsSavingFromPanel(false);
    }
  };

  // Extract all registered courses, degrees, education for easy selection
  const registeredItems = [];
  if (cvData) {
    (cvData.coursesAndCertificates || []).forEach(item => {
      if (item.title) {
        registeredItems.push({
          title: item.title,
          institution: item.institution || 'Institución Emisora',
          year: item.year || '2025',
          category: 'Curso / Capacitación'
        });
      }
    });
    (cvData.profession || []).forEach(item => {
      if (item.degree) {
        registeredItems.push({
          title: item.degree,
          institution: item.institution || 'Universidad / Instituto',
          year: item.year || '2025',
          category: 'Título Profesional'
        });
      }
    });
    (cvData.education || []).forEach(item => {
      if (item.degree || item.institution) {
        registeredItems.push({
          title: item.degree ? `${item.level}: ${item.degree}` : item.institution,
          institution: item.institution || 'Colegio',
          year: item.year || '2025',
          category: 'Formación Académica'
        });
      }
    });
  }

  // Camera Handlers moved to CertificadosSection





  const updateTheme = (field: string, value: any) => {
    setCvData((prev: any) => ({
      ...prev,
      theme: {
        ...prev.theme,
        [field]: value,
        ...(field === 'bgColor' || field === 'bgCorridor' ? { bgColor: value, bgCorridor: value } : {})
      }
    }));
  };

  return (
    <div className="h-full flex flex-col bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-primary)]">

      {/* Tab Form Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">

        {/* ========================================================================= */}
        {/* TAB 1: DATOS PERSONALES */}
        {/* ========================================================================= */}
        {docType === 'cv' && activeTab === 'personales' && (
          <PersonalInfoSection 
            onOpenPhotoCropper={onOpenPhotoCropper}
            registeredItems={registeredItems}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 1.2: REDES SOCIALES & ENLACES */}
        {/* ========================================================================= */}
        {docType === 'cv' && activeTab === 'redes' && <RedesSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {/* TAB 1.5: COMPETENCIAS CLAVE */}
        {/* ========================================================================= */}
        {docType === 'cv' && activeTab === 'competencias' && <CompetenciasSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {/* TAB: RESUMEN PROFESIONAL */}
        {/* ========================================================================= */}
        {docType === 'cv' && activeTab === 'resumen' && <ResumenSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {/* TAB: OBJETIVO PROFESIONAL */}
        {/* ========================================================================= */}
        {docType === 'cv' && activeTab === 'objetivo' && <ObjetivoSection cvData={cvData} setCvData={setCvData} />}

        {docType === 'cv' && activeTab === 'logros' && <LogrosSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {/* TAB: PORTAFOLIO / TRABAJOS DESTACADOS */}
        {/* ========================================================================= */}
        {docType === 'cv' && activeTab === 'portafolio' && <PortafolioSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {/* TAB: HABILIDADES TÉCNICAS (HARD SKILLS) */}
        {/* ========================================================================= */}
        {docType === 'cv' && activeTab === 'habilidades' && <HabilidadesSection cvData={cvData} setCvData={setCvData} />}

        {docType === 'cv' && activeTab === 'idiomas' && <IdiomasSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {docType === 'cv' && activeTab === 'proyectos' && <ProyectosSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {docType === 'cv' && activeTab === 'publicaciones' && <PublicacionesSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {docType === 'cv' && activeTab === 'referencias' && <ReferenciasSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {docType === 'cv' && activeTab === 'formacion' && <FormacionSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {docType === 'cv' && activeTab === 'profesion' && <ProfesionSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {docType === 'cv' && activeTab === 'experiencia' && <ExperienciaSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {docType === 'cv' && activeTab === 'cursos' && <CursosSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {docType === 'cv' && activeTab === 'informatica' && <InformaticaSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {docType === 'cv' && activeTab === 'certificados' && <CertificadosSection cvData={cvData} setCvData={setCvData} registeredItems={registeredItems} />}

        {/* ========================================================================= */}
        {/* TAB 9: FIRMA DIGITAL */}
        {/* ========================================================================= */}
        {docType === 'cv' && activeTab === 'firma' && <FirmaSection cvData={cvData} setCvData={setCvData} onOpenSignature={onOpenSignature} />}

        {docType === 'cv' && activeTab === 'nueva_seccion' && <NuevaSeccionSection cvData={cvData} setCvData={setCvData} activeTab={activeTab} changeActiveTab={changeActiveTab} showSuccess={showSuccess} showWarning={showWarning} triggerPresetTransition={triggerPresetTransition} getEffectiveCoverFeaturedItems={getEffectiveCoverFeaturedItems} />}
        {docType === 'cv' && (activeTab?.startsWith('personalizada-') || (cvData?.customSections || []).some((cs: any) => cs.id === activeTab)) && <PersonalizadaSection cvData={cvData} setCvData={setCvData} activeTab={activeTab} changeActiveTab={changeActiveTab} showSuccess={showSuccess} showWarning={showWarning} triggerPresetTransition={triggerPresetTransition} getEffectiveCoverFeaturedItems={getEffectiveCoverFeaturedItems} confirm={confirm} />}
        {activeTab === 'guardados' && (
          <GuardadosSection
            savedList={savedList}
            isSavingFromPanel={isSavingFromPanel}
            handleSaveFromPanel={handleSaveFromPanel}
            handleOpenSavedFromPanel={handleOpenSavedFromPanel}
            handleDeleteSavedFromPanel={handleDeleteSavedFromPanel}
          />
        )}
        {activeTab === 'diseno' && <DisenoSection cvData={cvData} setCvData={setCvData} activeTab={activeTab} changeActiveTab={changeActiveTab} showSuccess={showSuccess} showWarning={showWarning} triggerPresetTransition={triggerPresetTransition} getEffectiveCoverFeaturedItems={getEffectiveCoverFeaturedItems} setPendingFormatId={setPendingFormatId} setIsFormatModalOpen={setIsFormatModalOpen} updateTheme={updateTheme} fontOptions={fontOptions} docType={docType} />}
        {docType === 'cv' && activeTab === 'portada' && <PortadaSection cvData={cvData} setCvData={setCvData} activeTab={activeTab} changeActiveTab={changeActiveTab} showSuccess={showSuccess} showWarning={showWarning} triggerPresetTransition={triggerPresetTransition} getEffectiveCoverFeaturedItems={getEffectiveCoverFeaturedItems} />}

        {/* ========================================================================= */}
        {/* TABS DE TARJETA PERSONAL — 6 paneles independientes */}
        {/* ========================================================================= */}

        {/* TABS DE TARJETA PERSONAL — Componentizados */}
        {docType === 'business_card' && activeTab === 'card_extract' && <CardExtractSection cvData={cvData} setCvData={setCvData} />}
        {docType === 'business_card' && activeTab === 'card_logo' && <CardLogoSection cvData={cvData} setCvData={setCvData} />}
        {docType === 'business_card' && activeTab === 'card_front' && <CardFrontSection cvData={cvData} setCvData={setCvData} />}
        {docType === 'business_card' && activeTab === 'card_back' && <CardBackSection cvData={cvData} setCvData={setCvData} />}
        {docType === 'business_card' && activeTab === 'card_qr' && <CardQrSection cvData={cvData} setCvData={setCvData} />}
        {docType === 'business_card' && activeTab === 'card_size' && <CardSizeSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {/* TABS DE CARTA DE PRESENTACIÓN */}
        {/* ========================================================================= */}
        {docType === 'cover_letter' && (
          <CoverLetterEditorPanel
            activeTab={activeTab}
            data={cvData}
            onChangeData={setCvData}
            presetId={cvData?.activePresetId || 'carta-clasica'}
            onSelectPreset={(presetId: string) => {
              setCvData((prev: any) => ({ ...prev, activePresetId: presetId }));
            }}
            aiCredits={3}
          />
        )}

        {/* Format Confirmation Modal */}
        {isFormatModalOpen && pendingFormatId && (
          <FormatConfirmationModal
            isOpen={isFormatModalOpen}
            formatName={getCvFormat(pendingFormatId)?.name || pendingFormatId}
            onClose={() => {
              setIsFormatModalOpen(false);
              setPendingFormatId(null);
            }}
            onConfirm={(mode: FormatApplicationMode) => {
              const fmt = getCvFormat(pendingFormatId);
              triggerPresetTransition(fmt?.name || pendingFormatId, 'format');
              setCvData((prev: any) => applyPresetLevel(prev, 'format', { formatId: pendingFormatId, applicationMode: mode }));
              showSuccess(`Formato "${fmt?.name || pendingFormatId}" aplicado correctamente.`);
              setIsFormatModalOpen(false);
              setPendingFormatId(null);
            }}
          />
        )}
        
      </div>
    </div>
  );
}
