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
import { initialCVData, standardExampleCVData, blankCVTemplate } from './data/initialCVData';
import { exportCVToPDF } from './utils/pdfExporter';
import { exportCVToJson, importCVFromJsonFile } from './utils/jsonImporterExporter';

export default function App() {
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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Autosave to localStorage on state change
  useEffect(() => {
    try {
      localStorage.setItem('cv_premium_data', JSON.stringify(cvData));
    } catch (err) {
      console.warn('Aviso: Memoria del navegador llena para el borrador activo:', err);
    }
  }, [cvData]);

  // Direct 1-Click Bulletproof Page-by-Page A4 PDF Generator
  const handlePrint = async () => {
    if (cvData) {
      try { await saveCV(cvData); } catch (e) { console.warn('Auto-save before print warning:', e); }
    }
    setIsGeneratingPDF(true);

    try {
      await exportCVToPDF(cvData);
    } catch (err) {
      console.error('Error generando PDF nativo:', err);
      alert('Hubo un inconveniente generando el archivo PDF: ' + (err.message || 'Intente nuevamente'));
    } finally {
      setIsGeneratingPDF(false);
    }
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
    setIsSaving(true);
    try {
      const res = await saveCV(cvData);
      if (res?.success) {
        if (res.cv_data) {
          setCvData(res.cv_data);
        }
        setIsPanelOpen(true);
        setActiveTab('guardados');
        alert(`✅ CV guardado correctamente como:\n"${res.title || 'Tu CV'}"`);
      } else {
        alert('⚠️ El borrador no se pudo almacenar en la memoria del navegador, pero tus datos permanecen en pantalla.');
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

  const handleExportJson = () => {
    exportCVToJson(cvData);
  };

  const handleImportJsonFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const importedData = await importCVFromJsonFile(file);
      if (importedData && typeof importedData === 'object') {
        setCvData(importedData);
        alert('✅ Currículum cargado con éxito desde archivo JSON (Schema v2).');
      }
    } catch (err) {
      alert('❌ Error al importar JSON: ' + err.message);
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
        onOpenCloudModal={() => setIsCloudModalOpen(true)}
        onExportJson={handleExportJson}
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
      />

      <CloudStatusModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        onForceSave={handleSaveCV}
        isSaving={isSaving}
      />

      {/* PDF Generation Toast Indicator */}
      {isGeneratingPDF && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3.5 border border-purple-500/50 animate-pulse no-print">
          <div className="w-6 h-6 border-3 border-purple-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div>
            <p className="text-xs font-black text-purple-300">Generando PDF A4 Nativo Directo...</p>
            <p className="text-[10px] text-slate-300">Descargando archivo idéntico a la vista previa sin cuadro de diálogo</p>
          </div>
        </div>
      )}
    </div>
  );
}
