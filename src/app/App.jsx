import React, { useState, useEffect, lazy, Suspense } from 'react';
import Navbar from '../modules/cv-builder/components/Navbar';
import SecondaryNavbar from '../modules/cv-builder/components/SecondaryNavbar';
import EditorPanel from '../modules/cv-builder/components/EditorPanel';
import CVPreview from '../modules/cv-builder/components/CVPreview';

import { getCurrentProfile } from '../modules/auth/authService';
import { initialCVData, standardExampleCVData, blankCVTemplate } from '../data/initialCVData';
import { exportCVToPDF } from '../shared/core/pdf-engine/pdfExporter';
import { exportCVToJson, importCVFromJsonFile } from '../shared/core/utils/jsonImporterExporter';
import { saveCV } from '../modules/cv-builder/services/cvStorageService';

// Lazy-loaded Modals for Code-Splitting
const PhotoCropperModal = lazy(() => import('../modules/cv-builder/components/PhotoCropperModal'));
const SignatureModal = lazy(() => import('../modules/cv-builder/components/SignatureModal'));
const WizardModal = lazy(() => import('../modules/cv-builder/components/WizardModal'));
const SavedCVsModal = lazy(() => import('../modules/cv-builder/components/SavedCVsModal'));
const CloudStatusModal = lazy(() => import('../modules/cv-builder/components/CloudStatusModal'));
const PricingModal = lazy(() => import('../modules/payments/PricingModal'));
const PdfCheckoutModal = lazy(() => import('../modules/cv-builder/components/modals/PdfCheckoutModal'));
const JsonDownloadModal = lazy(() => import('../modules/cv-builder/components/modals/JsonDownloadModal'));
const PdfProgressModal = lazy(() => import('../modules/cv-builder/components/modals/PdfProgressModal'));

import { CVProvider, useCVContext } from '../context/CVContext';

