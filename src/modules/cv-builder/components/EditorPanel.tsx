import React, { useState, useRef, useEffect } from 'react';
import { 
  PenTool, 
  Palette,
  Plus,
  Trash2,
  Camera,
  Upload,
  RotateCw,
  Check,
  Sparkles,
  Layout,
  Columns3,
  FolderOpen,
  Save,
  Calendar,
  FileText,
  Globe,
  Info,
  X,
  CreditCard,
  QrCode,
  RefreshCw,
  Target
} from 'lucide-react';
import { fontOptions } from '../../../data/fontOptions';
import { getAllPresets, PRESET_COLORS, PRESET_TYPOGRAPHY, resolveActivePreset } from '../../../shared/core/pdf-engine/layers/presets/presetRegistry';
import { getAllCvFormats, getCvFormat, getFormatDefaultVisibility, resolveActiveFormatId, resolveActiveFormat } from '../../../shared/core/formats/cvFormatRegistry';
import { FIELD_CATALOG } from '../../../shared/core/pdf-engine/layers/records/fieldCatalog';
import { PAGE_SIZES } from '../../../shared/core/pdf-engine/layers/page/pageSizes';
import { resolveDisplayName } from '../../../shared/core/utils/cvDataSchema';
import { getSavedCVsList, loadCVById, deleteCVById, saveCV } from '../services/cvStorageService';
import { getOpenTabs } from '../../../shared/core/documents/tabStore';
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
import PhotoCropperModal from './PhotoCropperModal';
import { extractDominantCornerColor } from '../../../shared/core/pdf-engine/utils/extractDominantEdgeColor';
import { FormatConfirmationModal, FormatApplicationMode } from './FormatConfirmationModal';
import { COVER_PRESETS } from '../../../shared/core/pdf-engine/layers/presets/coverPresetCatalog';
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
import { PanelSection } from './editor/PanelSection';
import { SectionManualAdjustment } from './editor/SectionManualAdjustment';
import { getUiHint } from '../../../shared/core/uiTextGlossary';
import { applyPresetLevel } from '../../../shared/core/pdf-engine/layers/presets/presetHierarchyEngine';
import { triggerPresetTransition } from '../../../shared/core/pdf-engine/layers/presets/presetTransitionEngine';
import { getEffectiveCoverFeaturedItems } from '../../../shared/core/pdf-engine/layers/sectors/coverFeaturedEngine';


import { useToast } from '../../../shared/core/ui/Toast';
import { useConfirm } from '../../../shared/core/ui/ConfirmDialog';
import { RepeatableSection } from '../../../shared/core/ui/RepeatableSection';
import { RecordFormSection } from '../../../shared/core/ui/RecordFormSection';
import { Field } from '../../../shared/core/ui/Field';
import { UI_GLOSSARY } from '../../../shared/core/ui/uiTextGlossary';

