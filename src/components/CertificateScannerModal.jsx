import React, { useState, useRef } from 'react';
import { Award, Camera, Upload, Check, X, Info, Sparkles, Trash2 } from 'lucide-react';

export default function CertificateScannerModal({ isOpen, onClose, onAddCertificate, cvData }) {
  const [mode, setMode] = useState('upload'); // 'upload' | 'camera'
  const [certTitle, setCertTitle] = useState('');
  const [institution, setInstitution] = useState('');
  const [year, setYear] = useState('');
  const [imagePreview, setImagePreview] = useState('');

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
          institution: item.institution || '',
          year: item.year || '',
          category: 'Curso / Capacitación'
        });
      }
    });
    (cvData.profession || []).forEach(item => {
      if (item.degree) {
        registeredItems.push({
          title: item.degree,
          institution: item.institution || '',
          year: item.year || '',
          category: 'Título Profesional'
        });
      }
    });
    (cvData.education || []).forEach(item => {
      if (item.degree || item.institution) {
        registeredItems.push({
          title: item.degree ? `${item.level}: ${item.degree}` : item.institution,
          institution: item.institution || '',
          year: item.year || '',
          category: 'Formación Académica'
        });
      }
    });
  }

  const handleSelectRegisteredItem = (e) => {
    const selectedIdx = parseInt(e.target.value, 10);
    if (isNaN(selectedIdx) || !registeredItems[selectedIdx]) return;
    const selected = registeredItems[selectedIdx];
    setCertTitle(selected.title);
    setInstitution(selected.institution);
    setYear(selected.year);
  };

  const startCamera = async () => {
    try {
      setMode('camera');
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('No se pudo acceder a la cámara. Por favor verifica los permisos o utiliza la opción de subir archivo.');
      setMode('upload');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
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
    setImagePreview(dataUrl);
    stopCamera();
    setMode('upload');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setImagePreview(evt.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!imagePreview) {
      alert('Por favor selecciona o toma una foto del certificado.');
      return;
    }
    if (!certTitle) {
      alert('Por favor ingresa o selecciona el título del certificado.');
      return;
    }

    onAddCertificate({
      id: Date.now().toString(),
      title: certTitle,
      institution: institution || 'Institución Emisora',
      year: year || new Date().getFullYear().toString(),
      imageUrl: imagePreview,
      rotation: 0
    });

    // Reset and close
    setCertTitle('');
    setInstitution('');
    setYear('');
    setImagePreview('');
    stopCamera();
    onClose();
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in no-print">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-bold text-lg">
            <Award className="w-5 h-5" />
            Anexar Certificado o Documento Escaneado
          </div>
          <button 
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Explanatory Banner */}
        <div className="bg-purple-50 dark:bg-purple-950/40 p-3.5 border-b border-purple-200 dark:border-purple-900/50 flex items-start gap-2 text-xs text-purple-900 dark:text-purple-200">
          <Info className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>💡 Recomendación:</strong> Primero completa tus Cursos y Titulaciones en el formulario. Así podrás <strong>seleccionar directamente el registro existente</strong> de la lista desplegable sin necesidad de volver a escribir los datos.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Registered Items Dropdown Selector */}
          {registeredItems.length > 0 && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <label className="block text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Seleccionar de tus Registros Cargados ({registeredItems.length})
              </label>
              <select
                onChange={handleSelectRegisteredItem}
                className="w-full text-xs p-2.5 rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-900 font-medium outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- Hacer clic para elegir un título cargado --</option>
                {registeredItems.map((item, idx) => (
                  <option key={idx} value={idx}>
                    [{item.category}] {item.title} ({item.year})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mode Switch buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { stopCamera(); setMode('upload'); }}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold text-sm transition ${
                mode === 'upload'
                  ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Upload className="w-4 h-4" /> Subir Archivo Imagen
            </button>
            <button
              onClick={startCamera}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold text-sm transition ${
                mode === 'camera'
                  ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Camera className="w-4 h-4" /> Capturar con Cámara
            </button>
          </div>

          {/* Camera View */}
          {mode === 'camera' && (
            <div className="relative rounded-xl overflow-hidden bg-black flex flex-col items-center justify-center h-64">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover" 
              />
              <button
                onClick={capturePhoto}
                className="absolute bottom-4 flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-full shadow-lg transition transform active:scale-95"
              >
                <Camera className="w-5 h-5" /> Tomar Foto del Certificado
              </button>
            </div>
          )}

          {/* Upload View & Preview */}
          {mode === 'upload' && (
            <div>
              {!imagePreview ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-44 border-2 border-dashed border-purple-300 dark:border-purple-800 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition group"
                >
                  <Upload className="w-8 h-8 text-purple-600 mb-2 group-hover:scale-110 transition duration-300" />
                  <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">Seleccionar imagen escaneada</span>
                  <span className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP (Certificado o Título)</span>
                </div>
              ) : (
                <div className="relative border-2 border-purple-300 dark:border-purple-800 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center h-48">
                  <img src={imagePreview} alt="Certificado preview" className="max-h-full max-w-full object-contain" />
                  <button
                    onClick={() => setImagePreview('')}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </div>
          )}

          {/* Certificate Metadata Inputs */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Título del Certificado / Diploma *</label>
              <input 
                type="text"
                value={certTitle}
                onChange={(e) => setCertTitle(e.target.value)}
                placeholder="Ej: Diploma Formadora Local en Comunidades de Aprendizaje"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-purple-500 outline-none font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Institución Emisora</label>
                <input 
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Ej: Ministerio de Educación"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Año de Emisión</label>
                <input 
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="Ej: 2023"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm shadow-md hover:shadow-purple-500/25 transition"
          >
            <Check className="w-4 h-4" /> Anexar al Documento
          </button>
        </div>
      </div>
    </div>
  );
}
