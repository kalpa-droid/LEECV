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
  const [newSectionTitle, setNewSectionTitle] = useState('');
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
        {/* TAB 1.2: REDES SOCIALES & ENLACES */}
        {/* ========================================================================= */}
        {/* TAB 1.5: COMPETENCIAS CLAVE */}
        {/* ========================================================================= */}
        {/* TAB: RESUMEN PROFESIONAL */}
        {/* ========================================================================= */}
        {/* TAB: OBJETIVO PROFESIONAL */}
        {/* ========================================================================= */}
        {activeTab === 'objetivo' && <ObjetivoSection cvData={cvData} setCvData={setCvData} />}

        {activeTab === 'logros' && <LogrosSection cvData={cvData} setCvData={setCvData} />}

        {/* ========================================================================= */}
        {/* TAB: PORTAFOLIO / TRABAJOS DESTACADOS */}
        {/* ========================================================================= */}
        {/* TAB: PORTAFOLIO / TRABAJOS DESTACADOS */}
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

        {activeTab === 'nueva_seccion' && (
          <div className="space-y-6">
            {/* 1. SECCIONES PREDISEÑADAS CON 1 CLIC */}
            <PanelSection icon={<Sparkles className="w-4 h-4 text-[var(--ui-secondary)]" />} title="Secciones Prediseñadas">
              <div className={`p-3.5 bg-[var(--ui-bg-card)] rounded-[${radius.modal}] border-2 border-[var(--color-neutral-border)] space-y-3 ${elevationSystem.raised}`}>
                <p className="text-[11px] text-[var(--color-neutral-text-secondary)] font-medium leading-relaxed">
                  Haz clic en cualquiera de estas secciones para agregarla instantáneamente a tu currículum con sus campos listos para completar:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {[
                    {
                      id: 'redes',
                      titleText: 'Redes Sociales & Presencia Digital',
                      iconId: 'redes',
                      desc: 'LinkedIn, GitHub, Behance, Portafolio, YouTube, etc.',
                      fields: ['plataforma', 'usuario', 'url']
                    },
                    {
                      id: 'publicaciones',
                      titleText: 'Publicaciones y Artículos',
                      iconId: 'publicaciones',
                      desc: 'Libros, artículos científicos, prensa, ensayos.',
                      fields: ['tituloOGrado', 'institucion', 'autor', 'periodo', 'url']
                    },
                    {
                      id: 'referencias',
                      titleText: 'Referencias Laborales',
                      iconId: 'referencias',
                      desc: 'Contactos y cartas de recomendación.',
                      fields: ['personaReferencia', 'institucion', 'contactoReferencia']
                    },
                    {
                      id: 'idiomas',
                      titleText: 'Idiomas y Certificaciones',
                      iconId: 'idiomas',
                      desc: 'Lenguas extranjeras y grado de dominio (A1-C2).',
                      fields: ['tituloOGrado', 'institucion', 'nivel']
                    },
                    {
                      id: 'voluntariado',
                      titleText: 'Voluntariado & ONG',
                      iconId: 'voluntariado',
                      desc: 'Acción social y trabajo comunitario.',
                      fields: ['cargo', 'institucion', 'periodo', 'descripcion']
                    },
                    {
                      id: 'premios',
                      titleText: 'Premios & Distinciones',
                      iconId: 'premios',
                      desc: 'Menciones de honor y reconocimientos.',
                      fields: ['tituloOGrado', 'institucion', 'periodo', 'descripcion']
                    },
                    {
                      id: 'patentes',
                      titleText: 'Patentes & Habilitaciones',
                      iconId: 'patentes',
                      desc: 'Propiedad intelectual, registros y matrículas.',
                      fields: ['tituloOGrado', 'institucion', 'resolucion', 'periodo']
                    },
                    {
                      id: 'ponencias',
                      titleText: 'Ponencias & Congresos',
                      iconId: 'ponencias',
                      desc: 'Disertaciones, conferencias y jornadas.',
                      fields: ['tituloOGrado', 'institucion', 'periodo', 'url']
                    }
                  ].map((presetSec) => {
                    const isBuiltIn = ['redes', 'publicaciones', 'referencias', 'idiomas'].includes(presetSec.id);
                    const isAlreadyAdded = isBuiltIn
                      ? cvData?.sectionVisibility?.[presetSec.id] !== false
                      : (['personalizada-1', 'personalizada-2', 'personalizada-3', 'personalizada-4', 'personalizada-5'] as const).some(
                          (slotId) => cvData?.sectionTitleOverrides?.[slotId] === presetSec.titleText || cvData?.sectionVisibility?.[slotId] === true && cvData?.sectionTitleOverrides?.[slotId]
                        );

                    return (
                      <button
                        key={presetSec.id}
                        type="button"
                        onClick={() => {
                          if (isBuiltIn) {
                            setCvData((prev: any) => ({
                              ...prev,
                              sectionVisibility: {
                                ...(prev.sectionVisibility || {}),
                                [presetSec.id]: true
                              }
                            }));
                            showSuccess(`Sección '${presetSec.titleText}' activada.`);
                            changeActiveTab(presetSec.id);
                            return;
                          }

                          if (isAlreadyAdded) {
                            const existingSlot = (['personalizada-1', 'personalizada-2', 'personalizada-3', 'personalizada-4', 'personalizada-5'] as const).find(
                              (slotId) => cvData?.sectionTitleOverrides?.[slotId] === presetSec.titleText
                            );
                            if (existingSlot) changeActiveTab(existingSlot);
                            return;
                          }

                          const customSlots = ['personalizada-1', 'personalizada-2', 'personalizada-3', 'personalizada-4', 'personalizada-5'] as const;
                          const freeSlot = customSlots.find(
                            (slotId) => cvData?.sectionVisibility?.[slotId] !== true && (!cvData?.[slotId] || cvData[slotId].length === 0) && !cvData?.sectionTitleOverrides?.[slotId]
                          );

                          if (!freeSlot) {
                            showWarning('Ya utilizaste los 5 slots de secciones personalizadas disponibles en tu plan. Puedes reutilizar una sección cambiando su nombre.');
                            return;
                          }

                          setCvData((prev: any) => ({
                            ...prev,
                            sectionVisibility: { ...(prev.sectionVisibility || {}), [freeSlot]: true },
                            sectionTitleOverrides: { ...(prev.sectionTitleOverrides || {}), [freeSlot]: presetSec.titleText },
                            sectionFieldSelection: { ...(prev.sectionFieldSelection || {}), [freeSlot]: presetSec.fields },
                            [freeSlot]: prev[freeSlot]?.length ? prev[freeSlot] : [{}],
                            layout: {
                              ...(prev.layout || {}),
                              columnAssignments: {
                                ...(prev.layout?.columnAssignments || {}),
                                [freeSlot]: 'primaria'
                              },
                              sectionOrders: {
                                ...(prev.layout?.sectionOrders || {}),
                                primaria: [...(prev.layout?.sectionOrders?.primaria || []), freeSlot]
                              }
                            }
                          }));

                          showSuccess(`Sección '${presetSec.titleText}' incorporada en slot ${freeSlot}.`);
                          changeActiveTab(freeSlot);
                        }}
                        className={`p-2.5 rounded-[${radius.card}] border text-left flex flex-col justify-between transition cursor-pointer ${
                          isAlreadyAdded
                            ? 'bg-[var(--color-secondary-muted)] border-[var(--color-secondary-base)]/40 text-[var(--color-secondary-text)]'
                            : 'bg-[var(--color-neutral-surface-muted)] border-[var(--color-neutral-border)] hover:border-[var(--color-accent-base)] hover:bg-[var(--ui-bg-card)]'
                        }`}
                      >
                        <div className="space-y-1">
                          <span className="text-xs font-black text-[var(--color-neutral-text-primary)] block">{presetSec.titleText}</span>
                          <p className="text-[10px] text-[var(--color-neutral-text-secondary)] font-medium leading-tight">{presetSec.desc}</p>
                        </div>
                        <span className={`text-[10px] font-black mt-2 self-end px-2 py-0.5 rounded ${
                          isAlreadyAdded ? 'bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)]' : 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]'
                        }`}>
                          {isAlreadyAdded ? '✓ Activa (Editar)' : '+ Incorporar'}
                        </span>
                      </button>
                    );
                  })}

                  {/* 10ª Tarjeta para completar el par del grid (5 filas perfectas) */}
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById('custom-section-creator-form')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`p-2.5 rounded-[${radius.card}] border-2 border-dashed border-[var(--color-accent-base)]/40 bg-[var(--color-accent-muted)] hover:opacity-90 text-left flex flex-col justify-between transition cursor-pointer`}
                  >
                    <div className="space-y-1">
                      <span className="text-xs font-black text-[var(--color-accent-text)] flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> Sección a Medida
                      </span>
                      <p className="text-[10px] text-[var(--color-neutral-text-secondary)] font-medium leading-tight">
                        Crear sección personalizada seleccionando campos a medida.
                      </p>
                    </div>
                    <span className="text-[10px] font-black mt-2 self-end px-2 py-0.5 rounded bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]">
                      ↓ Ir a Creador
                    </span>
                  </button>
                </div>
              </div>
            </PanelSection>

            {/* 2. CREADOR DE SECCIÓN A MEDIDA */}
            <PanelSection icon={<Plus className="w-4 h-4 text-[var(--ui-rose)]" />} title="Sección a Medida">
              <div id="custom-section-creator-form" className={`p-3.5 bg-[var(--ui-bg-card)] rounded-[${radius.modal}] border-2 border-[var(--color-neutral-border)] space-y-4 ${elevationSystem.raised}`}>

                <div>
                  <Field
                    label="Nombre de la Sección Nueva"
                    type="text"
                    value={newSectionTitle}
                    onChange={(e: any) => setNewSectionTitle(e.target.value)}
                    placeholder="Ej: DOCENCIA UNIVERSITARIA, OBRAS DE ARTE"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-neutral-text-primary)] mb-1.5">
                    Seleccionar qué campos tendrá cada registro de esta sección:
                  </label>
                  <div className={`grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-[var(--color-neutral-surface-muted)] rounded-[${radius.card}] border border-[var(--color-neutral-border)]`}>
                    {Object.values(FIELD_CATALOG).map((f) => {
                      const isChecked = selectedFields.includes(f.id);
                      return (
                        <label key={f.id} className="flex items-center gap-2 text-[11px] font-bold text-[var(--color-neutral-text-primary)] cursor-pointer hover:text-[var(--color-accent-base)]">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                if (selectedFields.length > 1) {
                                  setSelectedFields(prev => prev.filter(id => id !== f.id));
                                } else {
                                  showWarning('Debes mantener al menos 1 campo seleccionado.');
                                }
                              } else {
                                setSelectedFields(prev => [...prev, f.id]);
                              }
                            }}
                            className="rounded border-[var(--color-neutral-border)] text-[var(--color-accent-text)] focus:ring-[var(--color-accent-base)]"
                          />
                          <span>{f.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!newSectionTitle.trim()) {
                      showWarning('Por favor ingresa un nombre para la sección.');
                      return;
                    }
                    const customSlots = ['personalizada-1', 'personalizada-2', 'personalizada-3', 'personalizada-4', 'personalizada-5'] as const;
                    const freeSlot = customSlots.find(
                      (slotId) => cvData?.sectionVisibility?.[slotId] !== true && (!cvData?.[slotId] || cvData[slotId].length === 0) && !cvData?.sectionTitleOverrides?.[slotId]
                    );

                    if (!freeSlot) {
                      showWarning('Ya usaste las 5 secciones personalizadas disponibles. Puedes reutilizar una sección existente cambiando su nombre.');
                      return;
                    }

                    const titleText = newSectionTitle.trim();
                    setCvData((prev: any) => ({
                      ...prev,
                      sectionVisibility: { ...(prev.sectionVisibility || {}), [freeSlot]: true },
                      sectionTitleOverrides: { ...(prev.sectionTitleOverrides || {}), [freeSlot]: titleText },
                      sectionFieldSelection: { ...(prev.sectionFieldSelection || {}), [freeSlot]: [...selectedFields] },
                      [freeSlot]: prev[freeSlot]?.length ? prev[freeSlot] : [{}],
                      layout: {
                        ...(prev.layout || {}),
                        columnAssignments: {
                          ...(prev.layout?.columnAssignments || {}),
                          [freeSlot]: 'primaria'
                        },
                        sectionOrders: {
                          ...(prev.layout?.sectionOrders || {}),
                          primaria: [...(prev.layout?.sectionOrders?.primaria || []), freeSlot]
                        }
                      }
                    }));

                    setNewSectionTitle('');
                    showSuccess(`Sección '${titleText}' creada exitosamente.`);
                    changeActiveTab(freeSlot);
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--color-secondary-base)] hover:bg-[var(--color-secondary-hover)] text-[var(--color-secondary-on-base)] text-xs font-black rounded-[${radius.card}] ${elevationSystem.raised} transition cursor-pointer`}
                >
                  <Plus className="w-4 h-4" /> Crear e Integrar Sección al CV
                </button>
              </div>

              {/* Secciones Personalizadas Activas (Slots del Núcleo) */}
              {(() => {
                const customSlots = ['personalizada-1', 'personalizada-2', 'personalizada-3', 'personalizada-4', 'personalizada-5'] as const;
                const activeSlots = customSlots.filter(s => cvData?.sectionVisibility?.[s] === true || cvData?.sectionTitleOverrides?.[s]);
                if (activeSlots.length === 0 && (!cvData?.customSections || cvData.customSections.length === 0)) return null;

                return (
                  <div className="space-y-4 pt-2">
                    <h4 className="text-xs font-black text-[var(--color-neutral-text-primary)] uppercase border-b pb-1 border-[var(--color-neutral-border)]">
                      Tus Secciones Personalizadas ({activeSlots.length + (cvData?.customSections?.length || 0)})
                    </h4>

                    {activeSlots.map((slotId) => (
                      <div key={slotId} className={`p-3 bg-[var(--color-neutral-surface-muted)] rounded-[${radius.modal}] border-2 border-[var(--color-neutral-border)] flex items-center justify-between`}>
                        <span className="text-xs font-black text-[var(--ui-rose)] uppercase">
                          {cvData?.sectionTitleOverrides?.[slotId] || slotId}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeActiveTab(slotId)}
                          className={`px-3 py-1 font-bold text-xs rounded-[${radius.card}] transition cursor-pointer ${button.primary}`}
                        >
                          Editar Registros →
                        </button>
                      </div>
                    ))}

                    {(cvData?.customSections || []).map((cs: any) => (
                      <div key={cs.id} className={`p-3 bg-[var(--color-neutral-surface-muted)] rounded-[${radius.modal}] border-2 border-[var(--color-neutral-border)] flex items-center justify-between`}>
                        <span className="text-xs font-black text-[var(--ui-rose)] uppercase">
                          {cs.titleText}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeActiveTab(cs.id)}
                          className={`px-3 py-1 font-bold text-xs rounded-[${radius.card}] transition cursor-pointer ${button.primary}`}
                        >
                          Editar Registros →
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </PanelSection>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PANEL DE EDICIÓN DE UN SLOT DE SECCIÓN PERSONALIZADA (activeTab = personalizada-N) */}
        {/* ========================================================================= */}
        {(() => {
          if (!activeTab || !activeTab.startsWith('personalizada-')) return null;
          const slotId = activeTab;
          const titleText = cvData?.sectionTitleOverrides?.[slotId] || `Sección Personalizada (${slotId})`;
          const activeFields = cvData?.sectionFieldSelection?.[slotId] || ['tituloOGrado', 'institucion', 'periodo', 'descripcion'];

          return (
            <div className="space-y-4">
              <div className={`p-3.5 bg-[var(--ui-bg-card)] rounded-[${radius.modal}] border-2 border-[var(--color-neutral-border)] space-y-3 ${elevationSystem.raised}`}>
                <Field
                  label="Nombre de la Sección (así se ve en el PDF)"
                  value={cvData?.sectionTitleOverrides?.[slotId] || ''}
                  onChange={(e: any) => {
                    const val = e.target.value;
                    setCvData((prev: any) => ({
                      ...prev,
                      sectionTitleOverrides: {
                        ...(prev.sectionTitleOverrides || {}),
                        [slotId]: val
                      }
                    }));
                  }}
                  placeholder="Ej: Voluntariado & ONG"
                />

                <div>
                  <p className="text-[11px] font-bold text-[var(--color-neutral-text-secondary)] mb-1.5">
                    ¿Qué campos debe tener cada registro?
                  </p>
                  <div className={`grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-[var(--color-neutral-surface-muted)] rounded-[${radius.card}] border border-[var(--color-neutral-border)]`}>
                    {Object.values(FIELD_CATALOG).map((f) => {
                      const isChecked = activeFields.includes(f.id);
                      return (
                        <label key={f.id} className="flex items-center gap-2 text-[11px] font-bold text-[var(--color-neutral-text-primary)] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const updated = isChecked
                                ? (activeFields.length > 1 ? activeFields.filter((id: string) => id !== f.id) : activeFields)
                                : [...activeFields, f.id];
                              setCvData((prev: any) => ({
                                ...prev,
                                sectionFieldSelection: {
                                  ...(prev.sectionFieldSelection || {}),
                                  [slotId]: updated
                                }
                              }));
                            }}
                            className="rounded border-[var(--color-neutral-border)] text-[var(--color-accent-text)]"
                          />
                          <span>{f.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <RecordFormSection
                key={slotId}
                sectionKey={slotId}
                sectionTitle={titleText}
                kindKey="custom"
                customFields={activeFields}
                addLabel={`Agregar Registro a ${titleText}`}
                cvData={cvData}
                setCvData={setCvData}
                fieldName={slotId}
                itemTitlePrefix={titleText}
                onDeleteSection={() => {
                  confirm({
                    title: `¿Eliminar sección '${titleText}'?`,
                    message: 'Se desactivará esta sección y se limpiarán sus registros.',
                    confirmText: 'Eliminar Sección',
                    onConfirm: () => {
                      setCvData((prev: any) => ({
                        ...prev,
                        sectionVisibility: { ...(prev.sectionVisibility || {}), [slotId]: false },
                        sectionTitleOverrides: { ...(prev.sectionTitleOverrides || {}), [slotId]: undefined },
                        [slotId]: []
                      }));
                      changeActiveTab('personales');
                      showSuccess(`Sección '${titleText}' eliminada.`);
                    }
                  });
                }}
                manualAdjustment={<SectionManualAdjustment sectionId={slotId} cvData={cvData} setCvData={setCvData} />}
              />
            </div>
          );
        })()}

        {/* PANEL DE EDICIÓN DE UNA SECCIÓN PERSONALIZADA LEGADO (customSections[]) */}
        {(() => {
          const customIdx = (cvData.customSections || []).findIndex((cs: any) => cs.id === activeTab && cs.id !== 'ecologia');
          if (customIdx === -1) return null;
          const cs = cvData.customSections[customIdx];
          return (
            <RecordFormSection
              key={cs.id}
              sectionKey={cs.id}
              sectionTitle={cs.titleText}
              kindKey="custom"
              customFields={cs.fields}
              addLabel={`Agregar a ${cs.titleText}`}
              cvData={cvData}
              setCvData={setCvData}
              fieldName={`customSections.${customIdx}.records`}
              itemTitlePrefix={cs.titleText}
              onDeleteSection={() => {
                confirm({
                  title: `¿Eliminar sección '${cs.titleText}'?`,
                  message: 'Se eliminarán esta sección y todos sus registros.',
                  confirmText: 'Eliminar Sección',
                  onConfirm: () => {
                    setCvData((prev: any) => ({
                      ...prev,
                      customSections: (prev.customSections || []).filter((s: any) => s.id !== cs.id)
                    }));
                    changeActiveTab('personales');
                    showSuccess(`Sección '${cs.titleText}' eliminada.`);
                  }
                });
              }}
              manualAdjustment={<SectionManualAdjustment sectionId={cs.id} cvData={cvData} setCvData={setCvData} />}
            />
          );
        })()}

        {/* ========================================================================= */}
        {/* TAB 10: CVS GUARDADOS / ABRIR */}
        {/* ========================================================================= */}
        {activeTab === 'guardados' && (
          <GuardadosSection
            savedList={savedList}
            isSavingFromPanel={isSavingFromPanel}
            handleSaveFromPanel={handleSaveFromPanel}
            handleOpenSavedFromPanel={handleOpenSavedFromPanel}
            handleDeleteSavedFromPanel={handleDeleteSavedFromPanel}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB: DISEÑO */}
        {/* ========================================================================= */}
        {activeTab === 'diseno' && (
          <div className="space-y-6">
            {/* Encabezado explicativo de Cascada de 3 Niveles */}
            <div className="p-3 bg-[var(--ui-bg-card)] border border-[var(--color-neutral-border)] rounded-[var(--radius-card)] text-xs text-[var(--color-neutral-text-secondary)] font-medium flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--color-accent-amber-bright)] flex-shrink-0" />
                <span className="font-bold text-[var(--color-neutral-text-primary)]">
                  {getUiHint('cascadaDiseno')}
                </span>
              </div>
              {hasDesignOverrides && (
                  <button
                    type="button"
                    onClick={() => {
                      setCvData((prev: any) => ({
                        ...prev,
                        colorPresetId: undefined,
                        typographyPresetId: undefined,
                        columnLayoutPresetId: undefined
                      }));
                      showSuccess('Ajustes personalizados reseteados a la plantilla base.');
                    }}
                    className="px-2 py-0.5 rounded bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)] font-black text-[10px] flex items-center gap-1 hover:opacity-80 transition cursor-pointer"
                    title="Resetear ajustes personalizados"
                  >
                    <span>{UI_GLOSSARY.labels.customized}</span>
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Formato de Papel */}
              <PanelSection icon={<Layout className="w-4 h-4" />} title={UI_GLOSSARY.labels.paperFormat}>
                <div className={`p-3 bg-[var(--ui-bg-card)] rounded-[${radius.card}] border border-[var(--color-neutral-border)]`}>
                  <label className="block text-xs font-bold text-[var(--color-neutral-text-primary)] mb-1.5">
                    Tamaño de Hoja / Formato de Papel
                  </label>
                  <select
                    value={cvData.layout?.pageSizeId || cvData.layout?.paperSize || cvData.cardSize || 'a4'}
                    onChange={(e) => handlePaperSizeChange(e.target.value)}
                    className={`w-full text-xs p-2.5 rounded-[${radius.card}] border border-[var(--color-secondary-base)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] font-bold outline-none cursor-pointer`}
                  >
                    {Object.values(PAGE_SIZES).filter((size) => {
                      const isCard = docType === 'business_card';
                      if (isCard) {
                        return size.category === 'tarjeta' && ['tarjeta_estandar', 'tarjeta_europea', 'tarjeta_cuadrada', 'tarjeta_mini'].includes(size.id);
                      }
                      return size.category === 'documento' && ['a4', 'carta', 'legal', 'oficio'].includes(size.id);
                    }).map((size) => (
                      <option key={size.id} value={size.id}>
                        📄 {size.label}
                      </option>
                    ))}
                  </select>
                </div>
              </PanelSection>

            {/* Formato Global & Estándares Internacionales (ATS, US Resume, Europass, Tech, LATAM) */}
            {!isBusinessCard && (
              <PanelSection icon={<Globe className="w-4 h-4 text-[var(--color-accent-text)]" />} title="Estándar & Formato Global (Internacional)">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {getAllCvFormats().map((format) => {
                    const isSelected = resolveActiveFormatId(cvData) === format.id;
                    return (
                      <button
                        key={format.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) return;
                          setPendingFormatId(format.id);
                          setIsFormatModalOpen(true);
                        }}
                        className={`w-full p-2.5 rounded-[${radius.card}] border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-rose-muted)]/30 ring-2 ring-[var(--color-accent-base)]/30'
                            : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-black text-[var(--color-neutral-text-primary)] flex items-center gap-1.5 truncate">
                            {format.name}
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase bg-white border border-[var(--color-neutral-border-strong)] text-[var(--color-neutral-text-secondary)]">
                              {format.columnLayoutPresetId === 'full-width' ? '1 Col' : '2 Col'}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[var(--ui-text-primary)] flex-shrink-0" />}
                          </div>
                        </div>
                        <p className="text-[10px] text-[var(--color-neutral-text-secondary)] leading-relaxed line-clamp-2">
                          {format.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </PanelSection>
            )}

            {/* Tipografía Principal */}
            <PanelSection icon={<FileText className="w-4 h-4" />} title="Tipografía">
              <div className={`p-3 bg-[var(--ui-bg-card)] rounded-[${radius.card}] border border-[var(--color-neutral-border)]`}>
                <label className="block text-xs font-bold text-[var(--color-neutral-text-primary)] mb-1.5">
                  Fuente Principal del Documento (Google Fonts)
                </label>
                <select
                  value={cvData?.theme?.fontFamily || "'Outfit', sans-serif"}
                  onChange={(e) => updateTheme('fontFamily', e.target.value)}
                  className={`w-full text-xs p-2.5 rounded-[${radius.card}] border border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] font-bold outline-none cursor-pointer`}
                >
                  {fontOptions.map((f) => (
                    <option key={f.id} value={f.value}>{f.name}</option>
                  ))}
                </select>
              </div>
            </PanelSection>

            {/* Estructura de Columnas (Layout) y Tirador de Ancho */}
            {!isBusinessCard && (
              <PanelSection icon={<Columns3 className="w-4 h-4" />} title="Disposición de columnas y Ancho">
                {(() => {
                  const activePresetObj = resolveActivePreset(cvData);
                  const activeLayoutKey = cvData?.columnLayoutPresetId || (activePresetObj.columnLayoutPresetId?.replace('layout-', '') || 'sidebar-left');
                  const sidebarPercent = Math.min(42, Math.max(32, cvData?.layout?.sidebarWidthPercent ?? 40));

                  return (
                    <div className="space-y-2.5">
                      {/* Fila 1: Barra Izquierda (40%) / Barra Derecha (40%) */}
                      <div className="grid grid-cols-2 gap-2">
                        {['sidebar-left', 'sidebar-right'].map((key) => {
                          const activeFormat = resolveActiveFormat(cvData);
                          const isSingleColumnFormat = activeFormat?.columnLayoutPresetId === 'full-width';
                          const isSelected = activeLayoutKey === key;
                          const label = key === 'sidebar-left' ? 'Barra Izquierda (40%)' : 'Barra Derecha (40%)';

                          return (
                            <button
                              key={key}
                              disabled={isSingleColumnFormat}
                              onClick={() => {
                                triggerPresetTransition(label, 'layout');
                                setCvData((prev: any) => applyPresetLevel(prev, 'override', { columnLayoutPresetId: key }));
                              }}
                              className={`p-2.5 rounded-[var(--radius-card)] border text-left transition flex items-center justify-between gap-1.5 ${
                                isSingleColumnFormat
                                  ? 'opacity-40 cursor-not-allowed bg-[var(--ui-bg-panel)] border-[var(--color-neutral-border)]'
                                  : isSelected
                                    ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-rose-muted)]/30 ring-2 ring-[var(--color-accent-base)]/30 cursor-pointer'
                                    : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)] cursor-pointer'
                              }`}
                            >
                              <span className="text-[11px] font-black text-[var(--color-neutral-text-primary)] truncate">{label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[var(--ui-text-primary)] flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Fila 2: Columna Única Completa (100%) / Ancho de Barra Lateral */}
                      <div className="grid grid-cols-2 gap-2 items-center">
                        {(() => {
                          const key = 'full-width';
                          const isSelected = activeLayoutKey === key;
                          const label = 'Columna Única (100%)';
                          return (
                            <button
                              key={key}
                              onClick={() => {
                                triggerPresetTransition(label, 'layout');
                                setCvData((prev: any) => applyPresetLevel(prev, 'override', { columnLayoutPresetId: key }));
                              }}
                              className={`p-2.5 rounded-[var(--radius-card)] border text-left transition flex items-center justify-between gap-1.5 h-full ${
                                isSelected
                                  ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-rose-muted)]/30 ring-2 ring-[var(--color-accent-base)]/30 cursor-pointer'
                                  : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)] cursor-pointer'
                              }`}
                            >
                              <span className="text-[11px] font-black text-[var(--color-neutral-text-primary)] truncate">{label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[var(--ui-text-primary)] flex-shrink-0" />}
                            </button>
                          );
                        })()}

                        {activeLayoutKey !== 'full-width' ? (
                          <div className="p-2 bg-[var(--ui-bg-card)] border border-[var(--color-neutral-border)] rounded-[var(--radius-card)] space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-bold text-[var(--color-neutral-text-primary)]">
                              <span>Ancho Sidebar</span>
                              <span className="text-[var(--color-secondary-bright)] font-black">{sidebarPercent}%</span>
                            </div>
                            <input
                              type="range"
                              min={32}
                              max={42}
                              step={1}
                              value={sidebarPercent}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setCvData((prev: any) => ({
                                  ...prev,
                                  layout: {
                                    ...(prev.layout || {}),
                                    sidebarWidthPercent: val
                                  }
                                }));
                              }}
                              className={`w-full h-1 bg-[var(--ui-bg-panel)] rounded-[${radius.control}] appearance-none cursor-pointer accent-[var(--color-secondary-base)]`}
                            />
                          </div>
                        ) : (
                          <div className="p-2 bg-[var(--ui-bg-panel)] border border-[var(--color-neutral-border)]/40 rounded-[var(--radius-card)] text-center text-[10px] font-medium text-[var(--color-neutral-text-secondary)]">
                            Ancho fijo 100%
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </PanelSection>
            )}

            {/* Armonía Cromática */}
            <PanelSection icon={<Palette className="w-4 h-4" />} title="Paleta de color armónica">
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(PRESET_COLORS).map(([key, colorPreset]) => {
                  const activePresetObj = resolveActivePreset(cvData);
                  const activeColorKey = cvData?.colorPresetId || activePresetObj.colorPresetId || 'clasico';
                  const isSelected = activeColorKey === key;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        triggerPresetTransition(colorPreset.name, 'color');
                        setCvData((prev: any) => applyPresetLevel(prev, 'override', { colorPresetId: key }));
                      }}
                      className={`p-2 rounded-[${radius.card}] border text-left transition flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-rose-muted)]/30 ring-2 ring-[var(--color-accent-base)]/30'
                          : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-[var(--color-neutral-text-primary)] truncate pr-0.5" title={colorPreset.name}>{colorPreset.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-[var(--ui-text-primary)] flex-shrink-0" />}
                      </div>
                      <div className="flex gap-1 items-center">
                        <div className={`w-3.5 h-3.5 rounded-full border border-[var(--ui-border)] ${elevationSystem.raised}`} style={{ backgroundColor: colorPreset.palette.primary }} />
                        <div className={`w-3.5 h-3.5 rounded-full border border-[var(--ui-border)] ${elevationSystem.raised}`} style={{ backgroundColor: colorPreset.palette.accent }} />
                        <div className={`w-3.5 h-3.5 rounded-full border border-[var(--ui-border)] ${elevationSystem.raised}`} style={{ backgroundColor: colorPreset.palette.secondary }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </PanelSection>

            {/* Escala Tipográfica */}
            <PanelSection icon={<FileText className="w-4 h-4" />} title="Escala tipográfica armónica">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(PRESET_TYPOGRAPHY).map(([key, typoPreset]) => {
                  const activePresetObj = resolveActivePreset(cvData);
                  const activeTypoKey = cvData?.typographyPresetId || activePresetObj.typographyPresetId || 'clasica';
                  const isSelected = activeTypoKey === key;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        triggerPresetTransition(typoPreset.name, 'typography');
                        setCvData((prev: any) => applyPresetLevel(prev, 'override', { typographyPresetId: key }));
                      }}
                      className={`p-2.5 rounded-[${radius.card}] border text-left transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-rose-muted)]/30 ring-2 ring-[var(--color-accent-base)]/30'
                          : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)]'
                      }`}
                    >
                      <span className="text-[11px] font-bold text-[var(--color-neutral-text-primary)]">{typoPreset.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[var(--ui-text-primary)] flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </PanelSection>

            {/* Plantilla Base Predefinida */}
            {!isBusinessCard && (
              <PanelSection icon={<Sparkles className="w-4 h-4" />} title="Plantilla base predefinida">
                <div className="grid grid-cols-2 gap-2">
                  {getAllPresets().filter(p => p.id !== 'tarjeta-personal').map((preset) => {
                    const isSelected = (cvData?.activePresetId || 'cv-clasico') === preset.id;
                    const hasOverrides = !!(cvData?.colorPresetId || cvData?.typographyPresetId || cvData?.columnLayoutPresetId);
                    return (
                      <button
                        key={preset.id}
                        onClick={() => {
                          triggerPresetTransition(preset.name, 'preset');
                          setCvData((prev: any) => applyPresetLevel(prev, 'preset', { presetId: preset.id }));
                        }}
                        className={`p-2.5 rounded-[${radius.card}] border text-left transition flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-rose-muted)]/30 ring-2 ring-[var(--color-accent-base)]/30'
                            : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5 gap-1">
                          <div className="flex items-center gap-1 min-w-0 pr-1">
                            <span className="text-[11px] font-bold text-[var(--color-neutral-text-primary)] truncate">{preset.name}</span>
                            {isSelected && hasOverrides && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] font-black flex-shrink-0">
                                + personalizado
                              </span>
                            )}
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[var(--ui-text-primary)] flex-shrink-0" />}
                        </div>
                        <div className="flex gap-1.5 items-center">
                          <div className={`w-4 h-4 rounded-full border border-[var(--ui-border)] ${elevationSystem.raised}`} style={{ backgroundColor: preset.palette.primary }} />
                          <div className={`w-4 h-4 rounded-full border border-[var(--ui-border)] ${elevationSystem.raised}`} style={{ backgroundColor: preset.palette.accent }} />
                          <div className={`w-4 h-4 rounded-full border border-[var(--ui-border)] ${elevationSystem.raised}`} style={{ backgroundColor: preset.palette.secondary }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </PanelSection>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: PORTADA (NUEVA PESTAÑA DEDICADA) */}
        {/* ========================================================================= */}
        {activeTab === 'portada' && (
          <div className="space-y-6">
            <PanelSection icon={<Sparkles className="w-4 h-4" />} title="Portada">
              {/* Cover Page Toggle */}
              <div className={`flex items-center justify-between p-3 rounded-[${radius.card}] border transition ${
                cvData.showCoverPage !== false 
                  ? 'bg-[var(--ui-bg-card)] border-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] ${elevationSystem.raised}' 
                  : 'bg-[var(--color-neutral-surface-muted)] border-[var(--color-neutral-border)] text-[var(--color-neutral-text-muted)] opacity-75'
              }`}>
                <span className="text-xs font-bold uppercase tracking-wide">
                  Portada de Impacto (Página 1)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const willEnable = cvData.showCoverPage === false;
                    triggerPresetTransition(willEnable ? 'Portada Activada' : 'Portada Desactivada', 'cover');
                    setCvData((prev: any) => ({ ...prev, showCoverPage: !prev.showCoverPage }));
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-black transition flex items-center gap-1.5 ${elevationSystem.raised} cursor-pointer ${
                    cvData.showCoverPage !== false
                      ? 'bg-[var(--color-accent-purple-hover)] text-white hover:opacity-90'
                      : 'bg-[var(--color-neutral-text-muted)] text-white hover:opacity-80'
                  }`}
                >
                  <span>{cvData.showCoverPage !== false ? 'ACTIVADA' : 'DESACTIVADA'}</span>
                </button>
              </div>

              {cvData.showCoverPage !== false && (
                <>
                  {/* Registros Destacados en Portada (Solo Títulos, con botón Agregar/Eliminar) */}
                  {(() => {
                    const effectiveCoverItems = getEffectiveCoverFeaturedItems(cvData);
                    return (
                      <div className={`p-3 bg-[var(--ui-bg-card)] rounded-[${radius.card}] border border-[var(--color-neutral-border)] space-y-3`}>
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-[var(--color-neutral-text-primary)]">
                            Registros Destacados en Portada ({effectiveCoverItems.length})
                          </label>
                        </div>
                        
                        {/* Selector Desplegable para Agregar Registro Ingresado */}
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-medium text-[var(--color-neutral-text-secondary)]">
                            Seleccionar título de registros cargados:
                          </label>
                          <select
                            onChange={(e) => {
                              const selectedTitle = e.target.value;
                              if (selectedTitle) {
                                if (!cvData.roles?.includes(selectedTitle)) {
                                  setCvData((prev: any) => ({
                                    ...prev,
                                    roles: [...(prev.roles || []), selectedTitle]
                                  }));
                                } else {
                                  showWarning('Este título ya está agregado a la portada.');
                                }
                                e.target.value = '';
                              }
                            }}
                            defaultValue=""
                            className={`w-full text-xs p-2.5 rounded-[${radius.card}] border border-[var(--color-secondary-base)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] font-bold outline-none cursor-pointer`}
                          >
                            <option value="" disabled>-- Seleccionar título para destacar --</option>
                            {[
                              ...(cvData.education || []).map((e: any) => e.degree).filter(Boolean),
                              ...(cvData.profession || []).map((p: any) => p.degree).filter(Boolean),
                              ...(cvData.experience || []).map((x: any) => x.role).filter(Boolean),
                              ...(cvData.coursesAndCertificates || []).map((c: any) => c.title || c.course).filter(Boolean),
                              ...(cvData.customSections || []).flatMap((cs: any) => (cs.records || []).map((r: any) => r.tituloOGrado || r.cargo || r.title)).filter(Boolean)
                            ].map((titleStr: string, idx: number) => (
                              <option key={idx} value={titleStr}>
                                {titleStr}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Lista de Registros Destacados con Indicadores Claros */}
                        <div className="space-y-1.5 pt-2">
                          {effectiveCoverItems.length === 0 ? (
                            <p className={`text-xs text-[var(--color-neutral-text-secondary)] italic text-center py-2 border border-dashed border-[var(--color-neutral-border)] rounded-[${radius.card}]`}>
                              No hay registros ni títulos destacados en la portada aún.
                            </p>
                          ) : (
                            effectiveCoverItems.map((item, idx) => (
                              <div key={item.id || idx} className={`flex items-center justify-between p-2 bg-[var(--ui-bg-card)] rounded-[${radius.control}] border border-[var(--color-neutral-border)] text-xs`}>
                                <div className="flex flex-col">
                                  <span className="font-bold text-[var(--color-neutral-text-primary)]">{item.label}</span>
                                  {item.isFallback && (
                                    <span className="text-[10px] text-[var(--color-neutral-text-secondary)] italic">
                                      (Por defecto desde Datos Personales)
                                    </span>
                                  )}
                                  {!item.isFallback && item.source !== 'roles' && (
                                    <span className="text-[10px] text-[var(--color-neutral-text-secondary)] italic">
                                      ({item.source === 'education' ? 'Formación Destacada' : 'Profesión Destacada'})
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (item.source === 'roles') {
                                      // Remove from roles array
                                      setCvData((prev: any) => ({
                                        ...prev,
                                        roles: (prev.roles || []).filter((_: any, i: number) => i !== idx)
                                      }));
                                    } else if (item.source === 'education') {
                                      setCvData((prev: any) => ({ ...prev, coverFeaturedEducationId: undefined }));
                                    } else if (item.source === 'profession') {
                                      setCvData((prev: any) => ({ ...prev, coverFeaturedProfessionId: undefined }));
                                    } else if (item.source === 'titlePrefix') {
                                      // Override fallback by explicitly setting roles to empty array or setting titlePrefix
                                      setCvData((prev: any) => ({
                                        ...prev,
                                        roles: [],
                                        personalInfo: { ...(prev.personalInfo || {}), titlePrefix: '' }
                                      }));
                                    }
                                  }}
                                  className="p-1 text-[var(--color-status-danger-text)] hover:bg-[var(--color-status-danger-muted)] rounded transition cursor-pointer"
                                  title="Quitar de portada"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Selector de Presets de Diseño de Portada */}
                  <div className={`p-4 bg-[var(--ui-bg-card)] rounded-[${radius.card}] border border-[var(--color-neutral-border)] space-y-3`}>
                    <div>
                      <h4 className="text-xs font-black text-[var(--color-neutral-text-primary)] uppercase tracking-wider mb-1">
                        Selecciona el Preset de Diseño de Portada *
                      </h4>
                      <p className="text-[11px] font-bold text-[var(--color-neutral-text-secondary)]">
                        Elige el estilo visual y arquetipo de composición para la portada de presentación (Página 1).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {COVER_PRESETS.map((presetItem) => {
                        const isActive = (cvData.coverStyle || 'monica-classic') === presetItem.id;
                        return (
                          <div
                            key={presetItem.id}
                            onClick={() => {
                              triggerPresetTransition(presetItem.name, 'cover');
                              setCvData((prev: any) => ({ ...prev, coverStyle: presetItem.id }));
                            }}
                            className={`p-3 rounded-[12px] border-2 cursor-pointer transition flex flex-col justify-between ${
                              isActive
                                ? 'bg-[var(--ui-bg-card)] border-[var(--color-accent-base)] ring-2 ring-[var(--color-accent-base)]/40 shadow-[var(--shadow-floating)]'
                                : 'bg-[var(--ui-bg-panel)] border-[var(--ui-border)] hover:border-[var(--color-secondary-bright)] hover:bg-[var(--ui-bg-card)]'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                {/* check-contrast-ignore-next-line */}
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs" style={{ backgroundColor: presetItem.badgeBg, color: presetItem.badgeTextColor }}>
                                  {presetItem.badgeLabel}
                                </span>
                                {isActive && (
                                  <span className="flex items-center gap-1 text-[10px] font-black text-[var(--color-accent-on-base)] bg-[var(--color-accent-base)] px-2.5 py-0.5 rounded-full shadow-[var(--shadow-raised)]">
                                    <Check className="w-3 h-3" /> ACTIVO
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-black text-[var(--ui-text-primary)] mb-0.5">
                                {presetItem.name}
                              </p>
                              <p className="text-[11px] font-extrabold text-[var(--color-secondary-bright)] mb-1.5 leading-snug">
                                {presetItem.subtitle}
                              </p>
                              <p className="text-[10px] font-medium text-[var(--ui-text-primary)] opacity-90 line-clamp-2 leading-relaxed">
                                {presetItem.description}
                              </p>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-[var(--ui-border)] flex items-center justify-between text-[10px] font-extrabold text-[var(--ui-text-secondary)]">
                              <span>{presetItem.scanPattern}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
              </PanelSection>
          </div>
        )}

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