import { colorSystem, typeScale, elevationSystem, radius, button } from '../../../shared/core/uiDesignSystem';

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

  const isBusinessCard = docType === 'business_card';

  const changeActiveTab = (tabId: string) => {
    if (typeof setActiveTab === 'function') {
      setActiveTab(tabId);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pdf-anchor-scroll', { detail: { tabId } }));
    }
  };

  const handlePaperSizeChange = (val: string) => {
    setCvData((prev: any) => ({
      ...prev,
      cardSize: val.startsWith('tarjeta_') ? val : prev?.cardSize,
      layout: {
        ...(prev?.layout || {}),
        paperSize: val,
        pageSizeId: val
      }
    }));
  };

  const hasDesignOverrides = !!(cvData?.colorPresetId || cvData?.typographyPresetId || cvData?.columnLayoutPresetId);

  // Local states for Certificate Tab moved to CertificadosSection

  // States for Guardados tab
  const [savedList, setSavedList] = useState([]);
  const [isSavingFromPanel, setIsSavingFromPanel] = useState(false);

  // States for Custom Sections Creator
    const [selectedFields, setSelectedFields] = useState<string[]>(['tituloOGrado', 'institucion']);

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

  const renderSectionToggle = (sectionKey, sectionTitle, onAddAction = null, addLabel = null) => {
    const isVisible = cvData?.sectionVisibility?.[sectionKey] !== false;

    return (
      <div className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-[${radius.card}] border mb-3 transition ${
        isVisible 
          ? 'bg-[var(--ui-bg-card)] border-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] ${elevationSystem.raised}' 
          : 'bg-[var(--color-neutral-surface-muted)] border-[var(--color-neutral-border)] text-[var(--color-neutral-text-muted)] opacity-75'
      }`}>
        <span className="text-xs font-black uppercase tracking-wide">
          {sectionTitle}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setCvData(prev => ({
                ...prev,
                sectionVisibility: {
                  ...prev.sectionVisibility,
                  [sectionKey]: !isVisible
                }
              }));
            }}
            className={`px-3 py-1 rounded-full text-xs font-black transition flex items-center gap-1.5 ${elevationSystem.raised} cursor-pointer ${
              isVisible
                ? 'bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] hover:bg-[var(--color-secondary-hover)]'
                : 'bg-[var(--color-neutral-text-muted)] text-[var(--color-neutral-surface)] hover:opacity-80'
            }`}
          >
            <span>{isVisible ? 'ACTIVADA' : 'DESACTIVADA'}</span>
          </button>

          {isVisible && onAddAction && addLabel && (
            <button
              type="button"
              onClick={onAddAction}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black transition cursor-pointer ${button.primary}`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{addLabel}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-primary)]">

      {/* Tab Form Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">

        {/* ========================================================================= */}
        {/* TAB 1: DATOS PERSONALES */}
        {/* ========================================================================= */}
        {activeTab === 'personales' && (
          <PersonalInfoSection 
            onOpenPhotoCropper={onOpenPhotoCropper}
            registeredItems={registeredItems}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 1.2: REDES SOCIALES & ENLACES */}
        {/* ========================================================================= */}
        {activeTab === 'redes' && <RedesSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {/* TAB 1.5: COMPETENCIAS CLAVE */}
        {/* ========================================================================= */}
        {activeTab === 'competencias' && <CompetenciasSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {/* TAB: RESUMEN PROFESIONAL */}
        {/* ========================================================================= */}
        {activeTab === 'resumen' && <ResumenSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {/* TAB: OBJETIVO PROFESIONAL */}
        {/* ========================================================================= */}
        {activeTab === 'objetivo' && <ObjetivoSection cvData={cvData} setCvData={setCvData} />}

        {activeTab === 'logros' && <LogrosSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {/* TAB: PORTAFOLIO / TRABAJOS DESTACADOS */}
        {/* ========================================================================= */}
        {activeTab === 'portafolio' && <PortafolioSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {/* TAB: HABILIDADES TÉCNICAS (HARD SKILLS) */}
        {/* ========================================================================= */}
        {activeTab === 'habilidades' && <HabilidadesSection cvData={cvData} setCvData={setCvData} />}

        {activeTab === 'idiomas' && <IdiomasSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {activeTab === 'proyectos' && <ProyectosSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {activeTab === 'publicaciones' && <PublicacionesSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {activeTab === 'referencias' && <ReferenciasSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {activeTab === 'formacion' && <FormacionSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {activeTab === 'profesion' && <ProfesionSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {activeTab === 'experiencia' && <ExperienciaSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {activeTab === 'cursos' && <CursosSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {activeTab === 'informatica' && <InformaticaSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {activeTab === 'certificados' && <CertificadosSection cvData={cvData} setCvData={setCvData} registeredItems={registeredItems} />}

        {/* ========================================================================= */}
        {/* TAB 9: FIRMA DIGITAL */}
        {/* ========================================================================= */}
        {/* TAB 9: FIRMA DIGITAL */}
        {/* ========================================================================= */}
        {activeTab === 'firma' && <FirmaSection cvData={cvData} setCvData={setCvData} onOpenSignature={onOpenSignature} />}

        {activeTab === 'nueva_seccion' && <NuevaSeccionSection cvData={cvData} setCvData={setCvData} activeTab={activeTab} changeActiveTab={changeActiveTab} showSuccess={showSuccess} showWarning={showWarning} triggerPresetTransition={triggerPresetTransition} getEffectiveCoverFeaturedItems={getEffectiveCoverFeaturedItems} />}
        { (activeTab?.startsWith('personalizada-') || (cvData?.customSections || []).some((cs: any) => cs.id === activeTab)) && <PersonalizadaSection cvData={cvData} setCvData={setCvData} activeTab={activeTab} changeActiveTab={changeActiveTab} showSuccess={showSuccess} showWarning={showWarning} triggerPresetTransition={triggerPresetTransition} getEffectiveCoverFeaturedItems={getEffectiveCoverFeaturedItems} confirm={confirm} savedList={savedList} isSavingFromPanel={isSavingFromPanel} handleSaveFromPanel={handleSaveFromPanel} handleOpenSavedFromPanel={handleOpenSavedFromPanel} handleDeleteSavedFromPanel={handleDeleteSavedFromPanel} />}
        {activeTab === 'diseno' && <DisenoSection cvData={cvData} setCvData={setCvData} activeTab={activeTab} changeActiveTab={changeActiveTab} showSuccess={showSuccess} showWarning={showWarning} triggerPresetTransition={triggerPresetTransition} getEffectiveCoverFeaturedItems={getEffectiveCoverFeaturedItems} />}
        {activeTab === 'portada' && <PortadaSection cvData={cvData} setCvData={setCvData} activeTab={activeTab} changeActiveTab={changeActiveTab} showSuccess={showSuccess} showWarning={showWarning} triggerPresetTransition={triggerPresetTransition} getEffectiveCoverFeaturedItems={getEffectiveCoverFeaturedItems} />}

        {/* ========================================================================= */}
        {/* TABS DE TARJETA PERSONAL — 6 paneles independientes */}
        {/* ========================================================================= */}

        {/* TABS DE TARJETA PERSONAL — Componentizados */}
        {activeTab === 'card_extract' && <CardExtractSection cvData={cvData} setCvData={setCvData} />}
        {activeTab === 'card_logo' && <CardLogoSection cvData={cvData} setCvData={setCvData} />}
        {activeTab === 'card_front' && <CardFrontSection cvData={cvData} setCvData={setCvData} />}
        {activeTab === 'card_back' && <CardBackSection cvData={cvData} setCvData={setCvData} />}
        {activeTab === 'card_qr' && <CardQrSection cvData={cvData} setCvData={setCvData} />}
        {activeTab === 'card_size' && <CardSizeSection cvData={cvData} setCvData={setCvData} />}

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
