import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  GraduationCap, 
  Briefcase, 
  FileText, 
  BookOpen, 
  Laptop, 
  Leaf, 
  Award, 
  PenTool, 
  Palette,
  Plus,
  Trash2,
  Camera,
  Upload,
  RotateCw,
  Check,
  Sparkles,
  Info,
  Layout,
  Columns3,
  Eye,
  EyeOff,
  Layers,
  FolderOpen,
  Save,
  Calendar
} from 'lucide-react';
import { themePresets, fontOptions } from '../../../data/themePresets';
import { getSavedCVsList, loadCVById, deleteCVById, saveCV } from '../services/cvStorageService';
import CertCropperModal from './CertCropperModal';
import PersonalInfoSection from './editor/PersonalInfoSection';

export default function EditorPanel({ 
  cvData, 
  setCvData, 
  activeTab,
  setActiveTab,
  onOpenPhotoCropper, 
  onOpenSignature 
}) {
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
      alert('CV cargado correctamente en el editor y vista previa.');
    }
  };

  const handleDeleteSavedFromPanel = async (id, title) => {
    if (window.confirm(`¿Eliminar "${title}" de tus currículums guardados?`)) {
      await deleteCVById(id);
      refreshSavedList();
    }
  };

  const handleSaveFromPanel = async () => {
    setIsSavingFromPanel(true);
    try {
      await saveCV(cvData);
      alert(`CV de "${cvData?.personalInfo?.fullName || 'Postulante'}" guardado correctamente con compresión WebP.`);
      refreshSavedList();
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      alert('No se pudo acceder a la cámara. Por favor verifica los permisos o sube una imagen.');
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

  const handleAddCertificateInline = () => {
    if (!certImagePreview) {
      alert('Por favor toma una foto o selecciona una imagen de certificado.');
      return;
    }
    if (selectedRegIdx === '') {
      alert('Por favor selecciona a qué título o curso cargado corresponde esta foto.');
      return;
    }

    const selectedItem = registeredItems[parseInt(selectedRegIdx, 10)];
    if (!selectedItem) return;

    const newCert = {
      id: Date.now().toString(),
      title: selectedItem.title,
      institution: selectedItem.institution,
      year: selectedItem.year,
      imageUrl: certImagePreview,
      rotation: 0
    };

    setCvData(prev => ({
      ...prev,
      certificatesScanned: [...prev.certificatesScanned, newCert]
    }));

    // Reset inline inputs
    setCertImagePreview('');
    setSelectedRegIdx('');
    stopCamera();
  };

  // Helper updates for personal info
  const updatePersonalInfo = (field, value) => {
    setCvData((prev) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: value
      }
    }));
  };

  const updateRoles = (index, value) => {
    setCvData((prev) => {
      const newRoles = [...prev.roles];
      newRoles[index] = value;
      return { ...prev, roles: newRoles };
    });
  };

  const addRole = () => {
    setCvData((prev) => ({
      ...prev,
      roles: [...prev.roles, ""]
    }));
  };

  const removeRole = (index) => {
    const roleName = cvData?.roles?.[index] || `Rol #${index + 1}`;
    if (window.confirm(`¿Estás seguro de que deseas eliminar "${roleName}"?`)) {
      setCvData((prev) => ({
        ...prev,
        roles: prev.roles.filter((_, i) => i !== index)
      }));
    }
  };

  const updateTheme = (field, value) => {
    setCvData((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        [field]: value
      }
    }));
  };

  const applyPreset = (preset) => {
    setCvData((prev) => ({
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

  const renderSectionToggle = (sectionKey, sectionTitle) => {
    const isVisible = cvData?.sectionVisibility?.[sectionKey] !== false;

    return (
      <div className={`flex items-center justify-between p-2.5 rounded-xl border mb-3 transition ${
        isVisible 
          ? 'bg-white border-[#EFE2C9] text-[#2B1B2E] shadow-sm' 
          : 'bg-slate-200 border-slate-300 text-slate-500 opacity-75'
      }`}>
        <span className="text-xs font-black uppercase tracking-wide">
          {sectionTitle}
        </span>
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
          className={`px-3 py-1 rounded-full text-xs font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
            isVisible
              ? 'bg-[#00A8A0] text-white hover:bg-[#00877F]'
              : 'bg-slate-400 text-white hover:bg-slate-500'
          }`}
        >
          <span>{isVisible ? 'ACTIVADA' : 'DESACTIVADA'}</span>
        </button>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#F5EDDA] text-[#2B1B2E]">

      {/* Tab Form Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">

        {/* Banner de Muestra (Solo Lectura) */}
        {cvData?.id === 'cv_ejemplo_estandar' && (
          <div className="p-3.5 bg-[#FFF1C2] border-2 border-[#FFC93C] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2 shadow-md">
            <div className="flex items-center gap-3">
              <span className="text-2xl flex-shrink-0">📌</span>
              <div>
                <h4 className="text-xs font-black text-[#2B1B2E] uppercase tracking-wide">
                  VISTA DE MUESTRA DE EJEMPLO (SÓLO LECTURA)
                </h4>
                <p className="text-[11px] font-bold text-[#4A3B4E] leading-relaxed">
                  Para crear presiona, el botón, "Nuevo"
                </p>
              </div>
            </div>
          </div>
        )}

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
        {/* TAB 2: FORMACIÓN ACADÉMICA */}
        {/* ========================================================================= */}
        {activeTab === 'formacion' && (
          <div className="space-y-4">
            {renderSectionToggle('formacion', 'Formación Académica')}
            <div className="flex items-center justify-between border-b pb-2 border-[#EFE2C9]">
              <h3 className="text-xs font-extrabold uppercase text-[#FF2E63]">
                Estudios y Nivel Académico
              </h3>
              <button
                onClick={() => {
                  setCvData((prev) => ({
                    ...prev,
                    education: [
                      ...prev.education,
                      { level: "", institution: "", year: "", degree: "" }
                    ]
                  }));
                }}
                className="flex items-center gap-1 text-xs text-[#00A8A0] font-bold hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Formación
              </button>
            </div>

            <div className="space-y-4">
              {cvData.education.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-white rounded-2xl border-2 border-[#EFE2C9] shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-1 border-slate-200 ">
                    <span className="text-xs font-bold text-[#00A8A0]">Estudio / Formación #{idx + 1}</span>
                    <button
                      onClick={() => {
                        const name = item.degree || item.level || item.institution || `Estudio #${idx + 1}`;
                        if (window.confirm(`¿Estás seguro de que deseas eliminar "${name}"?`)) {
                          setCvData((prev) => ({
                            ...prev,
                            education: prev.education.filter((_, i) => i !== idx)
                          }));
                        }
                      }}
                      className="text-[#2B1B2E] font-medium hover:text-red-600 transition"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#2B1B2E] mb-1">
                      Nivel Alcanzado (Ej: SECUNDARIO COMPLETO)
                    </label>
                    <input 
                      type="text"
                      value={item.level}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCvData((prev) => {
                          const updated = [...prev.education];
                          updated[idx].level = val;
                          return { ...prev, education: updated };
                        });
                      }}
                      placeholder="Ej: SECUNDARIO COMPLETO"
                      className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#2B1B2E] mb-1">
                      Nombre de la Institución Educativa / Colegio
                    </label>
                    <input 
                      type="text"
                      value={item.institution}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCvData((prev) => {
                          const updated = [...prev.education];
                          updated[idx].institution = val;
                          return { ...prev, education: updated };
                        });
                      }}
                      placeholder="Ej: Colegio Secundario N° 5095 General Manuel Belgrano"
                      className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-[#2B1B2E] mb-1">
                        Año de Egresado
                      </label>
                      <input 
                        type="text"
                        value={item.year}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCvData((prev) => {
                            const updated = [...prev.education];
                            updated[idx].year = val;
                            return { ...prev, education: updated };
                          });
                        }}
                        placeholder="Ej: 2000"
                        className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#2B1B2E] mb-1">
                        Título Obtenido
                      </label>
                      <input 
                        type="text"
                        value={item.degree}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCvData((prev) => {
                            const updated = [...prev.education];
                            updated[idx].degree = val;
                            return { ...prev, education: updated };
                          });
                        }}
                        placeholder="Ej: Bachiller Pedagógico"
                        className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: TÍTULOS PROFESIONALES */}
        {/* ========================================================================= */}
        {activeTab === 'profesion' && (
          <div className="space-y-4">
            {renderSectionToggle('profesion', 'Títulos Profesionales')}
            <div className="flex items-center justify-between border-b pb-2 border-[#EFE2C9]">
              <h3 className="text-xs font-extrabold uppercase text-[#FF2E63]">
                Títulos de Grado y Especializaciones Profesionales
              </h3>
              <button
                onClick={() => {
                  setCvData((prev) => ({
                    ...prev,
                    profession: [
                      ...prev.profession,
                      { institution: "", year: "", degree: "" }
                    ]
                  }));
                }}
                className="flex items-center gap-1 text-xs text-[#00A8A0] font-bold hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Título
              </button>
            </div>

            <div className="space-y-4">
              {cvData.profession.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-white rounded-2xl border-2 border-[#EFE2C9] shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-1 border-slate-200 ">
                    <span className="text-xs font-bold text-[#00A8A0]">Título Profesional #{idx + 1}</span>
                    <button
                      onClick={() => {
                        const name = item.degree || item.institution || `Título #${idx + 1}`;
                        if (window.confirm(`¿Estás seguro de que deseas eliminar "${name}"?`)) {
                          setCvData((prev) => ({
                            ...prev,
                            profession: prev.profession.filter((_, i) => i !== idx)
                          }));
                        }
                      }}
                      className="text-[#2B1B2E] font-medium hover:text-red-600 transition"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#2B1B2E] mb-1">
                      Nombre del Título Obtenido / Carrera
                    </label>
                    <input 
                      type="text"
                      value={item.degree}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCvData((prev) => {
                          const updated = [...prev.profession];
                          updated[idx].degree = val;
                          return { ...prev, profession: updated };
                        });
                      }}
                      placeholder="Ej: Profesora de Educación Secundaria en Lengua y Literatura"
                      className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#2B1B2E] mb-1">
                      Institución Educativa, Universidad o Ministerio Emisor
                    </label>
                    <input 
                      type="text"
                      value={item.institution}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCvData((prev) => {
                          const updated = [...prev.profession];
                          updated[idx].institution = val;
                          return { ...prev, profession: updated };
                        });
                      }}
                      placeholder="Ej: Instituto de Educación Superior Jorge Luis Borges"
                      className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#2B1B2E] mb-1">
                      Año de Emisión / Titulación
                    </label>
                    <input 
                      type="text"
                      value={item.year}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCvData((prev) => {
                          const updated = [...prev.profession];
                          updated[idx].year = val;
                          return { ...prev, profession: updated };
                        });
                      }}
                      placeholder="Ej: 2016"
                      className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: EXPERIENCIA LABORAL */}
        {/* ========================================================================= */}
        {activeTab === 'experiencia' && (
          <div className="space-y-4">
            {renderSectionToggle('experiencia', 'Experiencia Laboral')}
            <div className="flex items-center justify-between border-b pb-2 border-[#EFE2C9]">
              <h3 className="text-xs font-extrabold uppercase text-[#FF2E63]">
                Experiencia Laboral & Desempeño Docente ({cvData.experience?.length || 0})
              </h3>
              <button
                onClick={() => {
                  setCvData((prev) => ({
                    ...prev,
                    experience: [
                      {
                        institution: "",
                        role: "",
                        year: "",
                        details: ""
                      },
                      ...(prev.experience || [])
                    ]
                  }));
                }}
                className="flex items-center gap-1 text-xs text-[#00A8A0] font-bold hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Experiencia
              </button>
            </div>

            <div className="space-y-4">
              {(cvData.experience || []).map((exp, idx) => (
                <div key={idx} className="p-3.5 bg-white rounded-2xl border-2 border-[#EFE2C9] shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-1 border-slate-200 ">
                    <span className="text-xs font-bold text-[#00A8A0]">Experiencia Laboral #{idx + 1}</span>
                    <button
                      onClick={() => {
                        const name = exp.role || exp.institution || `Experiencia #${idx + 1}`;
                        if (window.confirm(`¿Estás seguro de que deseas eliminar "${name}"?`)) {
                          setCvData((prev) => ({
                            ...prev,
                            experience: (prev.experience || []).filter((_, i) => i !== idx)
                          }));
                        }
                      }}
                      className="text-[#2B1B2E] font-medium hover:text-red-600 transition"
                      title="Eliminar experiencia"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#2B1B2E] mb-1">
                      Puesto / Cargo Desempeñado
                    </label>
                    <input 
                      type="text"
                      value={exp.role}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCvData((prev) => {
                          const updated = [...prev.experience];
                          updated[idx].role = val;
                          return { ...prev, experience: updated };
                        });
                      }}
                      placeholder="Ej: Profesora de Lengua y Literatura en Pluricurso Rural"
                      className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#2B1B2E] mb-1">
                      Escuela / Institución o Empresa
                    </label>
                    <input 
                      type="text"
                      value={exp.institution}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCvData((prev) => {
                          const updated = [...prev.experience];
                          updated[idx].institution = val;
                          return { ...prev, experience: updated };
                        });
                      }}
                      placeholder="Ej: Colegio Secundario N° 5170"
                      className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-[#2B1B2E] mb-1">
                        Año / Periodo
                      </label>
                      <input 
                        type="text"
                        value={exp.year}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCvData((prev) => {
                            const updated = [...prev.experience];
                            updated[idx].year = val;
                            return { ...prev, experience: updated };
                          });
                        }}
                        placeholder="Ej: 2025"
                        className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-[#2B1B2E] mb-1">
                        Detalles / Tareas
                      </label>
                      <input 
                        type="text"
                        value={exp.details}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCvData((prev) => {
                            const updated = [...prev.experience];
                            updated[idx].details = val;
                            return { ...prev, experience: updated };
                          });
                        }}
                        placeholder="Ej: Coordinación y acompañamiento tutorial"
                        className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: CURSOS & CAPACITACIONES */}
        {/* ========================================================================= */}
        {activeTab === 'cursos' && (
          <div className="space-y-4">
            {renderSectionToggle('cursos', 'Cursos y Capacitaciones')}
            <div className="flex items-center justify-between border-b pb-2 border-[#EFE2C9]">
              <h3 className="text-xs font-extrabold uppercase text-[#FF2E63]">
                Historial de Cursos, Talleres y Jornadas ({cvData.coursesAndCertificates.length})
              </h3>
              <button
                onClick={() => {
                  setCvData((prev) => ({
                    ...prev,
                    coursesAndCertificates: [
                      {
                        year: "",
                        institution: "",
                        title: "",
                        hours: "",
                        details: ""
                      },
                      ...prev.coursesAndCertificates
                    ]
                  }));
                }}
                className="flex items-center gap-1 text-xs text-[#00A8A0] font-bold hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Curso
              </button>
            </div>

            <div className="space-y-4">
              {cvData.coursesAndCertificates.map((c, idx) => (
                <div key={idx} className="p-3.5 bg-white rounded-2xl border-2 border-[#EFE2C9] shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-1 border-slate-200 ">
                    <span className="text-xs font-bold text-[#00A8A0]">Curso Docente #{idx + 1}</span>
                    <button
                      onClick={() => {
                        const name = c.title || c.institution || `Curso #${idx + 1}`;
                        if (window.confirm(`¿Estás seguro de que deseas eliminar "${name}"?`)) {
                          setCvData((prev) => ({
                            ...prev,
                            coursesAndCertificates: prev.coursesAndCertificates.filter((_, i) => i !== idx)
                          }));
                        }
                      }}
                      className="text-[#2B1B2E] font-medium hover:text-red-600 transition"
                      title="Eliminar curso"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#2B1B2E] mb-1">
                      Nombre Completo del Curso, Taller o Simposio
                    </label>
                    <input 
                      type="text"
                      value={c.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCvData((prev) => {
                          const updated = [...prev.coursesAndCertificates];
                          updated[idx].title = val;
                          return { ...prev, coursesAndCertificates: updated };
                        });
                      }}
                      placeholder="Ej: Seminario Taller de Actualización Pedagógica en Lengua"
                      className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#2B1B2E] mb-1">
                      Institución Organizadora / Ministerio
                    </label>
                    <input 
                      type="text"
                      value={c.institution}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCvData((prev) => {
                          const updated = [...prev.coursesAndCertificates];
                          updated[idx].institution = val;
                          return { ...prev, coursesAndCertificates: updated };
                        });
                      }}
                      placeholder="Ej: Ministerio de Educación, Cultura, Ciencia y Tecnología"
                      className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-[#2B1B2E] mb-1">
                        Año
                      </label>
                      <input 
                        type="text"
                        value={c.year}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCvData((prev) => {
                            const updated = [...prev.coursesAndCertificates];
                            updated[idx].year = val;
                            return { ...prev, coursesAndCertificates: updated };
                          });
                        }}
                        placeholder="Ej: 2023"
                        className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#2B1B2E] mb-1">
                        Carga Horaria
                      </label>
                      <input 
                        type="text"
                        value={c.hours}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCvData((prev) => {
                            const updated = [...prev.coursesAndCertificates];
                            updated[idx].hours = val;
                            return { ...prev, coursesAndCertificates: updated };
                          });
                        }}
                        placeholder="Ej: 60 hs"
                        className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#2B1B2E] mb-1">
                        Resolución / N°
                      </label>
                      <input 
                        type="text"
                        value={c.details}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCvData((prev) => {
                            const updated = [...prev.coursesAndCertificates];
                            updated[idx].details = val;
                            return { ...prev, coursesAndCertificates: updated };
                          });
                        }}
                        placeholder="Ej: Res. N° 124/23"
                        className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: INFORMÁTICA */}
        {/* ========================================================================= */}
        {activeTab === 'informatica' && (
          <div className="space-y-4">
            {renderSectionToggle('informatica', 'Informática y TICs')}
            <div className="flex items-center justify-between border-b pb-2 border-[#EFE2C9]">
              <h3 className="text-xs font-extrabold uppercase text-[#FF2E63]">
                Informática y Alfabetización Digital
              </h3>
              <button
                onClick={() => {
                  setCvData((prev) => ({
                    ...prev,
                    informatics: [
                      ...prev.informatics,
                      { institution: "", course: "" }
                    ]
                  }));
                }}
                className="flex items-center gap-1 text-xs text-[#00A8A0] font-bold hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Informática
              </button>
            </div>

            <div className="space-y-4">
              {cvData.informatics.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-white rounded-2xl border-2 border-[#EFE2C9] shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-1 border-slate-200 ">
                    <span className="text-xs font-bold text-[#00A8A0]">Curso Informático #{idx + 1}</span>
                    <button
                      onClick={() => {
                        const name = item.course || item.institution || `Curso Informático #${idx + 1}`;
                        if (window.confirm(`¿Estás seguro de que deseas eliminar "${name}"?`)) {
                          setCvData((prev) => ({
                            ...prev,
                            informatics: prev.informatics.filter((_, i) => i !== idx)
                          }));
                        }
                      }}
                      className="text-[#2B1B2E] font-medium hover:text-red-600 transition"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#2B1B2E] mb-1">
                      Nombre del Curso de Informática o TICs
                    </label>
                    <input 
                      type="text"
                      value={item.course}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCvData((prev) => {
                          const updated = [...prev.informatics];
                          updated[idx].course = val;
                          return { ...prev, informatics: updated };
                        });
                      }}
                      placeholder="Ej: ABC DIGITAL - APRENDER A USAR INTERNET"
                      className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#2B1B2E] mb-1">
                      Institución o Plataforma Emisora
                    </label>
                    <input 
                      type="text"
                      value={item.institution}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCvData((prev) => {
                          const updated = [...prev.informatics];
                          updated[idx].institution = val;
                          return { ...prev, informatics: updated };
                        });
                      }}
                      placeholder="Ej: Secretaría de Innovación Pública - Punto Digital"
                      className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: ECOLOGÍA & PROYECTOS */}
        {/* ========================================================================= */}
        {activeTab === 'ecologia' && (
          <div className="space-y-4">
            {renderSectionToggle('ecologia', 'Proyectos y Comunidad')}
            <div className="p-3 bg-[#FFF1C2] rounded-xl border-2 border-[#FFC93C] text-xs text-[#2B1B2E] space-y-1 shadow-sm">
              <div className="flex items-center gap-1.5 font-bold text-[#FF2E63]">
                <Info className="w-4 h-4" /> Proyectos Ecológicos, Sociales & Comunitarios
              </div>
              <p className="text-[11px] text-[#2B1B2E] font-bold">
                Esta sección permite registrar iniciativas comunitarias, talleres sobre medio ambiente, huertas orgánicas, proyectos rurales, voluntariados y acciones sociales de impacto sustentable.
              </p>
            </div>

            {/* Proyectos Rurales */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b pb-1 border-[#EFE2C9]">
                <span className="text-xs font-bold text-emerald-700">Proyectos Rurales / Agricultura</span>
                <button
                  onClick={() => {
                    setCvData((prev) => ({
                      ...prev,
                      ecology: {
                        ...prev.ecology,
                        rural: [
                          ...(prev.ecology?.rural || []),
                          { title: "", institution: "" }
                        ]
                      }
                    }));
                  }}
                  className="flex items-center gap-1 text-xs text-emerald-600 font-bold hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Rural
                </button>
              </div>

              {(cvData.ecology?.rural || []).map((item, idx) => (
                <div key={idx} className="p-3.5 bg-white rounded-2xl border-2 border-[#EFE2C9] shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-600">Proyecto Rural #{idx + 1}</span>
                    <button
                      onClick={() => {
                        const name = item.title || item.institution || `Proyecto Rural #${idx + 1}`;
                        if (window.confirm(`¿Estás seguro de que deseas eliminar "${name}"?`)) {
                          setCvData((prev) => ({
                            ...prev,
                            ecology: {
                              ...prev.ecology,
                              rural: prev.ecology.rural.filter((_, i) => i !== idx)
                            }
                          }));
                        }
                      }}
                      className="text-[#2B1B2E] font-medium hover:text-red-600 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#2B1B2E] mb-0.5">Título del Taller / Proyecto Rural</label>
                    <input 
                      type="text"
                      value={item.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCvData((prev) => {
                          const updated = [...prev.ecology.rural];
                          updated[idx].title = val;
                          return { ...prev, ecology: { ...prev.ecology, rural: updated } };
                        });
                      }}
                      className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#2B1B2E] mb-0.5">Institución Organizadora</label>
                    <input 
                      type="text"
                      value={item.institution}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCvData((prev) => {
                          const updated = [...prev.ecology.rural];
                          updated[idx].institution = val;
                          return { ...prev, ecology: { ...prev.ecology, rural: updated } };
                        });
                      }}
                      className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Proyectos Ambientales */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b pb-1 border-[#EFE2C9]">
                <span className="text-xs font-bold text-teal-700">Proyectos Medio Ambientales</span>
                <button
                  onClick={() => {
                    setCvData((prev) => ({
                      ...prev,
                      ecology: {
                        ...prev.ecology,
                        environmental: [
                          ...(prev.ecology?.environmental || []),
                          { title: "", institution: "" }
                        ]
                      }
                    }));
                  }}
                  className="flex items-center gap-1 text-xs text-[#00A8A0] font-bold hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Ambiental
                </button>
              </div>

              {(cvData.ecology?.environmental || []).map((item, idx) => (
                <div key={idx} className="p-3.5 bg-white rounded-2xl border-2 border-[#EFE2C9] shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#00A8A0]">Proyecto Ambiental #{idx + 1}</span>
                    <button
                      onClick={() => {
                        const name = item.title || item.institution || `Proyecto Ambiental #${idx + 1}`;
                        if (window.confirm(`¿Estás seguro de que deseas eliminar "${name}"?`)) {
                          setCvData((prev) => ({
                            ...prev,
                            ecology: {
                              ...prev.ecology,
                              environmental: prev.ecology.environmental.filter((_, i) => i !== idx)
                            }
                          }));
                        }
                      }}
                      className="text-[#2B1B2E] font-medium hover:text-red-600 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#2B1B2E] mb-0.5">Nombre del Proyecto Ambiental</label>
                    <input 
                      type="text"
                      value={item.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCvData((prev) => {
                          const updated = [...prev.ecology.environmental];
                          updated[idx].title = val;
                          return { ...prev, ecology: { ...prev.ecology, environmental: updated } };
                        });
                      }}
                      className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#2B1B2E] mb-0.5">Entidad o Red Organizadora</label>
                    <input 
                      type="text"
                      value={item.institution}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCvData((prev) => {
                          const updated = [...prev.ecology.environmental];
                          updated[idx].institution = val;
                          return { ...prev, ecology: { ...prev.ecology, environmental: updated } };
                        });
                      }}
                      className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: CERTIFICADOS ESCANEADOS (NUEVO FLUJO SIMPLIFICADO A4) */}
        {/* ========================================================================= */}
        {activeTab === 'certificados' && (
          <div className="space-y-4">
            {renderSectionToggle('certificados', 'Certificados Escaneados')}
            {/* 1. Selector */}
            <div>
              <label className="block text-xs font-black text-[#FF2E63] mb-1.5 uppercase tracking-wide">
                IDENTIFICA TU CERTIFICADO *
              </label>
              <select
                value={selectedRegIdx}
                onChange={(e) => setSelectedRegIdx(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] font-extrabold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition shadow-sm"
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
                    alert('Por favor selecciona primero tu certificado en "IDENTIFICA TU CERTIFICADO".');
                    return;
                  }
                  stopCamera();
                  setCertMode('upload');
                  fileInputRef.current?.click();
                }}
                className={`p-2.5 rounded-xl border-2 flex items-center justify-center gap-1.5 font-black text-xs transition ${
                  certMode === 'upload'
                    ? 'border-[#FF2E63] bg-[#FF2E63] text-white shadow-md'
                    : 'border-[#EFE2C9] bg-white text-[#2B1B2E] hover:bg-[#FFFDF7]'
                }`}
              >
                <Upload className="w-4 h-4" /> Subir Imagen
              </button>
              <button
                onClick={() => {
                  if (selectedRegIdx === '') {
                    alert('Por favor selecciona primero tu certificado en "IDENTIFICA TU CERTIFICADO".');
                    return;
                  }
                  startCamera();
                }}
                className={`p-2.5 rounded-xl border-2 flex items-center justify-center gap-1.5 font-black text-xs transition ${
                  certMode === 'camera'
                    ? 'border-[#FF2E63] bg-[#FF2E63] text-white shadow-md'
                    : 'border-[#EFE2C9] bg-white text-[#2B1B2E] hover:bg-[#FFFDF7]'
                }`}
              >
                <Camera className="w-4 h-4" /> Usar Cámara
              </button>
            </div>

            {/* 3. Camera view or File dropzone with "CLIC AQUÍ" */}
            {certMode === 'camera' && isCameraActive ? (
              <div className="relative rounded-xl overflow-hidden bg-black flex flex-col items-center justify-center h-52">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <button
                  onClick={capturePhoto}
                  className="absolute bottom-3 flex items-center gap-1.5 px-5 py-2 bg-[#FF2E63] hover:bg-[#E31555] text-white font-black text-xs rounded-full shadow-lg transition"
                >
                  <Camera className="w-4 h-4" /> Capturar Foto
                </button>
              </div>
            ) : (
              <div 
                onClick={() => {
                  if (selectedRegIdx === '') {
                    alert('Por favor selecciona primero tu certificado en "IDENTIFICA TU CERTIFICADO".');
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                className="w-full h-28 border-2 border-dashed border-[#00A8A0] bg-white rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-[#CFF3F0]/30 transition group shadow-sm"
              >
                <Upload className="w-6 h-6 text-[#00A8A0] mb-1 group-hover:scale-110 transition duration-300" />
                <span className="font-black text-xs text-[#FF2E63] uppercase tracking-wider">CLIC AQUÍ</span>
                <span className="text-[10px] text-[#2B1B2E] font-bold">Seleccionar archivo o foto de certificado</span>
              </div>
            )}

            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileUpload} className="hidden" />

            {/* 4. List of Attached Certificates */}
            <div className="pt-3 border-t-2 border-[#EFE2C9] space-y-3">
              <span className="text-xs font-black text-[#2B1B2E] uppercase tracking-wider">
                ANEXADOS: ({cvData.certificatesScanned.length})
              </span>

              {cvData.certificatesScanned.length === 0 ? (
                <p className="text-xs text-[#2B1B2E] font-bold italic text-center py-4 border-2 border-dashed border-[#EFE2C9] rounded-xl bg-white">
                  No hay certificados anexados aún.
                </p>
              ) : (
                <div className="space-y-2">
                  {cvData.certificatesScanned.map((cert) => (
                    <div key={cert.id} className="flex items-center gap-3 p-2.5 bg-white rounded-xl border-2 border-[#EFE2C9] shadow-sm">
                      <img 
                        src={cert.imageUrl} 
                        alt={cert.title} 
                        style={{ transform: `rotate(${cert.rotation || 0}deg)` }}
                        className="w-12 h-14 object-cover rounded-lg border border-[#EFE2C9] flex-shrink-0" 
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-[#2B1B2E] truncate">{cert.title}</p>
                        <p className="text-[10px] text-[#2B1B2E] font-bold">{cert.institution} ({cert.year})</p>
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
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#FFF1C2] border border-[#FFC93C] text-[#2B1B2E] font-black text-[11px] hover:bg-[#FFC93C] transition"
                        title="Girar imagen 90°"
                      >
                        <RotateCw className="w-3.5 h-3.5 text-[#FF2E63]" />
                        <span>Girar ({cert.rotation || 0}°)</span>
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={() => {
                          const name = cert.title || 'este certificado';
                          if (window.confirm(`¿Estás seguro de que deseas eliminar el certificado "${name}"?`)) {
                            setCvData(prev => ({
                              ...prev,
                              certificatesScanned: prev.certificatesScanned.filter(c => c.id !== cert.id)
                            }));
                          }
                        }}
                        className="p-1.5 text-[#2B1B2E] hover:text-red-600 transition"
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
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 9: FIRMA DIGITAL */}
        {/* ========================================================================= */}
        {activeTab === 'firma' && (
          <div className="space-y-4">
            {renderSectionToggle('firma', 'Firma Digital')}
            <h3 className="text-xs font-extrabold uppercase text-[#FF2E63] border-b pb-2 border-[#EFE2C9]">
              Firma Digital del Documento
            </h3>

            <div className="p-4 bg-white rounded-2xl border-2 border-[#EFE2C9] space-y-3 text-center shadow-sm">
              {cvData.signature?.dataUrl ? (
                <div className="space-y-2">
                  <div className="bg-[#FFFDF7] p-3 rounded-xl border border-[#FFC93C]">
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
                    className="flex items-center justify-center gap-1 mx-auto px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Quitar Imagen de Firma
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[#2B1B2E] font-bold italic">No has dibujado o subido una imagen de firma aún.</p>
              )}

              <button
                onClick={onOpenSignature}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#FF2E63] hover:bg-[#E31555] text-white text-xs font-black rounded-xl shadow-md transition"
              >
                <PenTool className="w-4 h-4" /> Abrir Tablero de Firma (Dibujar / Subir)
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl border-2 border-[#EFE2C9] space-y-3 shadow-sm">
              <h4 className="text-xs font-black text-[#2B1B2E] uppercase">Datos del Pie de Firma</h4>
              
              <div>
                <label className="block text-[11px] font-bold text-[#2B1B2E] mb-1">Nombre del Firmante</label>
                <input 
                  type="text"
                  value={cvData.signature?.signerName !== undefined ? cvData.signature.signerName : (cvData.personalInfo?.fullName || '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCvData(prev => ({
                      ...prev,
                      signature: { ...prev.signature, signerName: val }
                    }));
                  }}
                  placeholder="Ej: MÓNICA DANIELA BURGOS"
                  className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2B1B2E] mb-1">Cargo / Rol</label>
                <input 
                  type="text"
                  value={cvData.signature?.signerRole !== undefined ? cvData.signature.signerRole : (cvData.roles?.[0] || '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCvData(prev => ({
                      ...prev,
                      signature: { ...prev.signature, signerRole: val }
                    }));
                  }}
                  placeholder="Ej: Profesora de Educación Secundaria en Lengua y Literatura"
                  className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2B1B2E] mb-1">Lugar y Fecha</label>
                <input 
                  type="text"
                  value={cvData.signature?.date !== undefined ? cvData.signature.date : (cvData.personalInfo?.cityProvince ? `${cvData.personalInfo.cityProvince.split(',')[0]}, ${cvData.personalInfo.year || '2025'}` : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCvData(prev => ({
                      ...prev,
                      signature: { ...prev.signature, date: val }
                    }));
                  }}
                  placeholder="Ej: Salta, 2025"
                  className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 10: CVS GUARDADOS / ABRIR */}
        {/* ========================================================================= */}
        {activeTab === 'guardados' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2 border-[#EFE2C9]">
              <h3 className="text-xs font-extrabold uppercase text-[#FF2E63] flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-[#00A8A0]" /> Abrir Mis Currículums Guardados
              </h3>

              {cvData?.id !== 'cv_ejemplo_estandar' && (
                <button
                  onClick={handleSaveFromPanel}
                  disabled={isSavingFromPanel}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingFromPanel ? 'Guardando...' : 'Guardar Actual'}</span>
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {savedList.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#2B1B2E] font-medium border-2 border-dashed border-[#EFE2C9] rounded-xl">
                  No hay currículums guardados aún. Haz clic en "Guardar Actual" para almacenar este borrador en WebP.
                </div>
              ) : (
                savedList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-[#EFE2C9] bg-[#FFFDF7]/50  hover:border-purple-500 transition flex items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-xs font-black text-[#2B1B2E] font-black  truncate">
                        {item.candidate_name || item.title}
                      </h4>
                      <p className="text-[10px] text-[#2B1B2E] font-medium font-semibold flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#2B1B2E] font-medium" />
                        <span>{item.dni ? `DNI: ${item.dni}` : 'Borrador'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleOpenSavedFromPanel(item.id)}
                        className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white font-black text-[11px] rounded-lg shadow transition flex items-center gap-1"
                      >
                        <FolderOpen className="w-3.5 h-3.5" /> Abrir
                      </button>

                      <button
                        onClick={() => handleDeleteSavedFromPanel(item.id, item.candidate_name || item.title)}
                        className="p-1.5 text-[#2B1B2E] font-medium hover:text-red-500 rounded-lg hover:bg-[#EFE2C9]  transition"
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
        {/* TAB 11: DISEÑO Y PORTADA */}
        {/* ========================================================================= */}
        {activeTab === 'diseno' && (
          <div className="space-y-6">
            <h3 className="text-xs font-extrabold uppercase text-[#FF2E63] border-b pb-2 border-[#EFE2C9] flex items-center gap-1.5">
              <Layout className="w-4 h-4 text-[#00A8A0]" /> Estructura de Diseño, Portada y Secciones
            </h3>

            {/* Cover Page Toggle */}
            <div className="bg-purple-50/80 p-4 rounded-xl border border-purple-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#2B1B2E] flex items-center gap-1.5">
                    {cvData.showCoverPage !== false ? <Eye className="w-4 h-4 text-[#00A8A0]" /> : <EyeOff className="w-4 h-4 text-[#2B1B2E] font-medium" />}
                    Portada de Impacto (Página 1)
                  </h4>
                  <p className="text-[11px] text-[#2B1B2E] font-medium">
                    {cvData.showCoverPage !== false 
                      ? 'Activada: El currículum comenzará con una hoja de portada editorial completa.' 
                      : 'Desactivada: El documento iniciará directamente con los Datos Personales (Página 1).'}
                  </p>
                </div>

                <button
                  onClick={() => setCvData(prev => ({ ...prev, showCoverPage: prev.showCoverPage === undefined ? false : !prev.showCoverPage }))}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer ${
                    cvData.showCoverPage !== false
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-[#EFE2C9] text-[#2B1B2E] hover:bg-slate-300'
                  }`}
                >
                  {cvData.showCoverPage !== false ? 'Desactivar Portada' : 'Activar Portada'}
                </button>
              </div>
            </div>

            {/* Cover Layout Preset Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#2B1B2E] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00A8A0]" /> Estilo & Adornos de Portada
              </label>
              
              <div className="grid grid-cols-1 gap-2">
                {[
                  { 
                    id: 'monica-classic', 
                    title: 'Portada Clásica Mónica', 
                    desc: 'Fotografía central destacada con marco dorado, título principal y adornos de firma oficial.',
                    badge: 'Docentes & Educadores' 
                  },
                  { 
                    id: 'modern-corporate', 
                    title: 'Portada Corporativa con Banner', 
                    desc: 'Banner superior amplio con bloques cromáticos de presentación y badges de titulación.',
                    badge: 'Empresas & Ejecutivos' 
                  },
                  { 
                    id: 'minimal-editorial', 
                    title: 'Portada Editorial Minimalista', 
                    desc: 'Líneas finas de acento estilo revista de prestigio con tipografía destacada limpia.',
                    badge: 'Jóvenes & Creativos' 
                  },
                  { 
                    id: 'creative-cardon', 
                    title: 'Portada Creativa Cardón', 
                    desc: 'Doble marco decorativo turquesa con íconos de competencias y resguardo de datos.',
                    badge: 'Linda Feria Salta' 
                  }
                ].map((styleOpt) => {
                  const isSelected = (cvData.coverPreset || 'monica-classic') === styleOpt.id;
                  return (
                    <button
                      key={styleOpt.id}
                      onClick={() => setCvData(prev => ({ ...prev, coverPreset: styleOpt.id, layoutStyle: styleOpt.id }))}
                      className={`p-3 rounded-xl border text-left transition flex items-start justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'border-[#FF2E63] bg-[#FFD9E3]/30 ring-2 ring-[#FF2E63]/30'
                          : 'border-[#EFE2C9] bg-white hover:border-[#FF2E63]'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-[#2B1B2E]">{styleOpt.title}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-extrabold">
                            {styleOpt.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#2B1B2E] font-medium leading-snug">{styleOpt.desc}</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#00A8A0] flex-shrink-0 mt-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selection of Featured Records for Cover Page */}
            <div className="space-y-3 pt-3 border-t border-[#EFE2C9]">
              <label className="block text-xs font-bold text-[#FF2E63] uppercase tracking-wide">
                Registros Destacados en Portada
              </label>
              <p className="text-[11px] font-bold text-[#6B5B6E] leading-snug">
                Elige qué títulos introducidos aparecerán destacados en los badges de la portada:
              </p>

              {/* Select Featured Academic Title */}
              <div>
                <label className="block text-xs font-bold text-[#2B1B2E] mb-1">
                  Título Académico Destacado en Portada:
                </label>
                <select
                  value={cvData.coverFeaturedEducationId || ''}
                  onChange={(e) => setCvData(prev => ({ ...prev, coverFeaturedEducationId: e.target.value }))}
                  className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] font-bold outline-none focus:border-[#FF2E63] transition"
                >
                  <option value="">-- Usar primer título cargado automáticamente --</option>
                  {(cvData.education || []).map((edu, idx) => (
                    <option key={idx} value={edu.id || idx}>
                      {edu.degree} ({edu.institution})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Featured Professional Title */}
              <div>
                <label className="block text-xs font-bold text-[#2B1B2E] mb-1">
                  Título / Cargo Profesional Destacado en Portada:
                </label>
                <select
                  value={cvData.coverFeaturedProfessionId || ''}
                  onChange={(e) => setCvData(prev => ({ ...prev, coverFeaturedProfessionId: e.target.value }))}
                  className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] font-bold outline-none focus:border-[#FF2E63] transition"
                >
                  <option value="">-- Usar primer título profesional automáticamente --</option>
                  {(cvData.professions || []).map((prof, idx) => (
                    <option key={idx} value={prof.id || idx}>
                      {prof.degree} ({prof.institution})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 12: PANELES Y COLUMNAS */}
        {/* ========================================================================= */}
        {activeTab === 'paneles' && (
          <div className="space-y-6">
            <h3 className="text-xs font-extrabold uppercase text-[#FF2E63] border-b pb-2 border-[#EFE2C9] flex items-center gap-1.5">
              <Columns3 className="w-4 h-4 text-[#00A8A0]" /> Gestión Dinámica de Paneles & Columnas
            </h3>

            {/* Panel Presets (1-Click Layout Distribution) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#2B1B2E] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00A8A0]" /> Presets de Distribución de Paneles (1-Clic)
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: 'docente-tradicional',
                    name: '🎓 Docente Tradicional',
                    desc: 'Contacto, TICs y Competencias a la Izquierda; Formación, Profesión y Experiencia a la Derecha.',
                    sec: ["contacto", "informatica", "competencias", "ecologia"],
                    prim: ["personales", "formacion", "profesion", "experiencia", "cursos"]
                  },
                  {
                    id: 'ejecutivo-corporativo',
                    name: '💼 Ejecutivo Corporativo',
                    desc: 'Contacto y Datos Personales a la Izquierda; Trayectoria y Títulos en la Columna Principal.',
                    sec: ["contacto", "personales", "competencias"],
                    prim: ["profesion", "experiencia", "formacion", "cursos", "ecologia"]
                  },
                  {
                    id: 'creativo-tics',
                    name: '⚡ Creativo & TICs',
                    desc: 'Informática, Cursos y Competencias a la Izquierda; Proyectos y Formación a la Derecha.',
                    sec: ["contacto", "informatica", "cursos", "competencias"],
                    prim: ["personales", "profesion", "experiencia", "ecologia", "formacion"]
                  },
                  {
                    id: 'columna-unica',
                    name: '📜 Columna Única Continua',
                    desc: 'Todas las secciones fluyen continuamente en la Columna Principal de lectura.',
                    sec: [],
                    prim: ["personales", "contacto", "formacion", "profesion", "experiencia", "cursos", "informatica", "ecologia", "competencias"]
                  }
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      const confirmed = window.confirm(
                        `¿Deseas aplicar el preset '${preset.name}'?\n\n` +
                        `Advertencia: Esta acción restablecerá tus configuraciones personalizadas de maquetación y columnas al estado maestro del preset.`
                      );
                      if (!confirmed) return;

                      setCvData(prev => {
                        const newAssigns = {};
                        preset.sec.forEach(s => { newAssigns[s] = 'secundaria'; });
                        preset.prim.forEach(s => { 
                          if (newAssigns[s] === 'secundaria') newAssigns[s] = 'ambas';
                          else newAssigns[s] = 'primaria';
                        });

                        return {
                          ...prev,
                          layout: {
                            ...prev.layout,
                            columnAssignments: newAssigns,
                            sectionOrders: {
                              secundaria: preset.sec,
                              primaria: preset.prim
                            }
                          }
                        };
                      });
                    }}
                    className="p-2.5 rounded-xl border border-[#EFE2C9] bg-white hover:border-[#FF2E63] text-left transition flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <span className="text-[11px] font-bold text-[#2B1B2E] block">{preset.name}</span>
                      <p className="text-[9px] text-[#6B5B6E] font-medium leading-snug mt-0.5">{preset.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Section Column Assigner & Reordering */}
            <div className="space-y-3 pt-3 border-t border-[#EFE2C9]">
              <label className="block text-xs font-bold text-[#FF2E63] uppercase tracking-wide flex items-center justify-between">
                <span>Ubicación y Ordenamiento Dinámico</span>
                <span className="text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded font-black">Secundaria vs Primaria</span>
              </label>
              <p className="text-[11px] font-bold text-[#6B5B6E] leading-snug">
                Elige la columna de cada sección y usa las flechas ⬆ ⬇ para subir o bajar su posición en pantalla:
              </p>

              <div className="space-y-2">
                {[
                  { id: 'contacto', label: 'Contacto & Redes' },
                  { id: 'personales', label: 'Datos Personales' },
                  { id: 'formacion', label: 'Formación Académica' },
                  { id: 'profesion', label: 'Títulos Profesionales' },
                  { id: 'experiencia', label: 'Experiencia Laboral' },
                  { id: 'cursos', label: 'Cursos & Capacitaciones' },
                  { id: 'informatica', label: 'Informática & TICs' },
                  { id: 'competencias', label: 'Competencias Clave' },
                  { id: 'ecologia', label: 'Proyectos & Comunidad' }
                ].map((sec) => {
                  const assignments = cvData.layout?.columnAssignments || {};
                  let currentVal = 'primaria';
                  if (typeof assignments[sec.id] === 'string') {
                    currentVal = assignments[sec.id];
                  } else {
                    const leftList = assignments.left || ["contacto", "personales", "formacion", "cursos", "informatica", "competencias"];
                    const rightList = assignments.right || ["profesion", "experiencia", "ecologia", "certificados", "firma"];
                    const inLeft = leftList.includes(sec.id);
                    const inRight = rightList.includes(sec.id);
                    if (inLeft && inRight) currentVal = 'ambas';
                    else if (inLeft) currentVal = 'secundaria';
                    else currentVal = 'primaria';
                  }

                  const defaultSecundaria = ["contacto", "personales", "informatica", "competencias", "ecologia"];
                  const defaultPrimaria = ["personales", "formacion", "profesion", "experiencia", "cursos", "ecologia"];

                  const secOrder = cvData.layout?.sectionOrders?.secundaria || defaultSecundaria;
                  const primOrder = cvData.layout?.sectionOrders?.primaria || defaultPrimaria;

                  const setColumn = (targetVal) => {
                    setCvData(prev => {
                      const newAssignments = {
                        ...(prev.layout?.columnAssignments || {}),
                        [sec.id]: targetVal
                      };

                      let newSecOrder = [...(prev.layout?.sectionOrders?.secundaria || defaultSecundaria)];
                      let newPrimOrder = [...(prev.layout?.sectionOrders?.primaria || defaultPrimaria)];

                      if (targetVal === 'secundaria' || targetVal === 'ambas') {
                        if (!newSecOrder.includes(sec.id)) newSecOrder.push(sec.id);
                      }
                      if (targetVal === 'primaria' || targetVal === 'ambas') {
                        if (!newPrimOrder.includes(sec.id)) newPrimOrder.push(sec.id);
                      }

                      return {
                        ...prev,
                        layout: {
                          ...prev.layout,
                          columnAssignments: newAssignments,
                          sectionOrders: {
                            secundaria: newSecOrder,
                            primaria: newPrimOrder
                          }
                        }
                      };
                    });
                  };

                  const moveSection = (colName, direction) => {
                    setCvData(prev => {
                      const curOrders = prev.layout?.sectionOrders?.[colName] || (
                        colName === 'secundaria' ? defaultSecundaria : defaultPrimaria
                      );

                      const idx = curOrders.indexOf(sec.id);
                      if (idx === -1) return prev;
                      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
                      if (targetIdx < 0 || targetIdx >= curOrders.length) return prev;

                      const newOrder = [...curOrders];
                      const [moved] = newOrder.splice(idx, 1);
                      newOrder.splice(targetIdx, 0, moved);

                      return {
                        ...prev,
                        layout: {
                          ...prev.layout,
                          sectionOrders: {
                            ...(prev.layout?.sectionOrders || {}),
                            [colName]: newOrder
                          }
                        }
                      };
                    });
                  };

                  const secPos = secOrder.indexOf(sec.id) + 1;
                  const primPos = primOrder.indexOf(sec.id) + 1;

                  return (
                    <div key={sec.id} className="p-2 bg-white rounded-xl border border-[#EFE2C9] text-xs space-y-1.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-[#2B1B2E]">{sec.label}</span>
                          {secPos > 0 && (currentVal === 'secundaria' || currentVal === 'ambas') && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-black">
                              Sec #{secPos}
                            </span>
                          )}
                          {primPos > 0 && (currentVal === 'primaria' || currentVal === 'ambas') && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-teal-100 text-teal-800 font-black">
                              Prim #{primPos}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setColumn('secundaria')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                              currentVal === 'secundaria' ? 'bg-[#FF2E63] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title="Ubicar en columna izquierda (secundaria / fina)"
                          >
                            Secundaria
                          </button>
                          <button
                            onClick={() => setColumn('primaria')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                              currentVal === 'primaria' ? 'bg-[#00A8A0] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title="Ubicar en columna derecha (primaria / principal)"
                          >
                            Primaria
                          </button>
                          <button
                            onClick={() => setColumn('ambas')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                              currentVal === 'ambas' ? 'bg-[#8E44FF] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title="Mostrar la sección en ambas columnas"
                          >
                            Ambas
                          </button>
                        </div>
                      </div>

                      {/* Reordering Controls */}
                      <div className="flex items-center justify-end gap-3 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                        {(currentVal === 'secundaria' || currentVal === 'ambas') && (
                          <div className="flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                            <span className="font-bold text-rose-700">Orden Sec:</span>
                            <button
                              onClick={() => moveSection('secundaria', 'up')}
                              disabled={secOrder.indexOf(sec.id) <= 0}
                              className="px-1 py-0.5 hover:bg-rose-200 rounded font-black disabled:opacity-30 cursor-pointer"
                              title="Subir en columna Secundaria"
                            >
                              ⬆
                            </button>
                            <button
                              onClick={() => moveSection('secundaria', 'down')}
                              disabled={secOrder.indexOf(sec.id) === -1 || secOrder.indexOf(sec.id) >= secOrder.length - 1}
                              className="px-1 py-0.5 hover:bg-rose-200 rounded font-black disabled:opacity-30 cursor-pointer"
                              title="Bajar en columna Secundaria"
                            >
                              ⬇
                            </button>
                          </div>
                        )}

                        {(currentVal === 'primaria' || currentVal === 'ambas') && (
                          <div className="flex items-center gap-1 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                            <span className="font-bold text-teal-700">Orden Prim:</span>
                            <button
                              onClick={() => moveSection('primaria', 'up')}
                              disabled={primOrder.indexOf(sec.id) <= 0}
                              className="px-1 py-0.5 hover:bg-teal-200 rounded font-black disabled:opacity-30 cursor-pointer"
                              title="Subir en columna Primaria"
                            >
                              ⬆
                            </button>
                            <button
                              onClick={() => moveSection('primaria', 'down')}
                              disabled={primOrder.indexOf(sec.id) === -1 || primOrder.indexOf(sec.id) >= primOrder.length - 1}
                              className="px-1 py-0.5 hover:bg-teal-200 rounded font-black disabled:opacity-30 cursor-pointer"
                              title="Bajar en columna Primaria"
                            >
                              ⬇
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 13: COLOR Y TIPOGRAFÍA */}
        {/* ========================================================================= */}
        {activeTab === 'color' && (
          <div className="space-y-6">
            <h3 className="text-xs font-extrabold uppercase text-[#FF2E63] border-b pb-2 border-[#EFE2C9] flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-[#00A8A0]" /> Presets Cromáticos, Google Fonts & Colores
            </h3>

            {/* Font Picker TOP */}
            <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 space-y-1">
              <label className="block text-xs font-bold text-[#2B1B2E] mb-1">
                Tipografía Principal del Documento (Google Fonts)
              </label>
              <select
                value={cvData.theme.fontFamily}
                onChange={(e) => updateTheme('fontFamily', e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border-2 border-[#EFE2C9] bg-white text-[#2B1B2E] placeholder-[#6B5B6E]/50 font-bold outline-none focus:border-[#FF2E63] focus:ring-2 focus:ring-[#FFD9E3] transition"
              >
                {fontOptions.map((f) => (
                  <option key={f.id} value={f.value}>{f.name}</option>
                ))}
              </select>
            </div>

            {/* Presets Grid Categorized */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#2B1B2E] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00A8A0]" /> Presets Cromáticos por Perfil
              </label>

              {['linda-feria', 'docentes', 'ejecutivos', 'jovenes'].map((cat) => {
                const categoryPresets = themePresets.filter(p => p.category === cat);
                const categoryTitle = cat === 'linda-feria'
                  ? '🎪 Feria'
                  : cat === 'docentes' 
                  ? '🎓 Maestros, Docentes & Educadores' 
                  : cat === 'ejecutivos' 
                  ? '💼 Ejecutivos & Corporativos' 
                  : '⚡ Jóvenes, Estudiantes & Creativos';

                return (
                  <div key={cat} className="space-y-1.5 pt-1">
                    <h4 className="text-[11px] font-black uppercase text-[#2B1B2E] font-medium tracking-wider">
                      {categoryTitle}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {categoryPresets.map((preset) => {
                        const isSelected = (cvData?.theme?.presetId || 'purple-monica') === preset.id;
                        return (
                          <button
                            key={preset.id}
                            onClick={() => applyPreset(preset)}
                            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                              isSelected
                                ? 'border-[#FF2E63] bg-[#FFD9E3]/30 ring-2 ring-[#FF2E63]/30'
                                : 'border-[#EFE2C9] bg-white hover:border-[#FF2E63]'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-bold text-[#2B1B2E] truncate pr-1">{preset.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#00A8A0] flex-shrink-0" />}
                            </div>
                            <div className="flex gap-1.5 items-center">
                              <div className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: preset.primaryColor }} />
                              <div className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: preset.accentColor }} />
                              <div className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: preset.secondaryColor }} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Color Pickers */}
            <div className="space-y-3 pt-2 border-t border-[#EFE2C9]">
              <label className="block text-xs font-bold text-[#2B1B2E]">
                Ajuste Fino de Colores Personalizados
              </label>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#2B1B2E] font-bold">Color Primario (Lateral/Portada)</span>
                <input 
                  type="color" 
                  value={cvData.theme.primaryColor} 
                  onChange={(e) => updateTheme('primaryColor', e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#2B1B2E] font-bold">Color Secundario (Encabezados lateral)</span>
                <input 
                  type="color" 
                  value={cvData.theme.secondaryColor} 
                  onChange={(e) => updateTheme('secondaryColor', e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#2B1B2E] font-bold">Color de Acento (Barras e Iconos SVG)</span>
                <input 
                  type="color" 
                  value={cvData.theme.accentColor} 
                  onChange={(e) => updateTheme('accentColor', e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0"
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
