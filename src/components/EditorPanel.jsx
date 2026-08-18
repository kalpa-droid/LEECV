import React, { useState, useRef } from 'react';
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
  Eye,
  EyeOff,
  Layers
} from 'lucide-react';
import { themePresets, fontOptions } from '../data/themePresets';

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
  const [certImagePreview, setCertImagePreview] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

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

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCertImagePreview(dataUrl);
    stopCamera();
    setCertMode('upload');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setCertImagePreview(evt.target.result);
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
      roles: [...prev.roles, "Nuevo Título / Rol Profesional"]
    }));
  };

  const removeRole = (index) => {
    setCvData((prev) => ({
      ...prev,
      roles: prev.roles.filter((_, i) => i !== index)
    }));
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

  return (
    <div className="w-full h-full bg-white dark:bg-slate-900 flex flex-col no-print">
      {/* Active Section Header */}
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between flex-shrink-0">
        <h2 className="text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Formulario: {activeTab.toUpperCase()}
        </h2>
      </div>

      {/* Tab Form Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">

        {/* ========================================================================= */}
        {/* TAB 1: DATOS PERSONALES */}
        {/* ========================================================================= */}
        {activeTab === 'personales' && (
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase text-purple-700 dark:text-purple-400 border-b pb-2 border-slate-200 dark:border-slate-800">
              Información de Identificación y Contacto
            </h3>

            {/* Profile Photo Quick Trigger */}
            <div className="flex items-center gap-4 bg-purple-50 dark:bg-purple-950/30 p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/50">
              <div className="w-14 h-18 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center border border-purple-400">
                {cvData.personalInfo.profilePhoto ? (
                  <img src={cvData.personalInfo.profilePhoto} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-purple-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Foto de Perfil</p>
                <p className="text-[11px] text-slate-500 mb-2">Se muestra únicamente en la portada y en la hoja 1.</p>
                <button
                  onClick={onOpenPhotoCropper}
                  className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition"
                >
                  <Camera className="w-3 h-3" /> Cortar / Cambiar Foto
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nombre Completo (Portada)
              </label>
              <input 
                type="text"
                value={cvData.personalInfo.fullName}
                onChange={(e) => updatePersonalInfo('fullName', e.target.value)}
                placeholder="Ej: MÓNICA DANIELA BURGOS"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-purple-700 dark:text-purple-400 mb-1">
                Frase de Presentación / Perfil Profesional (Aparece en Encabezado)
              </label>
              <textarea 
                rows="3"
                value={cvData.personalInfo.quote}
                onChange={(e) => updatePersonalInfo('quote', e.target.value)}
                placeholder="Ej: Mi experiencia personal y profesional me permite desarrollar eficientemente..."
                className="w-full text-xs p-2.5 rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-purple-500 font-medium leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Apellidos (Encabezado)
                </label>
                <input 
                  type="text"
                  value={cvData.personalInfo.surname}
                  onChange={(e) => updatePersonalInfo('surname', e.target.value)}
                  placeholder="Ej: BURGOS"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nombres Completos
                </label>
                <input 
                  type="text"
                  value={cvData.personalInfo.givenNames}
                  onChange={(e) => updatePersonalInfo('givenNames', e.target.value)}
                  placeholder="Ej: Mónica Daniela"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  DNI
                </label>
                <input 
                  type="text"
                  value={cvData.personalInfo.dni}
                  onChange={(e) => updatePersonalInfo('dni', e.target.value)}
                  placeholder="Ej: 29334206"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  CUIT / CUIL
                </label>
                <input 
                  type="text"
                  value={cvData.personalInfo.cuit}
                  onChange={(e) => updatePersonalInfo('cuit', e.target.value)}
                  placeholder="Ej: 27-29334206-2"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fecha de Nacimiento
              </label>
              <input 
                type="text"
                value={cvData.personalInfo.birthDate}
                onChange={(e) => updatePersonalInfo('birthDate', e.target.value)}
                placeholder="Ej: 4 de febrero de 1982"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Domicilio y Barrio
              </label>
              <input 
                type="text"
                value={cvData.personalInfo.address}
                onChange={(e) => updatePersonalInfo('address', e.target.value)}
                placeholder="Ej: Manzana 751A Casa 11 - Ciudad Valdivia"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Teléfono Celular / WhatsApp
              </label>
              <input 
                type="text"
                value={cvData.personalInfo.phone}
                onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                placeholder="Ej: 387-155121515"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Correo Electrónico
              </label>
              <input 
                type="text"
                value={cvData.personalInfo.email}
                onChange={(e) => updatePersonalInfo('email', e.target.value)}
                placeholder="Ej: Monicadanielaburgos@yahoo.com.ar"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Roles List */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Títulos y Roles Principales (Lista de Portada)
                </span>
                <button
                  onClick={addRole}
                  className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-bold hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Rol
                </button>
              </div>
              <div className="space-y-2">
                {cvData.roles.map((role, idx) => (
                  <div key={idx} className="space-y-1">
                    <label className="block text-[10px] font-bold text-purple-600">
                      Rol / Título #{idx + 1}
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text"
                        value={role}
                        onChange={(e) => updateRoles(idx, e.target.value)}
                        placeholder="Ej: Profesora de Educación Secundaria"
                        className="flex-1 text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                      />
                      <button
                        onClick={() => removeRole(idx)}
                        className="p-2 text-slate-400 hover:text-red-600 transition"
                        title="Eliminar rol"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: FORMACIÓN ACADÉMICA */}
        {/* ========================================================================= */}
        {activeTab === 'formacion' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-extrabold uppercase text-purple-700 dark:text-purple-400">
                Estudios y Nivel Académico
              </h3>
              <button
                onClick={() => {
                  setCvData((prev) => ({
                    ...prev,
                    education: [
                      ...prev.education,
                      { level: "SECUNDARIO COMPLETO", institution: "Nombre del Colegio", year: "2025", degree: "Bachiller Pedagógico" }
                    ]
                  }));
                }}
                className="flex items-center gap-1 text-xs text-purple-600 font-bold hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Formación
              </button>
            </div>

            <div className="space-y-4">
              {cvData.education.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b pb-1 border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-purple-600">Estudio / Formación #{idx + 1}</span>
                    <button
                      onClick={() => {
                        setCvData((prev) => ({
                          ...prev,
                          education: prev.education.filter((_, i) => i !== idx)
                        }));
                      }}
                      className="text-slate-400 hover:text-red-600 transition"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
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
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-extrabold uppercase text-purple-700 dark:text-purple-400">
                Títulos de Grado y Especializaciones Profesionales
              </h3>
              <button
                onClick={() => {
                  setCvData((prev) => ({
                    ...prev,
                    profession: [
                      ...prev.profession,
                      { institution: "Instituto o Universidad", year: "2025", degree: "Nuevo Título Profesional" }
                    ]
                  }));
                }}
                className="flex items-center gap-1 text-xs text-purple-600 font-bold hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Título
              </button>
            </div>

            <div className="space-y-4">
              {cvData.profession.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b pb-1 border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-purple-600">Título Profesional #{idx + 1}</span>
                    <button
                      onClick={() => {
                        setCvData((prev) => ({
                          ...prev,
                          profession: prev.profession.filter((_, i) => i !== idx)
                        }));
                      }}
                      className="text-slate-400 hover:text-red-600 transition"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-purple-700 dark:text-purple-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
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
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-extrabold uppercase text-purple-700 dark:text-purple-400">
                Experiencia Laboral & Desempeño Docente ({cvData.experience?.length || 0})
              </h3>
              <button
                onClick={() => {
                  setCvData((prev) => ({
                    ...prev,
                    experience: [
                      {
                        institution: "Nombre de la Escuela / Institución",
                        role: "Puesto / Cargo Desempeñado",
                        year: "2025",
                        details: "Descripción del desempeño o tareas realizadas"
                      },
                      ...(prev.experience || [])
                    ]
                  }));
                }}
                className="flex items-center gap-1 text-xs text-purple-600 font-bold hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Experiencia
              </button>
            </div>

            <div className="space-y-4">
              {(cvData.experience || []).map((exp, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b pb-1 border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-purple-600">Experiencia Laboral #{idx + 1}</span>
                    <button
                      onClick={() => {
                        setCvData((prev) => ({
                          ...prev,
                          experience: prev.experience.filter((_, i) => i !== idx)
                        }));
                      }}
                      className="text-slate-400 hover:text-red-600 transition"
                      title="Eliminar experiencia"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
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
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-extrabold uppercase text-purple-700 dark:text-purple-400">
                Historial de Cursos, Talleres y Jornadas ({cvData.coursesAndCertificates.length})
              </h3>
              <button
                onClick={() => {
                  setCvData((prev) => ({
                    ...prev,
                    coursesAndCertificates: [
                      {
                        year: "2025",
                        institution: "Nombre de la Institución Organizadora",
                        title: "Nuevo Curso o Capacitación Docente",
                        hours: "40 hs",
                        details: "Certificado o Resolución N° 000/25"
                      },
                      ...prev.coursesAndCertificates
                    ]
                  }));
                }}
                className="flex items-center gap-1 text-xs text-purple-600 font-bold hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Curso
              </button>
            </div>

            <div className="space-y-4">
              {cvData.coursesAndCertificates.map((c, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b pb-1 border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-teal-600">Curso Docente #{idx + 1}</span>
                    <button
                      onClick={() => {
                        setCvData((prev) => ({
                          ...prev,
                          coursesAndCertificates: prev.coursesAndCertificates.filter((_, i) => i !== idx)
                        }));
                      }}
                      className="text-slate-400 hover:text-red-600 transition"
                      title="Eliminar curso"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
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
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-extrabold uppercase text-purple-700 dark:text-purple-400">
                Informática y Alfabetización Digital
              </h3>
              <button
                onClick={() => {
                  setCvData((prev) => ({
                    ...prev,
                    informatics: [
                      ...prev.informatics,
                      { institution: "Secretaría o Plataforma Digital", course: "Nuevo Curso de Informática / TICs" }
                    ]
                  }));
                }}
                className="flex items-center gap-1 text-xs text-purple-600 font-bold hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Informática
              </button>
            </div>

            <div className="space-y-4">
              {cvData.informatics.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b pb-1 border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-teal-600">Curso Informático #{idx + 1}</span>
                    <button
                      onClick={() => {
                        setCvData((prev) => ({
                          ...prev,
                          informatics: prev.informatics.filter((_, i) => i !== idx)
                        }));
                      }}
                      className="text-slate-400 hover:text-red-600 transition"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
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
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-900/50 text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-400">
                <Info className="w-4 h-4" /> Proyectos Ecológicos, Sociales & Comunitarios
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Esta sección permite registrar iniciativas comunitarias, talleres sobre medio ambiente, huertas orgánicas, proyectos rurales, voluntariados y acciones sociales de impacto sustentable.
              </p>
            </div>

            {/* Proyectos Rurales */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b pb-1 border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Proyectos Rurales / Agricultura</span>
                <button
                  onClick={() => {
                    setCvData((prev) => ({
                      ...prev,
                      ecology: {
                        ...prev.ecology,
                        rural: [
                          ...(prev.ecology?.rural || []),
                          { title: "Nuevo Taller sobre Agricultura / Huerta", institution: "Institución / Ministerio" }
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
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-600">Proyecto Rural #{idx + 1}</span>
                    <button
                      onClick={() => {
                        setCvData((prev) => ({
                          ...prev,
                          ecology: {
                            ...prev.ecology,
                            rural: prev.ecology.rural.filter((_, i) => i !== idx)
                          }
                        }));
                      }}
                      className="text-slate-400 hover:text-red-600 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">Título del Taller / Proyecto Rural</label>
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
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">Institución Organizadora</label>
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
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Proyectos Ambientales */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b pb-1 border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-teal-700 dark:text-teal-400">Proyectos Medio Ambientales</span>
                <button
                  onClick={() => {
                    setCvData((prev) => ({
                      ...prev,
                      ecology: {
                        ...prev.ecology,
                        environmental: [
                          ...(prev.ecology?.environmental || []),
                          { title: "Nuevo Proyecto Ambiental / Reciclaje", institution: "Entidad / Red" }
                        ]
                      }
                    }));
                  }}
                  className="flex items-center gap-1 text-xs text-teal-600 font-bold hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Ambiental
                </button>
              </div>

              {(cvData.ecology?.environmental || []).map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-teal-600">Proyecto Ambiental #{idx + 1}</span>
                    <button
                      onClick={() => {
                        setCvData((prev) => ({
                          ...prev,
                          ecology: {
                            ...prev.ecology,
                            environmental: prev.ecology.environmental.filter((_, i) => i !== idx)
                          }
                        }));
                      }}
                      className="text-slate-400 hover:text-red-600 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">Nombre del Proyecto Ambiental</label>
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
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">Entidad o Red Organizadora</label>
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
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: CERTIFICADOS ESCANEADOS (SISTEMA INTEGRADO SIN VENTANA FLOTANTE) */}
        {/* ========================================================================= */}
        {activeTab === 'certificados' && (
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase text-purple-700 dark:text-purple-400 border-b pb-2 border-slate-200 dark:border-slate-800">
              Anexar Certificados y Diplomas Escaneados
            </h3>

            {/* Instruction Alert */}
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-900/50 text-xs text-purple-900 dark:text-purple-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-400">
                <Info className="w-4 h-4" /> ¿Cómo funciona?
              </div>
              <p className="text-[11px] leading-relaxed">
                Selecciona a cuál de tus <strong>Cursos o Títulos cargados</strong> corresponde la foto, toma una foto con tu cámara o sube un archivo, y haz clic en <strong>"Anexar Foto de Certificado"</strong>.
              </p>
            </div>

            {/* Dropdown Selector of Registered Items */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                1. Seleccionar Registro Correspondiente *
              </label>
              <select
                value={selectedRegIdx}
                onChange={(e) => setSelectedRegIdx(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-800 font-bold outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- Hacer clic para elegir un título o curso --</option>
                {registeredItems.map((item, idx) => (
                  <option key={idx} value={idx}>
                    [{item.category}] {item.title} ({item.year})
                  </option>
                ))}
              </select>
            </div>

            {/* Upload or Camera Toggle Buttons */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                2. Capturar o Seleccionar Imagen del Certificado
              </label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => { stopCamera(); setCertMode('upload'); }}
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 font-bold text-xs transition ${
                    certMode === 'upload'
                      ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Upload className="w-4 h-4" /> Subir Imagen
                </button>
                <button
                  onClick={startCamera}
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 font-bold text-xs transition ${
                    certMode === 'camera'
                      ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Camera className="w-4 h-4" /> Usar Cámara
                </button>
              </div>

              {/* Camera View */}
              {certMode === 'camera' && (
                <div className="relative rounded-xl overflow-hidden bg-black flex flex-col items-center justify-center h-52 mb-3">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <button
                    onClick={capturePhoto}
                    className="absolute bottom-3 flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-full shadow-lg transition"
                  >
                    <Camera className="w-4 h-4" /> Capturar Foto
                  </button>
                </div>
              )}

              {/* File Upload View & Preview */}
              {certMode === 'upload' && (
                <div>
                  {!certImagePreview ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-36 border-2 border-dashed border-purple-300 dark:border-purple-800 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-purple-50/50 transition group"
                    >
                      <Upload className="w-7 h-7 text-purple-600 mb-1 group-hover:scale-110 transition duration-300" />
                      <span className="font-bold text-xs text-slate-700 dark:text-slate-200">Hacer clic para subir foto del certificado</span>
                      <span className="text-[10px] text-slate-400">JPG, PNG, WEBP</span>
                    </div>
                  ) : (
                    <div className="relative border-2 border-purple-400 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center h-40">
                      <img src={certImagePreview} alt="Certificado cargado" className="max-h-full max-w-full object-contain" />
                      <button
                        onClick={() => setCertImagePreview('')}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileUpload} className="hidden" />
                </div>
              )}
            </div>

            {/* Add Action Button */}
            <button
              onClick={handleAddCertificateInline}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition"
            >
              <Plus className="w-4 h-4" /> Anexar Foto de Certificado
            </button>

            {/* List of Attached Certificates */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Certificados Anexados al CV ({cvData.certificatesScanned.length})
              </span>

              {cvData.certificatesScanned.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4 border border-dashed rounded-xl">
                  No se han anexado fotos de certificados aún.
                </p>
              ) : (
                <div className="space-y-2">
                  {cvData.certificatesScanned.map((cert) => (
                    <div key={cert.id} className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                      <img 
                        src={cert.imageUrl} 
                        alt={cert.title} 
                        style={{ transform: `rotate(${cert.rotation || 0}deg)` }}
                        className="w-12 h-12 object-cover rounded-lg border flex-shrink-0" 
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{cert.title}</p>
                        <p className="text-[10px] text-slate-500">{cert.institution} ({cert.year})</p>
                      </div>
                      <button
                        onClick={() => {
                          setCvData(prev => ({
                            ...prev,
                            certificatesScanned: prev.certificatesScanned.map(c => 
                              c.id === cert.id ? { ...c, rotation: ((c.rotation || 0) + 90) % 360 } : c
                            )
                          }));
                        }}
                        className="p-1 text-slate-500 hover:text-purple-600 transition"
                        title="Girar 90°"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setCvData(prev => ({
                            ...prev,
                            certificatesScanned: prev.certificatesScanned.filter(c => c.id !== cert.id)
                          }));
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 9: FIRMA DIGITAL */}
        {/* ========================================================================= */}
        {activeTab === 'firma' && (
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase text-purple-700 dark:text-purple-400 border-b pb-2 border-slate-200 dark:border-slate-800">
              Firma Digital del Documento
            </h3>

            <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-900/50 space-y-3 text-center">
              {cvData.signature?.dataUrl ? (
                <div className="bg-[#fffdf7] p-3 rounded-lg border border-amber-300">
                  <img src={cvData.signature.dataUrl} alt="Firma" className="h-16 mx-auto object-contain" />
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No has registrado una firma aún.</p>
              )}

              <button
                onClick={onOpenSignature}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow transition"
              >
                <PenTool className="w-4 h-4" /> Abrir Tablero de Firma (Fondo Cálido)
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 10: DISEÑO Y COLORES */}
        {/* ========================================================================= */}
        {activeTab === 'diseno' && (
          <div className="space-y-6">
            <h3 className="text-xs font-extrabold uppercase text-purple-700 dark:text-purple-400 border-b pb-2 border-slate-200 dark:border-slate-800 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-purple-600" /> Personalización de Estilo, Plantilla y Colores
            </h3>

            {/* Cover Page Toggle */}
            <div className="bg-purple-50/80 dark:bg-purple-950/30 p-4 rounded-xl border border-purple-200 dark:border-purple-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    {cvData.showCoverPage !== false ? <Eye className="w-4 h-4 text-purple-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                    Portada de Impacto (Página 1)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {cvData.showCoverPage !== false 
                      ? 'Activada: El currículum comenzará con una hoja de portada editorial completa.' 
                      : 'Desactivada: El documento iniciará directamente con los Datos Personales (Página 1).'}
                  </p>
                </div>

                <button
                  onClick={() => setCvData(prev => ({ ...prev, showCoverPage: prev.showCoverPage === undefined ? false : !prev.showCoverPage }))}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                    cvData.showCoverPage !== false
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                  }`}
                >
                  {cvData.showCoverPage !== false ? 'Desactivar Portada' : 'Activar Portada'}
                </button>
              </div>
            </div>

            {/* Template Style Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Layout className="w-3.5 h-3.5 text-purple-600" /> Estilo de Plantilla Premium
              </label>
              
              <div className="grid grid-cols-1 gap-2">
                {[
                  { 
                    id: 'executive-sidebar', 
                    title: 'Ejecutivo con Sidebar Lateral', 
                    desc: 'Diseño clásico de alto nivel con columna izquierda en color primario y cuerpo derecho en 2 columnas.',
                    badge: 'Recomendado Mónica / Docentes' 
                  },
                  { 
                    id: 'modern-corporate', 
                    title: 'Corporativo Moderno', 
                    desc: 'Banner superior amplio de presentación personal y contenido distribuido en 2 columnas equilibradas.',
                    badge: 'Ideal Empresas & Ejecutivos' 
                  },
                  { 
                    id: 'minimal-editorial', 
                    title: 'Editorial Minimalista', 
                    desc: 'Líneas finas de acento, tipografía refinada estilo revista y máxima claridad de lectura.',
                    badge: 'Ideal Jóvenes & Creativos' 
                  }
                ].map((styleOpt) => {
                  const isSelected = (cvData.layoutStyle || 'executive-sidebar') === styleOpt.id;
                  return (
                    <button
                      key={styleOpt.id}
                      onClick={() => setCvData(prev => ({ ...prev, layoutStyle: styleOpt.id }))}
                      className={`p-3 rounded-xl border text-left transition flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 ring-2 ring-purple-600/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{styleOpt.title}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-extrabold">
                            {styleOpt.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">{styleOpt.desc}</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-purple-600 flex-shrink-0 mt-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Presets Grid Categorized */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Presets Cromáticos por Perfil
              </label>

              {['docentes', 'ejecutivos', 'jovenes'].map((cat) => {
                const categoryPresets = themePresets.filter(p => p.category === cat);
                const categoryTitle = cat === 'docentes' 
                  ? '🎓 Maestros, Docentes & Educadores' 
                  : cat === 'ejecutivos' 
                  ? '💼 Ejecutivos & Corporativos' 
                  : '⚡ Jóvenes, Estudiantes & Creativos';

                return (
                  <div key={cat} className="space-y-1.5 pt-1">
                    <h4 className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                      {categoryTitle}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {categoryPresets.map((preset) => {
                        const isSelected = (cvData?.theme?.presetId || 'purple-monica') === preset.id;
                        return (
                          <button
                            key={preset.id}
                            onClick={() => applyPreset(preset)}
                            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                              isSelected
                                ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 ring-2 ring-purple-600/30'
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate pr-1">{preset.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />}
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

            {/* Font Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tipografía Principal del Documento (Google Fonts)
              </label>
              <select
                value={cvData.theme.fontFamily}
                onChange={(e) => updateTheme('fontFamily', e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none font-medium"
              >
                {fontOptions.map((f) => (
                  <option key={f.id} value={f.value}>{f.name}</option>
                ))}
              </select>
            </div>

            {/* Custom Color Pickers */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Ajuste Fino de Colores Personalizados
              </label>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Color Primario (Lateral/Portada)</span>
                <input 
                  type="color" 
                  value={cvData.theme.primaryColor} 
                  onChange={(e) => updateTheme('primaryColor', e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Color Secundario (Encabezados lateral)</span>
                <input 
                  type="color" 
                  value={cvData.theme.secondaryColor} 
                  onChange={(e) => updateTheme('secondaryColor', e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Color de Acento (Barras e Iconos SVG)</span>
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
