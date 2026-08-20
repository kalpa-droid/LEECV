import React, { useState, useEffect, lazy, Suspense } from 'react';
import Navbar from '../modules/cv-builder/components/Navbar';
import CanvaIconDock from '../modules/cv-builder/components/CanvaIconDock';
import EditorPanel from '../modules/cv-builder/components/EditorPanel';
import CVPreview from '../modules/cv-builder/components/CVPreview';
import { ZoomIn, ZoomOut, Smartphone } from 'lucide-react';

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
const PrivacyModal = lazy(() => import('../modules/cv-builder/components/PrivacyModal'));

import { CVProvider, useCVContext } from '../context/CVContext';
import { ToastProvider, useToast } from '../shared/core/ui/Toast';
import { useConfirm } from '../shared/core/ui/ConfirmDialog';

function AppContent() {
  const { cvData, setCvData, resetToBlankCV, loadCVData, saveCV } = useCVContext();
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const { confirm } = useConfirm();
  const [currentProfile, setCurrentProfile] = useState(null);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  useEffect(() => {
    getCurrentProfile().then(p => setCurrentProfile(p)).catch(() => {});

    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        capturarConexionDriveSiCorresponde(session);
      });
    }
  }, []);

  const [activeTab, setActiveTab] = useState('personales');
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Zoom and Responsive A4 Auto-Fit state
  const [zoomLevel, setZoomLevel] = useState(0.85);

  const triggerAutoFit = () => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      const sidebarWidth = isMobile ? 0 : (isPanelOpen ? 500 : 0);
      const availableWidth = window.innerWidth - sidebarWidth - 48; // padding margin
      const a4WidthPx = 794; // 210mm in px at 96 DPI
      
      const calculatedScale = Math.min(Math.max(availableWidth / a4WidthPx, 0.45), 1.1);
      setZoomLevel(Number(calculatedScale.toFixed(2)));
    }
  };

  useEffect(() => {
    triggerAutoFit();
    const handleResize = () => triggerAutoFit();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isPanelOpen]);

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
  const handleStartPDFGeneration = async () => {
    setIsPdfCheckoutOpen(false);
    setIsGeneratingPDF(true);
    setPdfProgress(10);
    setIsPdfComplete(false);

    try {
      setPdfProgress(40);
      const success = await exportCVToPDF(cvData);
      
      setPdfProgress(100);
      if (success) {
        setIsGeneratingPDF(false);
        setIsPdfComplete(true);
      } else {
        showError('Hubo un inconveniente al generar el PDF. Por favor verifica las imágenes o intenta nuevamente.');
        setIsGeneratingPDF(false);
      }
    } catch (err) {
      console.error('Error generando PDF:', err);
      showError('Error inesperado al exportar PDF. Tus datos se mantienen a salvo en pantalla.');
      setIsGeneratingPDF(false);
    }
  };

  const handleExportPDFClick = () => {
    if (cvData.id === 'cv_ejemplo_estandar') {
      showInfo('Para comenzar a crear tu propio currículum, presiona el botón "+ Nuevo"');
      return;
    }
    setIsPdfCheckoutOpen(true);
  };

  const handleSaveCVClick = async () => {
    if (cvData.id === 'cv_ejemplo_estandar') {
      showInfo('Para comenzar a crear tu propio currículum, presiona el botón "+ Nuevo"');
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveCV(cvData);
      if (res.success) {
        showSuccess(`¡CV guardado con éxito! 📌 Título: "${res.title}"`);
      } else {
        showError('Hubo un inconveniente al guardar. Tus datos ingresados se mantienen intactos.');
      }
    } catch (err) {
      console.error(err);
      showError('Inconveniente al guardar CV. Tus datos ingresados se mantienen intactos.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewCV = async () => {
    if (cvData.id === 'cv_ejemplo_estandar') {
      resetToBlankCV();
      setActiveTab('personales');
      return;
    }

    confirm({
      title: '¿Iniciar nuevo currículum?',
      message: '¿Deseas iniciar un nuevo currículum en blanco? Se guardará un borrador automático de tu currículum actual.',
      confirmText: 'Sí, crear nuevo',
      onConfirm: async () => {
        try {
          await saveCV(cvData);
        } catch (err) {
          console.warn('Error auto-guardando borrador al crear nuevo CV:', err);
        }
        resetToBlankCV();
        setActiveTab('personales');
        showSuccess('Tu borrador anterior ha sido resguardado con éxito. Ahora estás editando un currículum en blanco.');
      }
    });
  };

  const handleImportJsonFile = async (e) => {
    const file = e.target?.files?.[0];
    if (file) {
      try {
        const importedData = await importCVFromJsonFile(file);
        if (importedData) {
          // Automatic exit from sample mode if imported CV contains example ID
          if (importedData.id === 'cv_ejemplo_estandar') {
            importedData.id = `cv_${Date.now()}`;
          }
          setCvData(importedData);
          showSuccess('¡Currículum cargado exitosamente desde tu archivo .JSON!');
        } else {
          showError('El archivo seleccionado no tiene un formato válido de LEECV.');
        }
      } catch (err) {
        console.error('Error importando JSON:', err);
        showError(err.message || 'Error al procesar el archivo .JSON seleccionado.');
      }
    }
  };

  const handleConfirmDownloadJson = () => {
    exportCVToJson(cvData);
    setIsDownloadModalOpen(false);
  };

  const [mobileTabState, setMobileTabState] = useState('editor');

  return (
    <div className="h-screen bg-[#2B1B2E] text-white flex flex-col font-sans overflow-hidden selection:bg-[#FF2E63] selection:text-white relative">
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

      {/* Canva-Style Main Workspace */}
      <main className="flex-1 flex overflow-hidden relative min-h-0">
        {/* Left Canva Icon Tool Dock */}
        <CanvaIconDock 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setMobileTabState('editor');
            setIsPanelOpen(true);
          }} 
          isPanelOpen={isPanelOpen}
          setIsPanelOpen={setIsPanelOpen}
        />

        {/* Sliding Editor Panel Flyout Drawer */}
        <div 
          className={`transition-all duration-300 ease-in-out border-r border-[#6B5B6E]/30 bg-[#F5EDDA] z-20 flex flex-col h-full overflow-y-auto ${
            isPanelOpen 
              ? 'w-full md:w-[460px] lg:w-[500px] opacity-100 shadow-2xl' 
              : 'w-0 opacity-0 overflow-hidden hidden md:block'
          } ${mobileTabState === 'preview' ? 'hidden md:flex' : 'flex'}`}
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

        {/* Live A4 CV Preview Canvas Area (Direct paper background) */}
        <div className={`flex-1 bg-[#1F1322] h-full overflow-y-auto p-2 sm:p-4 justify-center items-start relative ${
          mobileTabState === 'editor' && isPanelOpen ? 'hidden md:flex' : 'flex'
        }`}>
          <CVPreview cvData={cvData} activeTab={activeTab} zoomLevel={zoomLevel} />

          {/* Sleek Floating Zoom & Auto-Fit Cluster Pill */}
          <div className="fixed bottom-16 md:bottom-5 right-5 z-30 bg-[#2B1B2E]/90 backdrop-blur-md text-white p-1 rounded-2xl border border-white/20 shadow-2xl flex items-center gap-1 text-xs font-black">
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.3, parseFloat((prev - 0.1).toFixed(2))))}
              className="p-1.5 rounded-xl hover:bg-[#FF2E63] text-white transition cursor-pointer"
              title="Alejar (-10%)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <span className="px-2 text-[#FFC93C] text-xs min-w-10 text-center font-black">
              {Math.round(zoomLevel * 100)}%
            </span>

            <button
              onClick={() => setZoomLevel(prev => Math.min(2.0, parseFloat((prev + 0.1).toFixed(2))))}
              className="p-1.5 rounded-xl hover:bg-[#FF2E63] text-white transition cursor-pointer"
              title="Acercar (+10%)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={triggerAutoFit}
              className="px-2.5 py-1 rounded-xl bg-[#00A8A0] hover:bg-[#00877F] text-white text-[11px] font-black transition flex items-center gap-1 shadow-sm cursor-pointer ml-1"
              title="Auto-encajar el diseño A4 al tamaño de pantalla"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Encajar</span>
            </button>
          </div>
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
            currentProfile={currentProfile}
            onOpenPricing={() => setIsPricingModalOpen(true)}
            onExportJson={() => exportCVToJson(cvData)}
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

        {isPrivacyModalOpen && (
          <PrivacyModal
            isOpen={isPrivacyModalOpen}
            onClose={() => setIsPrivacyModalOpen(false)}
          />
        )}
      </Suspense>

      {/* Footer Legal Link */}
      <footer className="bg-[#1C121E] text-slate-400 border-t border-[#EFE2C9]/10 py-3 px-6 text-center text-xs no-print flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500">© 2026 LEECV — Diseñado para Profesionales y Agencias</span>
        <button
          onClick={() => setIsPrivacyModalOpen(true)}
          className="text-purple-300 hover:text-white font-extrabold text-[11px] transition cursor-pointer underline underline-offset-2"
        >
          🔒 Política de Privacidad & Términos de Servicio
        </button>
      </footer>
    </div>
  );
}

import { ConfirmProvider } from '../shared/core/ui/ConfirmDialog';

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <CVProvider>
          <AppContent />
        </CVProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
