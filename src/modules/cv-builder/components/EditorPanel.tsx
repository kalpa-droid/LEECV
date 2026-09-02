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
  X
} from 'lucide-react';
import { fontOptions } from '../../../data/fontOptions';
import { getColumnAssignableSections } from '../../../shared/core/sectionRegistry';
import { getAllPresets, PRESET_COLORS, PRESET_TYPOGRAPHY, PRESET_COLUMNS, getColumnLayoutPresetName, resolveActivePreset } from '../../../shared/core/pdf-engine/layers/presets/presetRegistry';
import { getAllCvFormats, getCvFormat, getFormatDefaultVisibility, resolveActiveFormatId, resolveActiveFormat } from '../../../shared/core/formats/cvFormatRegistry';
import { FIELD_CATALOG } from '../../../shared/core/pdf-engine/layers/records/fieldCatalog';
import { PAGE_SIZES } from '../../../shared/core/pdf-engine/layers/page/pageSizes';
import { resolveDisplayName } from '../../../shared/core/utils/cvDataSchema';
import { getSavedCVsList, loadCVById, deleteCVById, saveCV } from '../services/cvStorageService';
import CertCropperModal from './CertCropperModal';
import { FormatConfirmationModal, FormatApplicationMode } from './FormatConfirmationModal';
import { COVER_PRESETS } from '../../../shared/core/pdf-engine/layers/presets/coverPresetCatalog';
import PersonalInfoSection from './editor/PersonalInfoSection';
import { PanelSection } from './editor/PanelSection';
import { SectionManualAdjustment } from './editor/SectionManualAdjustment';
import { applyPresetLevel } from '../../../shared/core/pdf-engine/layers/presets/presetHierarchyEngine';
import { activateSection } from '../../../shared/core/sections/sectionActivationEngine';
import { triggerPresetTransition } from '../../../shared/core/pdf-engine/layers/presets/presetTransitionEngine';

import { useToast } from '../../../shared/core/ui/Toast';
import { useConfirm } from '../../../shared/core/ui/ConfirmDialog';
import { RepeatableSection } from '../../../shared/core/ui/RepeatableSection';
import { RecordFormSection } from '../../../shared/core/ui/RecordFormSection';
import { Field } from '../../../shared/core/ui/Field';
import { UI_GLOSSARY } from '../../../shared/core/ui/uiTextGlossary';

import { colorSystem, typeScale, elevationSystem, radius } from '../../../shared/core/uiDesignSystem';

