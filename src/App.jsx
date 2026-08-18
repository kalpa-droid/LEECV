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
import { initialCVData, standardExampleCVData } from './data/initialCVData';
import { saveCV } from './services/cvStorageService';

import { exportCVToPDF } from './utils/pdfExporter';

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
            ...initialCVData,
            ...parsed,
            showCoverPage: parsed.showCoverPage !== undefined ? parsed.showCoverPage : true,
            layoutStyle: parsed.layoutStyle || 'executive-sidebar',
            theme: {
              ...initialCVData.theme,
              ...(parsed.theme || {})
            },
            personalInfo: { 
              ...initialCVData.personalInfo, 
              ...(parsed.personalInfo || {}),
              profilePhoto: (parsed.personalInfo?.profilePhoto && parsed.personalInfo.profilePhoto.trim() !== '') 
                ? parsed.personalInfo.profilePhoto 
                : initialCVData.personalInfo.profilePhoto
            },
            roles: Array.isArray(parsed.roles) ? parsed.roles : initialCVData.roles,
            education: Array.isArray(parsed.education) ? parsed.education : initialCVData.education,
            profession: Array.isArray(parsed.profession) ? parsed.profession : initialCVData.profession,
            experience: (Array.isArray(parsed.experience) && parsed.experience.length > 0) ? parsed.experience : initialCVData.experience,
            coursesAndCertificates: Array.isArray(parsed.coursesAndCertificates) ? parsed.coursesAndCertificates : initialCVData.coursesAndCertificates,
            certificatesScanned: Array.isArray(parsed.certificatesScanned) ? parsed.certificatesScanned : [],
            informatics: Array.isArray(parsed.informatics) ? parsed.informatics : initialCVData.informatics,
            ecology: (parsed.ecology && typeof parsed.ecology === 'object') ? { ...initialCVData.ecology, ...parsed.ecology } : initialCVData.ecology,
            signature: {
              ...initialCVData.signature,
              ...(parsed.signature || {}),
              dataUrl: (parsed.signature?.dataUrl && parsed.signature.dataUrl.trim() !== '') 
                ? parsed.signature.dataUrl 
                : initialCVData.signature.dataUrl
            },
            certificateDisplay: {
              ...initialCVData.certificateDisplay,
              ...(parsed.certificateDisplay || {})
            }
          };
        }
      } catch {
        return initialCVData;
      }
    }
    return initialCVData;
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
    localStorage.setItem('cv_premium_data', JSON.stringify(cvData));
  }, [cvData]);

  // Direct 1-Click Bulletproof Page-by-Page A4 PDF Generator
  const handlePrint = async () => {
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

  const handleLoadExampleCV = () => {
    setCvData(standardExampleCVData);
    localStorage.setItem('cv_premium_data', JSON.stringify(standardExampleCVData));
  };

  const handleOpenSavedCVs = () => {
    setIsPanelOpen(true);
    setActiveTab('guardados');
    setIsSavedCVsOpen(true);
  };

  const handleSaveCV = async () => {
    setIsSaving(true);
    try {
      const record = await saveCV(cvData);
      setIsPanelOpen(true);
      setActiveTab('guardados');
      alert(`CV guardado en el panel lateral como:\n"${record.title}"`);
    } catch (err) {
      console.error(err);
      alert('Error al guardar CV');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartNewCVWizard = () => {
    if (window.confirm('¿Deseas iniciar la creación de un NUEVO CV? Se iniciará una plantilla limpia en el panel lateral.')) {
      const newCVTemplate = {
        ...initialCVData,
        id: `cv_${Date.now()}`,
        personalInfo: {
          ...initialCVData.personalInfo,
          fullName: "",
          surname: "",
          givenNames: "",
          dni: "",
          cuit: "",
          birthDate: "",
          address: "",
          cityProvince: "",
          phone: "",
          email: "",
          profilePhoto: "",
          quote: "",
          initials: "CV",
          year: new Date().getFullYear().toString()
        },
        certificatesScanned: []
      };

      setCvData(newCVTemplate);
      localStorage.setItem('cv_premium_data', JSON.stringify(newCVTemplate));
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