function AppContent() {
  const { cvData, setCvData, resetToBlankCV, loadCVData, saveCV } = useCVContext();
  const [currentProfile, setCurrentProfile] = useState(null);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  useEffect(() => {
    getCurrentProfile().then(p => setCurrentProfile(p)).catch(() => {});
  }, []);

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
  const [isPdfComplete, setIsPdfComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isPdfCheckoutOpen, setIsPdfCheckoutOpen] = useState(false);

  // Direct 1-Click Bulletproof Page-by-Page A4 PDF Generator
  const triggerPdfGeneration = async () => {
    setIsPdfCheckoutOpen(false);
    setIsGeneratingPDF(true);
    setIsPdfComplete(false);
    setPdfProgress(20);

    try {
      setPdfProgress(40);
      exportCVToJson(cvData);

      setPdfProgress(60);
      const success = await exportCVToPDF(cvData);
      
      setPdfProgress(100);
      if (success) {
        setIsGeneratingPDF(false);
        setIsPdfComplete(true);
      } else {
        alert('Hubo un inconveniente al generar el PDF. Por favor verifica las imágenes o intenta nuevamente.');
        setIsGeneratingPDF(false);
      }
    } catch (err) {
      console.error('Error generando PDF:', err);
      alert('Error inesperado al exportar PDF. Tus datos se mantienen a salvo en pantalla.');
      setIsGeneratingPDF(false);
    }
  };

  const handleExportPDFClick = () => {
    if (cvData.id === 'cv_ejemplo_estandar') {
      alert('Para crear presiona, el botón, "Nuevo"');
      return;
    }
    setIsPdfCheckoutOpen(true);
  };

  const handleSaveCVClick = async () => {
    if (cvData.id === 'cv_ejemplo_estandar') {
      alert('Para crear presiona, el botón, "Nuevo"');
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveCV(cvData);
      if (res.success) {
        alert(`✅ ¡CV guardado con éxito!\n\n📌 Título: "${res.title}"\n💾 Guardado en tu almacenamiento local e IndexedDB.`);
      } else {
        alert('Hubo un inconveniente al guardar. Tus datos ingresados se mantienen intactos en pantalla.');
      }
    } catch (err) {
      console.error(err);
      alert('Inconveniente al guardar CV. Tus datos ingresados se mantienen intactos en la pantalla.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewCV = () => {
    if (window.confirm('¿Deseas iniciar un nuevo currículum en blanco? Se conservará tu borrador actual en guardados.')) {
      resetToBlankCV();
      setActiveTab('personales');
    }
  };

  const handleImportJsonFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      importCVFromJsonFile(file, (importedData) => {
        if (importedData) {
          setCvData(importedData);
          alert('¡Currículum cargado exitosamente desde tu archivo .JSON!');
        } else {
          alert('El archivo seleccionado no tiene un formato válido de LEECV.');
        }
      });
    }
  };

  const handleConfirmDownloadJson = () => {
    exportCVToJson(cvData);
    setIsDownloadModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#2B1B2E] text-white flex flex-col font-sans overflow-x-hidden selection:bg-[#FF2E63] selection:text-white">
      {/* Primary Top Navbar */}
      <Navbar 
        onPrint={handleExportPDFClick} 
        onOpenPhotoCropper={() => setIsPhotoCropperOpen(true)}
        onOpenSignature={() => setIsSignatureOpen(true)}
        onOpenWizard={() => setIsWizardOpen(true)}
        onOpenSavedCVs={() => setIsSavedCVsOpen(true)}
        onOpenCloudStatus={() => setIsCloudModalOpen(true)}
        onOpenPricing={() => setIsPricingModalOpen(true)}
        onOpenDownloadJson={() => setIsDownloadModalOpen(true)}
        onNewCV={handleNewCV}
        onSaveCV={handleSaveCVClick}
        onImportJson={handleImportJsonFile}
        isSaving={isSaving}
        cvData={cvData}
      />

      {/* Secondary Category Navbar */}
      <SecondaryNavbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isPanelOpen={isPanelOpen}
        setIsPanelOpen={setIsPanelOpen}
      />

      {/* Main Workspace split into Editor Form (Left) and A4 Live Preview (Right) */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Sliding Editor Panel Drawer */}
        <div 
          className={`transition-all duration-300 ease-in-out border-r border-[#6B5B6E]/30 bg-[#F5EDDA] z-10 flex flex-col ${
            isPanelOpen ? 'w-full md:w-[480px] lg:w-[540px] opacity-100' : 'w-0 opacity-0 overflow-hidden'
          }`}
        >
          <EditorPanel 
            cvData={cvData} 
            setCvData={setCvData} 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenPhotoCropper={() => setIsPhotoCropperOpen(true)}
            onOpenSignature={() => setIsSignatureOpen(true)}
          />
        </div>

        {/* Live A4 CV Preview Area */}
        <div className="flex-1 bg-[#2B1B2E] overflow-y-auto p-4 md:p-8 flex justify-center items-start">
          <CVPreview cvData={cvData} />
        </div>
      </main>

      {/* Lazy Loaded Modals wrapped in Suspense */}
      <Suspense fallback={null}>
        {isPricingModalOpen && (
          <PricingModal 
            isOpen={isPricingModalOpen} 
            onClose={() => setIsPricingModalOpen(false)}
            currentProfile={currentProfile}
          />
        )}

        {isPhotoCropperOpen && (
          <PhotoCropperModal 
            isOpen={isPhotoCropperOpen}
            onClose={() => setIsPhotoCropperOpen(false)}
            currentPhoto={cvData.personalInfo.profilePhoto}
            onSave={(croppedUrl) => {
              setCvData(prev => ({
                ...prev,
                personalInfo: { ...prev.personalInfo, profilePhoto: croppedUrl }
              }));
              setIsPhotoCropperOpen(false);
            }}
          />
        )}

        {isSignatureOpen && (
          <SignatureModal 
            isOpen={isSignatureOpen}
            onClose={() => setIsSignatureOpen(false)}
            signature={cvData.signature}
            onSave={(sigData) => {
              setCvData(prev => ({
                ...prev,
                signature: sigData
              }));
              setIsSignatureOpen(false);
            }}
          />
        )}

        {isWizardOpen && (
          <WizardModal 
            isOpen={isWizardOpen}
            onClose={() => setIsWizardOpen(false)}
            onComplete={(wizardData) => {
              setCvData(prev => ({ ...prev, ...wizardData }));
              setIsWizardOpen(false);
            }}
          />
        )}

        {isSavedCVsOpen && (
          <SavedCVsModal 
            isOpen={isSavedCVsOpen}
            onClose={() => setIsSavedCVsOpen(false)}
            onSelectCV={(selectedCV) => {
              setCvData(selectedCV);
              setIsSavedCVsOpen(false);
            }}
            onImportJson={handleImportJsonFile}
          />
        )}

        {isCloudModalOpen && (
          <CloudStatusModal 
            isOpen={isCloudModalOpen}
            onClose={() => setIsCloudModalOpen(false)}
            onUpgrade={() => {
              setIsCloudModalOpen(false);
              setIsPricingModalOpen(true);
            }}
          />
        )}

        {isPdfCheckoutOpen && (
          <PdfCheckoutModal 
            isOpen={isPdfCheckoutOpen}
            onClose={() => setIsPdfCheckoutOpen(false)}
            onConfirm={triggerPdfGeneration}
          />
        )}

        {isDownloadModalOpen && (
          <JsonDownloadModal 
            isOpen={isDownloadModalOpen}
            onClose={() => setIsDownloadModalOpen(false)}
            cvData={cvData}
          />
        )}

        {(isGeneratingPDF || isPdfComplete) && (
          <PdfProgressModal 
            isGenerating={isGeneratingPDF}
            isComplete={isPdfComplete}
            onClose={() => setIsPdfComplete(false)}
          />
        )}
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <CVProvider>
      <AppContent />
    </CVProvider>
  );
}