export default function EditorPanel({ 
  cvData, 
  setCvData, 
  activeTab,
  setActiveTab,
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

  const hasDesignOverrides = !!(cvData?.colorPresetId || cvData?.typographyPresetId || cvData?.columnLayoutPresetId);

  // Local states for Certificate Tab inside EditorPanel
  const [certMode, setCertMode] = useState('upload'); // 'upload' | 'camera'
  const [selectedRegIdx, setSelectedRegIdx] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCertCropperOpen, setIsCertCropperOpen] = useState(false);
  const [rawCertSrc, setRawCertSrc] = useState('');
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

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

  // Camera Handlers
  const startCamera = async () => {
    try {
      setCertMode('camera');
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      showError('No se pudo acceder a la cámara. Por favor verifica los permisos o sube una imagen.');
      setCertMode('upload');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Auto-compress heavy images (e.g. 15MB phone photos) before opening cropper modal
  const compressRawImageBeforeCropping = (dataUrl, callback) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1600;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const lightweightDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      callback(lightweightDataUrl);
    };
    img.src = dataUrl;
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    stopCamera();
    setCertMode('upload');
    compressRawImageBeforeCropping(dataUrl, (compressedUrl) => {
      setRawCertSrc(compressedUrl);
      setIsCertCropperOpen(true);
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        compressRawImageBeforeCropping(evt.target.result, (compressedUrl) => {
          setRawCertSrc(compressedUrl);
          setIsCertCropperOpen(true);
        });
      };
      reader.readAsDataURL(file);
    }
  };





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
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-[var(--color-accent-base)] hover:bg-[var(--color-accent-brand-hover)] text-[var(--color-accent-on-base)] ${elevationSystem.raised} transition cursor-pointer`}
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
        {activeTab === 'redes' && (
          <RepeatableSection
            sectionKey="redes"
            sectionTitle="Redes Sociales & Enlaces"
            addLabel="Agregar Red / Enlace"
            cvData={cvData}
            setCvData={setCvData}
            fieldName="redes"
            emptyItem={{ plataforma: 'LinkedIn', usuario: '', url: '' }}
            itemTitlePrefix="Red Social / Enlace"
            getItemName={(item: any, idx: number) => item?.plataforma || item?.usuario || item?.url || `Red #${idx + 1}`}
            renderItem={(item: any, idx: number, updateField: (field: string, val: any) => void) => (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-neutral-text-secondary)] mb-1">Plataforma / Red</label>
                    <select
                      value={item.plataforma || 'LinkedIn'}
                      onChange={(e) => updateField('plataforma', e.target.value)}
                      className="w-full text-xs p-2 rounded-[10px] bg-[var(--ui-bg-card)] border border-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] font-bold outline-none cursor-pointer"
                    >
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="GitHub / GitLab">GitHub / GitLab</option>
                      <option value="Sitio Web / Portafolio">Sitio Web / Portafolio</option>
                      <option value="Email">Email</option>
                      <option value="WhatsApp Business">WhatsApp Business</option>
                      <option value="X / Twitter">X / Twitter</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Facebook">Facebook</option>
                      <option value="YouTube">YouTube</option>
                      <option value="TikTok">TikTok</option>
                      <option value="Behance / Dribbble">Behance / Dribbble</option>
                      <option value="Otra Red / Enlace">Otra Red / Enlace</option>
                    </select>
                  </div>
                  <Field
                    label="Nombre de Usuario / Leyenda"
                    value={item.usuario || ''}
                    onChange={(e: any) => updateField('usuario', e.target.value)}
                    placeholder="Ej: @usuario o Mi Perfil"
                  />
                </div>
                <Field
                  label="URL Completa / Enlace Web"
                  value={item.url || ''}
                  onChange={(e: any) => updateField('url', e.target.value)}
                  placeholder="Ej: https://linkedin.com/in/usuario"
                />
              </div>
            )}
            manualAdjustment={<SectionManualAdjustment sectionId="redes" cvData={cvData} setCvData={setCvData} />}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 1.5: COMPETENCIAS CLAVE */}
        {/* ========================================================================= */}
        {activeTab === 'competencias' && (
          <RepeatableSection
            sectionKey="competencias"
            sectionTitle="Competencias Clave / Habilidades"
            addLabel="Agregar Competencia"
            cvData={cvData}
            setCvData={setCvData}
            fieldName="skills"
            emptyItem="Nueva Competencia"
            itemTitlePrefix="Competencia"
            getItemName={(item: any, idx: number) => typeof item === 'string' ? item : (item?.name || item?.title || `Competencia #${idx + 1}`)}
            renderItem={(item: any, idx: number, updateField: (field: string, val: any) => void) => (
              <Field
                label={`Competencia Clave #${idx + 1}`}
                value={typeof item === 'string' ? item : (item?.name || '')}
                onChange={(e: any) => {
                  const val = e.target.value;
                  setCvData((prev: any) => {
                    const currentSkills = [...(Array.isArray(prev.skills) ? prev.skills : [])];
                    currentSkills[idx] = val;
                    return { ...prev, skills: currentSkills };
                  });
                }}
                placeholder="Ej: Pedagogía Dialógica, Alfabetización Digital, Liderazgo..."
              />
            )}
            manualAdjustment={<SectionManualAdjustment sectionId="competencias" cvData={cvData} setCvData={setCvData} />}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB: RESUMEN PROFESIONAL */}
        {/* ========================================================================= */}
        {activeTab === 'resumen' && (
          <div className="space-y-4 bg-white p-4 rounded-[12px] border border-[var(--color-neutral-border)]">
            <h3 className={`${typeScale.sectionTitle} uppercase tracking-wide`} style={{ color: colorSystem.neutral.textPrimary }}>
              Resumen Profesional / Extracto (Elevator Pitch)
            </h3>
            <Field
              id="summary"
              as="textarea"
              rows={5}
              label="Extracto o Perfil Profesional"
              value={cvData.summary || ''}
              onChange={(e: any) => setCvData((prev: any) => ({ ...prev, summary: e.target.value }))}
              placeholder="Ej: Profesional con más de 7 años de experiencia liderando proyectos corporativos, optimización de procesos y gestión de equipos multidisciplinarios..."
            />
            <div className="pt-2 border-t border-[var(--color-neutral-border)]">
              <SectionManualAdjustment sectionId="resumen" cvData={cvData} setCvData={setCvData} />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: HABILIDADES TÉCNICAS (HARD SKILLS) */}
        {/* ========================================================================= */}
        {activeTab === 'habilidades' && (
          <RepeatableSection
            sectionKey="habilidades"
            sectionTitle="Habilidades Técnicas (Hard Skills)"
            addLabel="Agregar Habilidad Técnica"
            cvData={cvData}
            setCvData={setCvData}
            fieldName="hardSkills"
            emptyItem="Nueva Habilidad Técnica"
            itemTitlePrefix="Habilidad"
            getItemName={(item: any, idx: number) => typeof item === 'string' ? item : (item?.name || item?.title || `Habilidad #${idx + 1}`)}
            renderItem={(item: any, idx: number) => (
              <Field
                label={`Habilidad Técnica #${idx + 1}`}
                value={typeof item === 'string' ? item : (item?.name || '')}
                onChange={(e: any) => {
                  const val = e.target.value;
                  setCvData((prev: any) => {
                    const current = [...(Array.isArray(prev.hardSkills) ? prev.hardSkills : [])];
                    current[idx] = val;
                    return { ...prev, hardSkills: current };
                  });
                }}
                placeholder="Ej: Python, React, Docker, AutoCAD, SQL, Modelado Financiero, AWS..."
              />
            )}
            manualAdjustment={<SectionManualAdjustment sectionId="habilidades" cvData={cvData} setCvData={setCvData} />}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB: IDIOMAS & NIVEL CEFR */}
        {/* ========================================================================= */}
        {activeTab === 'idiomas' && (
          <RecordFormSection
            sectionKey="idiomas"
            sectionTitle="Idiomas & Nivel de Dominio"
            kindKey="languages"
            addLabel="Agregar Idioma"
            cvData={cvData}
            setCvData={setCvData}
            fieldName="languages"
            itemTitlePrefix="Idioma"
            helpText="Indica los idiomas que dominas y tu nivel aproximado (A1, A2, B1, B2, C1, C2 o Nativo)."
            manualAdjustment={<SectionManualAdjustment sectionId="idiomas" cvData={cvData} setCvData={setCvData} />}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB: PROYECTOS DESTACADOS */}
        {/* ========================================================================= */}
        {activeTab === 'proyectos' && (
          <RecordFormSection
            sectionKey="proyectos"
            sectionTitle="Proyectos Destacados & Portafolio"
            kindKey="projects"
            addLabel="Agregar Proyecto"
            cvData={cvData}
            setCvData={setCvData}
            fieldName="projects"
            itemTitlePrefix="Proyecto"
            helpText="Destaca aplicaciones, desarrollos, iniciativas o portafolios relevantes para tu puesto."
            manualAdjustment={<SectionManualAdjustment sectionId="proyectos" cvData={cvData} setCvData={setCvData} />}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB: PUBLICACIONES & PATENTES */}
        {/* ========================================================================= */}
        {activeTab === 'publicaciones' && (
          <RecordFormSection
            sectionKey="publicaciones"
            sectionTitle="Publicaciones & Investigaciones"
            kindKey="publications"
            addLabel="Agregar Publicación"
            cvData={cvData}
            setCvData={setCvData}
            fieldName="publications"
            itemTitlePrefix="Publicación"
            helpText="Artículos científicos, libros, ponencias o patentes que hayas publicado."
            manualAdjustment={<SectionManualAdjustment sectionId="publicaciones" cvData={cvData} setCvData={setCvData} />}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB: REFERENCIAS LABORALES */}
        {/* ========================================================================= */}
        {activeTab === 'referencias' && (
          <RecordFormSection
            sectionKey="referencias"
            sectionTitle="Referencias Laborales & Comprobables"
            kindKey="references"
            addLabel="Agregar Referencia"
            cvData={cvData}
            setCvData={setCvData}
            fieldName="references"
            itemTitlePrefix="Referencia"
            helpText="Contactos de ex-supervisores o colegas que puedan certificar tu desempeño profesional."
            manualAdjustment={<SectionManualAdjustment sectionId="referencias" cvData={cvData} setCvData={setCvData} />}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 2: FORMACIÓN ACADÉMICA */}
        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* TAB 2: FORMACIÓN ACADÉMICA */}
        {/* ========================================================================= */}
        {activeTab === 'formacion' && (
          <RecordFormSection
            sectionKey="formacion"
            sectionTitle="Formación Académica"
            kindKey="education"
            addLabel="Agregar Formación"
            cvData={cvData}
            setCvData={setCvData}
            fieldName="education"
            itemTitlePrefix="Estudio / Formación"
            helpText="Formación Académica refiere al nivel educativo alcanzado (Secundario, Terciario, Universitario, Posgrado)."
            manualAdjustment={<SectionManualAdjustment sectionId="formacion" cvData={cvData} setCvData={setCvData} />}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 3: TÍTULOS PROFESIONALES */}
        {/* ========================================================================= */}
        {activeTab === 'profesion' && (
          <RecordFormSection
            sectionKey="profesion"
            sectionTitle="Títulos Profesionales"
            kindKey="profession"
            addLabel="Agregar Título"
            cvData={cvData}
            setCvData={setCvData}
            fieldName="profession"
            itemTitlePrefix="Título Profesional"
            helpText="Títulos Profesionales incluye carreras o títulos habilitantes para ejercer. Puedes añadir el campo opcional Resolución N° / Disposición legal que avala tu titulación."
            manualAdjustment={<SectionManualAdjustment sectionId="profesion" cvData={cvData} setCvData={setCvData} />}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 4: EXPERIENCIA LABORAL */}
        {/* ========================================================================= */}
        {activeTab === 'experiencia' && (
          <RecordFormSection
            sectionKey="experiencia"
            sectionTitle="Experiencia Laboral"
            kindKey="experience"
            addLabel="Agregar Experiencia"
            cvData={cvData}
            setCvData={setCvData}
            fieldName="experience"
            itemTitlePrefix="Experiencia Laboral"
            helpText="Experiencia Laboral detalla puestos desempeñados, instituciones o empresas y tareas clave realizadas."
            manualAdjustment={<SectionManualAdjustment sectionId="experiencia" cvData={cvData} setCvData={setCvData} />}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 5: CURSOS & CAPACITACIONES */}
        {/* ========================================================================= */}
        {activeTab === 'cursos' && (
          <RecordFormSection
            sectionKey="cursos"
            sectionTitle="Cursos y Capacitaciones"
            kindKey="course"
            addLabel="Agregar Curso"
            cvData={cvData}
            setCvData={setCvData}
            fieldName="coursesAndCertificates"
            itemTitlePrefix="Curso / Capacitación"
            helpText="Cursos y Capacitaciones incluye talleres, simposios, diplomaturas y certificaciones de formación continua."
            manualAdjustment={<SectionManualAdjustment sectionId="cursos" cvData={cvData} setCvData={setCvData} />}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 6: INFORMÁTICA */}
        {/* ========================================================================= */}
        {activeTab === 'informatica' && (
          <RecordFormSection
            sectionKey="informatica"
            sectionTitle="Informática y TICs"
            kindKey="informatics"
            addLabel="Agregar Informática"
            cvData={cvData}
            setCvData={setCvData}
            fieldName="informatics"
            itemTitlePrefix="Curso Informático"
            helpText="Informática y TICs incluye cursos, herramientas de computación, lenguajes y software profesional."
            manualAdjustment={<SectionManualAdjustment sectionId="informatica" cvData={cvData} setCvData={setCvData} />}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 7: ECOLOGÍA & PROYECTOS */}
        {/* ========================================================================= */}
        {activeTab === 'ecologia' && (
          <RecordFormSection
            sectionKey="ecologia"
            sectionTitle="Proyectos Ecológicos & Sustentables"
            kindKey="ecology"
            addLabel="Agregar Proyecto"
            cvData={cvData}
            setCvData={setCvData}
            fieldName="ecology"
            itemTitlePrefix="Proyecto Ecológico"
            helpText="Registra iniciativas comunitarias, talleres sobre medio ambiente, huertas orgánicas, proyectos rurales, voluntariados y acciones sociales de impacto sustentable."
            manualAdjustment={<SectionManualAdjustment sectionId="ecologia" cvData={cvData} setCvData={setCvData} />}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 8: CERTIFICADOS ESCANEADOS (NUEVO FLUJO SIMPLIFICADO A4) */}
        {/* ========================================================================= */}
        {activeTab === 'certificados' && (
          <div className="space-y-4">
            {renderSectionToggle('certificados', 'Certificados Escaneados')}

            {cvData?.sectionVisibility?.certificados !== false && (
              <>
            {/* 1. Selector */}
            <div>
              <label className="block text-xs font-black text-[var(--ui-rose)] mb-1.5 uppercase tracking-wide">
                IDENTIFICA TU CERTIFICADO *
              </label>
              <select
                value={selectedRegIdx}
                onChange={(e) => setSelectedRegIdx(e.target.value)}
                className={`w-full text-xs p-2.5 rounded-[${radius.card}] border-2 border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] font-extrabold outline-none focus:border-[var(--color-accent-base)] focus:ring-2 focus:ring-[var(--color-accent-rose-muted)] transition ${elevationSystem.raised}`}
              >
                <option value="">-- Hacer clic para elegir un título o curso --</option>
                {registeredItems.map((item, idx) => (
                  <option key={idx} value={idx}>
                    [{item.category}] {item.title} ({item.year})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (selectedRegIdx === '') {
                    showWarning('Por favor selecciona primero tu certificado en "IDENTIFICA TU CERTIFICADO".');
                    return;
                  }
                  stopCamera();
                  setCertMode('upload');
                  fileInputRef.current?.click();
                }}
                className={`p-2.5 rounded-[${radius.card}] border-2 flex items-center justify-center gap-1.5 font-black text-xs transition ${
                  certMode === 'upload'
                    ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.raised}'
                    : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] hover:bg-[var(--color-neutral-surface-warm)]'
                }`}
              >
                <Upload className="w-4 h-4" /> Subir Imagen
              </button>
              <button
                onClick={() => {
                  if (selectedRegIdx === '') {
                    showWarning('Por favor selecciona primero tu certificado en "IDENTIFICA TU CERTIFICADO".');
                    return;
                  }
                  startCamera();
                }}
                className={`p-2.5 rounded-[${radius.card}] border-2 flex items-center justify-center gap-1.5 font-black text-xs transition ${
                  certMode === 'camera'
                    ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.raised}'
                    : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] hover:bg-[var(--color-neutral-surface-warm)]'
                }`}
              >
                <Camera className="w-4 h-4" /> Usar Cámara
              </button>
            </div>

            {/* 3. Camera view or File dropzone with "CLIC AQUÍ" */}
            {certMode === 'camera' && isCameraActive ? (
              <div className={`relative rounded-[${radius.card}] overflow-hidden bg-black flex flex-col items-center justify-center h-52`}>
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <button
                  onClick={capturePhoto}
                  className={`absolute bottom-3 flex items-center gap-1.5 px-5 py-2 bg-[var(--color-accent-base)] hover:bg-[var(--color-accent-brand-hover)] text-[var(--color-accent-on-base)] font-black text-xs rounded-full ${elevationSystem.floating} transition`}
                >
                  <Camera className="w-4 h-4" /> Capturar Foto
                </button>
              </div>
            ) : (
              <div 
                onClick={() => {
                  if (selectedRegIdx === '') {
                    showWarning('Por favor selecciona primero tu certificado en "IDENTIFICA TU CERTIFICADO".');
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                className={`w-full h-28 border-2 border-dashed border-[var(--color-secondary-base)] bg-[var(--ui-bg-card)] rounded-[${radius.modal}] flex flex-col items-center justify-center cursor-pointer hover:bg-[var(--color-secondary-muted)]/30 transition group ${elevationSystem.raised}`}
              >
                <Upload className="w-6 h-6 text-[var(--color-secondary-text)] mb-1 group-hover:scale-110 transition duration-300" />
                <span className="font-black text-xs text-[var(--color-accent-text)] uppercase tracking-wider">CLIC AQUÍ</span>
                <span className="text-[10px] text-[var(--color-neutral-text-primary)] font-bold">Seleccionar archivo o foto de certificado</span>
              </div>
            )}

            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileUpload} className="hidden" />

            {/* 4. List of Attached Certificates */}
            <div className="pt-3 border-t-2 border-[var(--color-neutral-border)] space-y-3">
              <span className="text-xs font-black text-[var(--color-neutral-text-primary)] uppercase tracking-wider">
                ANEXADOS: ({cvData.certificatesScanned.length})
              </span>

              {cvData.certificatesScanned.length === 0 ? (
                <p className={`text-xs text-[var(--color-neutral-text-primary)] font-bold italic text-center py-4 border-2 border-dashed border-[var(--color-neutral-border)] rounded-[${radius.card}] bg-[var(--ui-bg-card)]`}>
                  No hay certificados anexados aún.
                </p>
              ) : (
                <div className="space-y-2">
                  {cvData.certificatesScanned.map((cert) => (
                    <div key={cert.id} className={`flex items-center gap-3 p-2.5 bg-[var(--ui-bg-card)] rounded-[${radius.card}] border-2 border-[var(--color-neutral-border)] ${elevationSystem.raised}`}>
                      <img 
                        src={cert.imageUrl} 
                        alt={cert.title} 
                        style={{ transform: `rotate(${cert.rotation || 0}deg)` }}
                        className={`w-12 h-14 object-cover rounded-[${radius.control}] border border-[var(--color-neutral-border)] flex-shrink-0`} 
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-[var(--color-neutral-text-primary)] truncate">{cert.title}</p>
                        <p className="text-[10px] text-[var(--color-neutral-text-primary)] font-bold">{cert.institution} ({cert.year})</p>
                      </div>

                      {/* Rotate button */}
                      <button
                        onClick={() => {
                          setCvData(prev => ({
                            ...prev,
                            certificatesScanned: prev.certificatesScanned.map(c => 
                              c.id === cert.id ? { ...c, rotation: ((c.rotation || 0) + 90) % 360 } : c
                            )
                          }));
                        }}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-[${radius.control}] bg-[var(--color-accent-amber-muted)] border border-[var(--color-accent-amber)] text-[var(--color-neutral-text-primary)] font-black text-[11px] hover:bg-[var(--color-accent-amber)] transition`}
                        title="Girar imagen 90°"
                      >
                        <RotateCw className="w-3.5 h-3.5 text-[var(--color-accent-text)]" />
                        <span>Girar ({cert.rotation || 0}°)</span>
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={() => {
                          const name = cert.title || 'este certificado';
                          confirm({
                            title: '¿Eliminar certificado?',
                            message: `¿Estás seguro de que deseas eliminar el certificado "${name}"?`,
                            confirmText: 'Eliminar',
                            onConfirm: () => {
                              setCvData(prev => ({
                                ...prev,
                                certificatesScanned: (prev.certificatesScanned || []).filter(c => c.id !== cert.id)
                              }));
                              showSuccess('Certificado eliminado.');
                            }
                          });
                        }}
                        className="p-1.5 text-[var(--color-neutral-text-primary)] hover:text-[var(--color-status-danger-text)] transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CertCropperModal Panel */}
            <CertCropperModal
              isOpen={isCertCropperOpen}
              onClose={() => { setIsCertCropperOpen(false); setRawCertSrc(''); }}
              registeredItems={registeredItems}
              selectedRegIdx={selectedRegIdx}
              setSelectedRegIdx={setSelectedRegIdx}
              onAcceptCropped={(croppedUrl, targetRegIdx) => {
                const selectedItem = registeredItems[parseInt(targetRegIdx, 10)] || { title: 'CERTIFICADO', institution: '', year: '' };
                const newCert = {
                  id: Date.now().toString(),
                  title: selectedItem.title,
                  institution: selectedItem.institution,
                  year: selectedItem.year,
                  imageUrl: croppedUrl,
                  rotation: 0
                };
                setCvData(prev => ({
                  ...prev,
                  certificatesScanned: [...prev.certificatesScanned, newCert]
                }));
                setRawCertSrc('');
                setSelectedRegIdx('');
                setIsCertCropperOpen(false);
              }}
              rawImageSrc={rawCertSrc}
            />
            <div className="pt-2 border-t border-[var(--color-neutral-border)]">
              <SectionManualAdjustment sectionId="certificados" cvData={cvData} setCvData={setCvData} />
            </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 9: FIRMA DIGITAL */}
        {/* ========================================================================= */}
        {activeTab === 'firma' && (
          <div className="space-y-4">
            {renderSectionToggle('firma', 'Firma Digital')}

            {cvData?.sectionVisibility?.firma !== false && (
              <>

            <div className={`p-4 bg-[var(--ui-bg-card)] rounded-[${radius.modal}] border-2 border-[var(--color-neutral-border)] space-y-3 text-center ${elevationSystem.raised}`}>
              {cvData.signature?.dataUrl ? (
                <div className="space-y-2">
                  <div className={`bg-[var(--color-neutral-surface-warm)] p-3 rounded-[${radius.card}] border border-[var(--color-accent-amber)]`}>
                    <img src={cvData.signature.dataUrl} alt="Firma" className="h-16 mx-auto object-contain" />
                  </div>
                  <button
                    onClick={() => {
                      setCvData(prev => ({
                        ...prev,
                        signature: {
                          ...prev.signature,
                          dataUrl: ''
                        }
                      }));
                    }}
                    className={`flex items-center justify-center gap-1 mx-auto px-3 py-1 bg-[var(--color-status-danger-muted)] hover:opacity-80 text-[var(--color-status-danger-text)] text-xs font-bold rounded-[${radius.control}] transition cursor-pointer`}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Quitar Imagen de Firma
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[var(--color-neutral-text-primary)] font-bold italic">No has dibujado o subido una imagen de firma aún.</p>
              )}

              <button
                onClick={onOpenSignature}
                className={`w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--color-accent-base)] hover:bg-[var(--color-accent-brand-hover)] text-[var(--color-accent-on-base)] text-xs font-black rounded-[${radius.card}] ${elevationSystem.raised} transition cursor-pointer`}
              >
                <PenTool className="w-4 h-4" /> Abrir Tablero de Firma (Dibujar / Subir)
              </button>
            </div>

            <div className={`p-4 bg-[var(--ui-bg-card)] rounded-[${radius.modal}] border-2 border-[var(--color-neutral-border)] space-y-3 ${elevationSystem.raised}`}>
              <h4 className="text-xs font-black text-[var(--color-neutral-text-primary)] uppercase">Datos del Pie de Firma</h4>
              
              {/* 1. Nombre Automático (Abreviaturas / Título + Nombres + Apellidos) */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-neutral-text-primary)] mb-1 flex items-center justify-between">
                  <span>Nombre del Firmante</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-secondary-muted)] text-[var(--color-secondary-text)] font-extrabold">Automático</span>
                </label>
                <div className={`w-full text-xs p-2.5 rounded-[${radius.card}] border border-[var(--color-neutral-border)] bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-primary)] font-extrabold ${elevationSystem.raised}`}>
                  {resolveDisplayName(cvData.personalInfo)}
                </div>
              </div>

              {/* 2. Selector de Título Profesional (de sección Profesión) */}
              {(() => {
                const titleList: string[] = Array.from(new Set([
                  ...(cvData.profession || []).map((p: any) => p.degree).filter(Boolean),
                  ...(cvData.education || []).map((e: any) => e.degree).filter(Boolean)
                ]));
                const currentSelectedRole = cvData.signature?.signerRole !== undefined 
                  ? cvData.signature.signerRole 
                  : (titleList[0] || '');

                return (
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--color-neutral-text-primary)] mb-1">
                      Título Profesional (Registros de Profesión)
                    </label>
                    {titleList.length > 0 ? (
                      <select
                        value={currentSelectedRole}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCvData((prev: any) => ({
                            ...prev,
                            signature: { ...(prev.signature || {}), signerRole: val }
                          }));
                        }}
                        className={`w-full text-xs p-2.5 rounded-[${radius.card}] border-2 border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] font-bold outline-none focus:border-[var(--color-accent-base)] focus:ring-2 focus:ring-[var(--color-accent-rose-muted)] cursor-pointer transition`}
                      >
                        {titleList.map((t, idx) => (
                          <option key={idx} value={t}>{t}</option>
                        ))}
                      </select>
                    ) : (
                      <div className={`w-full text-xs p-2.5 rounded-[${radius.card}] border border-[var(--color-status-warning-base)]/30 bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)] font-bold`}>
                        ⚠️ No hay títulos agregados en la sección "Títulos Profesionales".
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 3. Selector de Fecha con Calendario */}
              <div>
                <Field 
                  label="Fecha de Firma"
                  type="date"
                  value={cvData.signature?.date || new Date().toISOString().split('T')[0]}
                  onChange={(e: any) => {
                    const val = e.target.value;
                    setCvData((prev: any) => ({
                      ...prev,
                      signature: { ...(prev.signature || {}), date: val }
                    }));
                  }}
                />
              </div>

              {/* 4. Lugar / Ciudad de Emisión de la Firma */}
              <div>
                <Field 
                  label="Lugar / Ciudad de Emisión de la Firma"
                  type="text"
                  value={cvData.signature?.signerCity || cvData.personalInfo?.cityProvince || ''}
                  onChange={(e: any) => {
                    const val = e.target.value;
                    setCvData((prev: any) => ({
                      ...prev,
                      signature: { ...(prev.signature || {}), signerCity: val }
                    }));
                  }}
                  placeholder="Ej: Salta, Argentina"
                />
              </div>
            </div>
            <div className="pt-2 border-t border-[var(--color-neutral-border)]">
              <SectionManualAdjustment sectionId="firma" cvData={cvData} setCvData={setCvData} />
            </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VISTA 1 A 1 DE SECCIÓN PERSONALIZADA SELECCIONADA DESDE EL DOCK */}
        {/* ========================================================================= */}
        {(cvData.customSections || []).some((s: any) => s.id === activeTab && s.id !== 'ecologia') && (() => {
          const csIdx = (cvData.customSections || []).findIndex((s: any) => s.id === activeTab);
          const cs = cvData.customSections?.[csIdx];
          if (!cs) return null;

          return (
            <RepeatableSection
              key={cs.id}
              sectionKey={cs.id}
              sectionTitle={cs.titleText}
              addLabel="Agregar Registro"
              cvData={cvData}
              setCvData={setCvData}
              fieldName={`customSections.${csIdx}.records`}
              itemTitlePrefix="Registro"
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
              renderItem={(rec: any, rIdx: number, updateField: (field: string, val: any) => void) => (
                <div className="space-y-3">
                  {(cs.fields || ['tituloOGrado', 'institucion']).map((fieldId: string) => {
                    const fieldDef = FIELD_CATALOG[fieldId];
                    if (!fieldDef) return null;
                    return (
                      <Field
                        key={fieldId}
                        label={fieldDef.label}
                        value={rec[fieldId] || ''}
                        onChange={(e: any) => updateField(fieldId, e.target.value)}
                        placeholder={fieldDef.placeholder}
                        isTextArea={fieldDef.type === 'textarea'}
                      />
                    );
                  })}
                </div>
              )}
              manualAdjustment={<SectionManualAdjustment sectionId={cs.id} cvData={cvData} setCvData={setCvData} />}
            />
          );
        })()}

        {/* ========================================================================= */}
        {/* TAB: NUEVA SECCIÓN PERSONALIZADA (SECCIONES PREDISEÑADAS + SECCIÓN A MEDIDA) */}
        {/* ========================================================================= */}
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
                      id: 'ecologia',
                      titleText: 'Proyectos Sustentables & Ecológicos',
                      iconId: 'ecologia',
                      desc: 'Huertas, medio ambiente, proyectos comunitarios.',
                      fields: ['tituloOGrado', 'institucion', 'periodo', 'descripcion']
                    },
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
                    const isAlreadyAdded = presetSec.id === 'ecologia'
                      ? cvData.sectionVisibility?.ecologia !== false
                      : (cvData.customSections || []).some((s: any) => s.id === presetSec.id);

                    return (
                      <button
                        key={presetSec.id}
                        type="button"
                        onClick={() => {
                          if (presetSec.id === 'ecologia') {
                            setCvData((prev: any) => ({
                              ...prev,
                              sectionVisibility: {
                                ...(prev.sectionVisibility || {}),
                                ecologia: true
                              },
                              ecology: Array.isArray(prev.ecology) && prev.ecology.length > 0 ? prev.ecology : [{}],
                              customSections: (prev.customSections || []).filter((s: any) => s.id !== 'ecologia')
                            }));
                            changeActiveTab('ecologia');
                            showSuccess("Sección 'Proyectos Sustentables & Ecológicos' activada.");
                            return;
                          }

                          if (isAlreadyAdded) {
                            changeActiveTab(presetSec.id);
                            return;
                          }
                          const newSection = {
                            id: presetSec.id,
                            titleText: presetSec.titleText,
                            iconId: presetSec.iconId,
                            fields: presetSec.fields,
                            records: [{}]
                          };

                          setCvData((prev: any) => ({
                            ...prev,
                            customSections: [...(prev.customSections || []).filter((s: any) => s.id !== presetSec.id), newSection],
                            layout: {
                              ...(prev.layout || {}),
                              columnAssignments: {
                                ...(prev.layout?.columnAssignments || {}),
                                [presetSec.id]: 'primaria'
                              },
                              sectionOrders: {
                                ...(prev.layout?.sectionOrders || {}),
                                primaria: [...(prev.layout?.sectionOrders?.primaria || []), presetSec.id]
                              }
                            }
                          }));

                          showSuccess(`Sección '${presetSec.titleText}' incorporada.`);
                          changeActiveTab(presetSec.id);
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
                    const newId = `custom_${Date.now()}`;
                    const newSection = {
                      id: newId,
                      titleText: newSectionTitle.trim(),
                      iconId: 'custom',
                      fields: [...selectedFields],
                      records: [{}]
                    };

                    setCvData((prev: any) => ({
                      ...prev,
                      customSections: [...(prev.customSections || []), newSection],
                      layout: {
                        ...(prev.layout || {}),
                        columnAssignments: {
                          ...(prev.layout?.columnAssignments || {}),
                          [newId]: 'primaria'
                        },
                        sectionOrders: {
                          ...(prev.layout?.sectionOrders || {}),
                          primaria: [...(prev.layout?.sectionOrders?.primaria || []), newId]
                        }
                      }
                    }));

                    setNewSectionTitle('');
                    showSuccess(`Sección '${newSection.titleText}' creada exitosamente.`);
                    changeActiveTab(newId);
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--color-secondary-base)] hover:bg-[var(--color-secondary-hover)] text-[var(--color-secondary-on-base)] text-xs font-black rounded-[${radius.card}] ${elevationSystem.raised} transition cursor-pointer`}
                >
                  <Plus className="w-4 h-4" /> Crear e Integrar Sección al CV
                </button>
              </div>

              {/* Secciones Personalizadas Creadas */}
              {(cvData.customSections || []).length > 0 && (
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-black text-[var(--color-neutral-text-primary)] uppercase border-b pb-1 border-[var(--color-neutral-border)]">
                    Tus Secciones Personalizadas ({cvData.customSections.length})
                  </h4>

                  {cvData.customSections.map((cs: any) => (
                    <div key={cs.id} className={`p-3 bg-[var(--color-neutral-surface-muted)] rounded-[${radius.modal}] border-2 border-[var(--color-neutral-border)] flex items-center justify-between`}>
                      <span className="text-xs font-black text-[var(--ui-rose)] uppercase">
                        {cs.titleText}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          changeActiveTab(cs.id);
                        }}
                        className={`px-3 py-1 bg-[var(--color-accent-purple)] hover:opacity-90 text-white font-bold text-xs rounded-[${radius.card}] shadow transition cursor-pointer`}
                      >
                        Editar Registros →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </PanelSection>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PANEL DE EDICIÓN DE UNA SECCIÓN PERSONALIZADA (activeTab = id dinámico) */}
        {/* Antes esto no existía: el botón del dock se activaba (setActiveTab(cs.id))
            pero ninguna rama de EditorPanel coincidía con ese id, así que el panel
            quedaba en blanco. Un solo bloque genérico sirve para cualquier sección
            que la persona haya creado, sin importar cuántas tenga. */}
        {(() => {
          const customIdx = (cvData.customSections || []).findIndex((cs: any) => cs.id === activeTab);
          if (customIdx === -1) return null;
          const cs = cvData.customSections[customIdx];
          return (
            <RecordFormSection
              sectionKey={cs.id}
              sectionTitle={cs.titleText}
              kindKey="custom"
              customFields={cs.fields}
              addLabel={`Agregar a ${cs.titleText}`}
              cvData={cvData}
              setCvData={setCvData}
              fieldName={`customSections.${customIdx}.records`}
              itemTitlePrefix={cs.titleText}
            />
          );
        })()}

        {/* ========================================================================= */}
        {/* TAB 10: CVS GUARDADOS / ABRIR */}
        {/* ========================================================================= */}
        {activeTab === 'guardados' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2 border-[var(--color-neutral-border)]">
              <h3 className="text-xs font-extrabold uppercase text-[var(--ui-rose)] flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-[var(--ui-secondary)]" /> Abrir Mis Documentos Guardados
              </h3>

              <button
                onClick={handleSaveFromPanel}
                disabled={isSavingFromPanel}
                className={`px-3 py-1.5 bg-[var(--color-accent-purple)] hover:opacity-90 text-white font-bold text-xs rounded-[${radius.card}] shadow transition flex items-center gap-1 cursor-pointer`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingFromPanel ? 'Guardando...' : 'Guardar Actual'}</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {savedList.length === 0 ? (
                <div className={`p-6 text-center text-xs text-[var(--color-neutral-text-primary)] font-medium border-2 border-dashed border-[var(--color-neutral-border)] rounded-[${radius.card}]`}>
                  No hay currículums guardados aún. Haz clic en "Guardar Actual" para almacenar este borrador en WebP.
                </div>
              ) : (
                savedList.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-[${radius.card}] border border-[var(--color-neutral-border)] bg-[var(--color-neutral-surface-warm)]/50  hover:border-[var(--color-accent-purple)] transition flex items-center justify-between gap-2`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-xs font-black text-[var(--color-neutral-text-primary)] font-black  truncate">
                        {item.candidate_name || item.title}
                      </h4>
                      <p className="text-[10px] text-[var(--color-neutral-text-primary)] font-medium font-semibold flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[var(--color-neutral-text-primary)] font-medium" />
                        <span>{item.dni ? `DNI: ${item.dni}` : 'Borrador'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleOpenSavedFromPanel(item.id)}
                        className={`px-3 py-1.5 bg-[var(--color-accent-purple)] hover:opacity-90 text-white font-black text-[11px] rounded-[${radius.control}] shadow transition flex items-center gap-1 cursor-pointer`}
                      >
                        <FolderOpen className="w-3.5 h-3.5" /> Abrir
                      </button>

                      <button
                        onClick={() => handleDeleteSavedFromPanel(item.id, item.candidate_name || item.title)}
                        className={`p-1.5 text-[var(--color-neutral-text-primary)] font-medium hover:text-[var(--color-status-danger-text)] rounded-[${radius.control}] hover:bg-[var(--color-neutral-border)] transition cursor-pointer`}
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
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
                  {UI_GLOSSARY.labels.threeLevelCascade}
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
                    value={cvData.layout?.paperSize || 'a4'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCvData((prev: any) => ({
                        ...prev,
                        layout: {
                          ...prev.layout,
                          paperSize: val
                        }
                      }));
                    }}
                    className={`w-full text-xs p-2.5 rounded-[${radius.card}] border border-[var(--color-secondary-base)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] font-bold outline-none cursor-pointer`}
                  >
                    {Object.values(PAGE_SIZES).filter((size) => {
                      const isBusinessCard = cvData?.activePresetId === 'tarjeta-personal';
                      if (isBusinessCard) {
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
            <PanelSection icon={<Globe className="w-4 h-4 text-[var(--color-accent-text)]" />} title="Estándar & Formato Global (Internacional)">
              <div className="space-y-2">
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
                      className={`w-full p-3 rounded-[${radius.card}] border text-left transition flex flex-col gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-rose-muted)]/30 ring-2 ring-[var(--color-accent-base)]/30'
                          : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[var(--color-neutral-text-primary)] flex items-center gap-1.5">
                          {format.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-white border border-[var(--color-neutral-border-strong)] text-[var(--color-neutral-text-secondary)]">
                            {format.columnLayoutPresetId === 'full-width' ? '1 Columna' : '2 Columnas'}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-[var(--ui-text-primary)] flex-shrink-0" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-[var(--color-neutral-text-secondary)] leading-relaxed">
                        {format.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </PanelSection>

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
            <PanelSection icon={<Columns3 className="w-4 h-4" />} title="Disposición de columnas y Ancho">
              {(() => {
                const activePresetObj = resolveActivePreset(cvData);
                const activeLayoutKey = cvData?.columnLayoutPresetId || (activePresetObj.columnLayoutPresetId?.replace('layout-', '') || 'sidebar-left');
                const sidebarPercent = Math.min(42, Math.max(32, cvData?.layout?.sidebarWidthPercent ?? 40));

                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2">
                      {Object.entries(PRESET_COLUMNS).map(([key]) => {
                        const activeFormat = resolveActiveFormat(cvData);
                        const isSingleColumnFormat = activeFormat?.columnLayoutPresetId === 'full-width';
                        const isSelected = activeLayoutKey === key;
                        const displayName = getColumnLayoutPresetName(key, sidebarPercent);

                        return (
                          <button
                            key={key}
                            disabled={isSingleColumnFormat && key !== 'full-width'}
                            onClick={() => {
                              triggerPresetTransition(displayName, 'layout');
                              setCvData((prev: any) => applyPresetLevel(prev, 'override', { columnLayoutPresetId: key }));
                            }}
                            className={`p-3 rounded-[var(--radius-card)] border text-left transition flex items-center justify-between gap-3 ${
                              isSingleColumnFormat && key !== 'full-width'
                                ? 'opacity-40 cursor-not-allowed bg-[var(--ui-bg-panel)] border-[var(--color-neutral-border)]'
                                : isSelected
                                  ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-rose-muted)]/30 ring-2 ring-[var(--color-accent-base)]/30 cursor-pointer'
                                  : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)] cursor-pointer'
                            }`}
                          >
                            <span className="text-xs font-black text-[var(--color-neutral-text-primary)]">{displayName}</span>
                            {isSelected && <Check className="w-4 h-4 text-[var(--ui-text-primary)] flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Tirador del Ancho de Sidebar (32% - 42%) */}
                    {activeLayoutKey !== 'full-width' && (
                      <div className="p-3 bg-[var(--ui-bg-card)] border border-[var(--color-neutral-border)] rounded-[var(--radius-card)] space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-[var(--color-neutral-text-primary)]">
                          <span>Ancho de Barra Lateral</span>
                          <span className="text-[var(--color-secondary-bright)]">{sidebarPercent}%</span>
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
                          className="w-full h-1.5 bg-[var(--ui-bg-panel)] rounded-lg appearance-none cursor-pointer accent-[var(--color-secondary-base)]"
                        />
                        <div className="flex justify-between text-[10px] text-[var(--color-neutral-text-secondary)] font-medium">
                          <span>Mínimo (32%)</span>
                          <span>Predeterminado (40%)</span>
                          <span>Máximo (42%)</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </PanelSection>

            {/* Armonía Cromática */}
            <PanelSection icon={<Palette className="w-4 h-4" />} title="Paleta de color armónica">
              <div className="grid grid-cols-2 gap-2">
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
                      className={`p-2.5 rounded-[${radius.card}] border text-left transition flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-rose-muted)]/30 ring-2 ring-[var(--color-accent-base)]/30'
                          : 'border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-[var(--color-neutral-text-primary)] truncate pr-1">{colorPreset.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[var(--ui-text-primary)] flex-shrink-0" />}
                      </div>
                      <div className="flex gap-1.5 items-center">
                        <div className={`w-4 h-4 rounded-full border border-[var(--ui-border)] ${elevationSystem.raised}`} style={{ backgroundColor: colorPreset.palette.primary }} />
                        <div className={`w-4 h-4 rounded-full border border-[var(--ui-border)] ${elevationSystem.raised}`} style={{ backgroundColor: colorPreset.palette.accent }} />
                        <div className={`w-4 h-4 rounded-full border border-[var(--ui-border)] ${elevationSystem.raised}`} style={{ backgroundColor: colorPreset.palette.secondary }} />
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
                  <div className={`p-3 bg-[var(--ui-bg-card)] rounded-[${radius.card}] border border-[var(--color-neutral-border)] space-y-3`}>
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-[var(--color-neutral-text-primary)]">
                        Registros Destacados en Portada ({cvData.roles?.length || 0})
                      </label>
                    </div>
                    
                    {/* Selector Desplegable para Agregar Registro Ingresado (Muestra SOLO el título) */}
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

                    {/* Lista de Registros Destacados con Botón de Eliminar */}
                    <div className="space-y-1.5 pt-2">
                      {(!cvData.roles || cvData.roles.length === 0) ? (
                        <p className={`text-xs text-[var(--color-neutral-text-secondary)] italic text-center py-2 border border-dashed border-[var(--color-neutral-border)] rounded-[${radius.card}]`}>
                          No hay registros destacados en la portada aún.
                        </p>
                      ) : (
                        cvData.roles.map((role: string, idx: number) => (
                          <div key={idx} className={`flex items-center justify-between p-2 bg-[var(--ui-bg-card)] rounded-[${radius.control}] border border-[var(--color-neutral-border)] text-xs`}>
                            <span className="font-bold text-[var(--color-neutral-text-primary)]">{role}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setCvData((prev: any) => ({
                                  ...prev,
                                  roles: (prev.roles || []).filter((_: any, i: number) => i !== idx)
                                }));
                              }}
                              className="p-1 text-[var(--color-status-danger-text)] hover:bg-[var(--color-status-danger-muted)] rounded transition cursor-pointer"
                              title="Eliminar de portada"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                      </div>
                    </div>

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
                                ? 'bg-[var(--ui-bg-card)] border-[var(--color-accent-base)] ring-2 ring-[var(--color-accent-base)]/40 shadow-lg'
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
                                  <span className="flex items-center gap-1 text-[10px] font-black text-[var(--color-accent-on-base)] bg-[var(--color-accent-base)] px-2.5 py-0.5 rounded-full shadow-sm">
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
