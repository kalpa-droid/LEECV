import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SecondaryNavbar from './components/SecondaryNavbar';
import EditorPanel from './components/EditorPanel';
import CVPreview from './components/CVPreview';
import PhotoCropperModal from './components/PhotoCropperModal';
import SignatureModal from './components/SignatureModal';
import WizardModal from './components/WizardModal';
import SavedCVsModal from './components/SavedCVsModal';
import CloudStatusModal from './components/CloudStatusModal';
import PricingModal from './components/PricingModal';
import { getCurrentProfile } from './services/authService';
import { initialCVData, standardExampleCVData, blankCVTemplate } from './data/initialCVData';
import { exportCVToPDF } from './utils/pdfExporter';
import { exportCVToJson, importCVFromJsonFile } from './utils/jsonImporterExporter';

export default function App() {
  const [currentProfile, setCurrentProfile] = useState(null);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  useEffect(() => {
    getCurrentProfile().then(p => setCurrentProfile(p)).catch(() => {});
  }, []);
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

  const [activeTab, setActiveTab] = useState('personales');
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const [isPhotoCropperOpen, setIsPhotoCropperOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSavedCVsOpen, setIsSavedCVsOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isPdfCheckoutOpen, setIsPdfCheckoutOpen] = useState(false);

  // Direct 1-Click Bulletproof Page-by-Page A4 PDF Generator
  const triggerPdfGeneration = async () => {
    setIsPdfCheckoutOpen(false);
    setIsGeneratingPDF(true);
    setPdfProgress(20);

    // Auto-download JSON backup file to ensure the user never loses their progress
    try { exportCVToJson(cvData); } catch (e) { console.warn('Auto JSON export warning:', e); }

    const interval = setInterval(() => {
      setPdfProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 400);

    try {
      await exportCVToPDF(cvData);
      setPdfProgress(100);
      setTimeout(() => {
        setIsGeneratingPDF(false);
        setPdfProgress(0);
      }, 800);
    } catch (err) {
      console.error('Error generando PDF nativo:', err);
      alert('Hubo un inconveniente generando el archivo PDF: ' + (err.message || 'Intente nuevamente'));
      setIsGeneratingPDF(false);
      setPdfProgress(0);
    } finally {
      clearInterval(interval);
    }
  };

  const handlePrint = async () => {
    if (cvData) {
      try { await saveCV(cvData); } catch (e) { console.warn('Auto-save before print warning:', e); }
    }
    // Open the $1 USD Pay-Per-Export / Demo Checkout Modal
    setIsPdfCheckoutOpen(true);
  };

  const handleLoadExampleCV = async () => {
    if (cvData && cvData.id !== standardExampleCVData.id) {
      try { await saveCV(cvData); } catch (e) { console.warn('Auto-save before example load warning:', e); }
    }
    setCvData(standardExampleCVData);
    try { localStorage.setItem('cv_premium_data', JSON.stringify(standardExampleCVData)); } catch {}
  };

  const handleOpenSavedCVs = async () => {
    if (cvData) {
      try { await saveCV(cvData); } catch (e) { console.warn('Auto-save before opening saved CVs warning:', e); }
    }
    setIsPanelOpen(true);
    setActiveTab('guardados');
    setIsSavedCVsOpen(true);
  };

  const handleSaveCV = async () => {
    if (cvData?.id === 'cv_ejemplo_estandar') {
      alert('📌 Estás viendo el CV de muestra de Valeria Medina.\n\nPara comenzar a crear tu propio currículum con tus datos y poder guardarlo, por favor presiona el botón "NUEVO" en la barra superior.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await saveCV(cvData);
      if (res?.success) {
        if (res.cv_data) {
          setCvData(res.cv_data);
        }
        setIsPanelOpen(true);
        setActiveTab('guardados');
        alert(`✅ Tu currículum ha sido guardado correctamente.\n\nQuedó almacenado de forma segura en la memoria de la aplicación y sincronizado si tienes conexión a internet.`);
      } else {
        alert('⚠️ Tu borrador no se pudo almacenar en la memoria del navegador, pero tus datos permanecen intactos en pantalla.');
      }
    } catch (err) {
      console.error(err);
      alert('Inconveniente al guardar CV. Tus datos ingresados se mantienen intactos en la pantalla.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartNewCVWizard = async () => {
    if (window.confirm('¿Deseas iniciar la creación de un NUEVO CV en blanco? Tu borrador actual se guardará automáticamente.')) {
      if (cvData) {
        try { await saveCV(cvData); } catch (e) { console.warn('Auto-save before new CV warning:', e); }
      }
      const newBlankCV = {
        ...blankCVTemplate,
        id: `cv_${Date.now()}`
      };

      setCvData(newBlankCV);
      try { localStorage.setItem('cv_premium_data', JSON.stringify(newBlankCV)); } catch {}
      setIsPanelOpen(true);
      setActiveTab('personales');
      setIsWizardOpen(false);
    }
  };

  const handleSavePhoto = (croppedPhotoUrl) => {
    setCvData((prev) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        profilePhoto: croppedPhotoUrl
      }
    }));
  };

  const handleSaveSignature = (signatureData) => {
    setCvData((prev) => ({
      ...prev,
      signature: signatureData
    }));
  };

  const handleConfirmDownloadJson = () => {
    exportCVToJson(cvData);
    setIsDownloadModalOpen(false);
  };

  const handleImportJsonFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const importedData = await importCVFromJsonFile(file);
      if (importedData && typeof importedData === 'object') {
        setCvData(importedData);
        alert('✅ Tu currículum se ha cargado con éxito desde el archivo de respaldo.');
      }
    } catch (err) {
      alert('❌ Error al leer el archivo de respaldo: ' + err.message);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#FFF7E8] text-[#2B1B2E] font-sans antialiased overflow-hidden">
      {/* Top Header Navbar (Row 1 - Global Actions) */}
      <Navbar 
        onPrint={handlePrint}
        onLoadExampleCV={handleLoadExampleCV}
        onStartNewCVWizard={handleStartNewCVWizard}
        onOpenSavedCVs={handleOpenSavedCVs}
        onSaveCV={handleSaveCV}
        onOpenCloudModal={() => setIsPricingModalOpen(true)}
        onExportJson={() => setIsDownloadModalOpen(true)}
        onImportJson={handleImportJsonFile}
        isSaving={isSaving}
      />

      {/* Secondary Full-Width Sub-Header Navbar Toolbar (Row 2 - Section Tabs) */}
      <SecondaryNavbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isPanelOpen={isPanelOpen}
        setIsPanelOpen={setIsPanelOpen}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Editor Sidebar */}
        {isPanelOpen && (
          <div className="w-full lg:w-96 flex-shrink-0 h-full overflow-hidden border-r-2 border-[#EFE2C9] bg-[#F5EDDA] no-print animate-fade-in">
            <EditorPanel 
              cvData={cvData}
              setCvData={setCvData}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onOpenPhotoCropper={() => setIsPhotoCropperOpen(true)}
              onOpenSignature={() => setIsSignatureOpen(true)}
            />
          </div>
        )}

        {/* Right Live Preview Area */}
        <div className="flex-1 h-full overflow-y-auto">
          <CVPreview cvData={cvData} setCvData={setCvData} activeTab={activeTab} />
        </div>
      </main>

      {/* Modals */}
      <PhotoCropperModal 
        isOpen={isPhotoCropperOpen}
        onClose={() => setIsPhotoCropperOpen(false)}
        onSavePhoto={handleSavePhoto}
        currentPhoto={cvData.personalInfo.profilePhoto}
      />

      <SignatureModal 
        isOpen={isSignatureOpen}
        onClose={() => setIsSignatureOpen(false)}
        onSaveSignature={handleSaveSignature}
        currentSignature={cvData.signature}
        defaultSignerName={cvData.personalInfo?.fullName || `${cvData.personalInfo?.surname || ''} ${cvData.personalInfo?.givenNames || ''}`.trim()}
        defaultSignerRole={cvData.roles?.[0] || cvData.profession?.[0]?.degree || ''}
        defaultDate={cvData.personalInfo?.cityProvince ? `${cvData.personalInfo.cityProvince.split(',')[0]}, ${cvData.personalInfo.year || new Date().getFullYear()}` : 'Salta, 2025'}
      />

      <WizardModal 
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onOpenPhotoCropper={() => setIsPhotoCropperOpen(true)}
        onOpenSignature={() => setIsSignatureOpen(true)}
        cvData={cvData}
        setCvData={setCvData}
      />

      <SavedCVsModal
        isOpen={isSavedCVsOpen}
        onClose={() => setIsSavedCVsOpen(false)}
        onSelectCV={(loadedCV) => setCvData(loadedCV)}
        onImportJson={handleImportJsonFile}
      />

      <CloudStatusModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        onForceSave={handleSaveCV}
        isSaving={isSaving}
      />

      <PricingModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        currentProfile={currentProfile}
      />

      {/* Modal de Pago / Exportación de PDF ($1 USD) */}
      {isPdfCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-400 flex items-center justify-center text-2xl">
                📄
              </div>
              <div>
                <h3 className="text-base font-black text-white">Exportar Documento PDF A4</h3>
                <p className="text-xs text-amber-300 font-bold">Costo por descarga: $1 USD (o equivalente)</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tu currículum se procesará en formato A4 nativo en alta resolución listo para enviar a postulaciones o imprimir.
            </p>

            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs text-slate-300 space-y-1">
              <p className="font-extrabold text-amber-400">🎁 ¡Copia de Respaldo Incluida Gratis!</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Al exportar tu PDF, se guardará automáticamente un archivo de respaldo <code>.json</code> en tu equipo para que puedas volver a cargarlo en cualquier momento sin perder tus datos.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={triggerPdfGeneration}
                className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>💳 Generar PDF e Incluir Respaldo .JSON</span>
              </button>
              <button
                onClick={() => setIsPdfCheckoutOpen(false)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Volver al Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Explicativo para Descargar Respaldo JSON */}
      {isDownloadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-2xl">
              📥
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Descargar Archivo de Respaldo</h3>
              <p className="text-xs text-slate-300 leading-relaxed mt-2">
                Se guardará en tu dispositivo un archivo de copia de respaldo de tu currículum (formato <code>.json</code>).
              </p>
              <p className="text-xs text-slate-400 leading-relaxed mt-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                💡 <strong>¿Cómo usarlo después?</strong> Si usas otra computadora o celular, simplemente presiona el botón <strong>"Abrir"</strong> en el menú superior y elige <strong>"Cargar Archivo (.json)"</strong> para continuar donde quedaste.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsDownloadModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDownloadJson}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition"
              >
                Confirmar y Descargar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unificada Ventana Emergente de Progreso para Exportar PDF */}
      {isGeneratingPDF && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in no-print">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl max-w-md w-full p-6 text-white space-y-5 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-purple-600/20 border border-purple-500/50 text-purple-300 flex items-center justify-center mx-auto text-2xl animate-pulse">
              📄
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-black text-purple-200">Generando tu Documento PDF</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Estamos armando tus páginas A4 con todas tus fotos, títulos y certificados en alta resolución. Por favor espera un instante...
              </p>
            </div>

            {/* Barra de Progreso Elegante */}
            <div className="space-y-1.5">
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 rounded-full transition-all duration-300"
                  style={{ width: `${pdfProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-extrabold text-purple-300">
                <span>Procesando archivo...</span>
                <span>{pdfProgress}%</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              💡 El documento PDF se descargará automáticamente en tu carpeta de descargas cuando finalice la barra.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
