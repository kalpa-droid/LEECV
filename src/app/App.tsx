import React, { useState, useEffect, lazy, Suspense } from 'react';
import Navbar from '../modules/cv-builder/components/Navbar';
import CanvaIconDock from '../modules/cv-builder/components/CanvaIconDock';
import EditorPanel from '../modules/cv-builder/components/EditorPanel';
const CVPreview = lazy(() => import('../modules/cv-builder/components/CVPreview'));
import { ZoomIn, ZoomOut, Smartphone } from 'lucide-react';

import { getCurrentProfile, capturarConexionDriveSiCorresponde } from '../modules/auth/authService';
import { supabase } from '../shared/core/lib/supabaseClient';
import { exportCVToJson, importCVFromJsonFile } from '../shared/core/utils/jsonImporterExporter';

const PublicCVView = lazy(() => import('../modules/cv-builder/components/PublicCVView').then(m => ({ default: m.PublicCVView })));
const CardExportModal = lazy(() => import('../modules/cv-builder/components/modals/CardExportModal').then(m => ({ default: m.CardExportModal })));

// Direct Modals Imports (Prevents dynamic chunk fetch errors on updates)
import PhotoCropperModal from '../modules/cv-builder/components/PhotoCropperModal';
import SignatureModal from '../modules/cv-builder/components/SignatureModal';
import WizardModal from '../modules/cv-builder/components/WizardModal';
import SavedCVsModal from '../modules/cv-builder/components/SavedCVsModal';
import SaveModal from '../modules/cv-builder/components/SaveModal';
import CloudStatusModal from '../modules/cv-builder/components/CloudStatusModal';
import PricingModal from '../modules/payments/PricingModal';
import PdfCheckoutModal from '../modules/cv-builder/components/modals/PdfCheckoutModal';
import JsonDownloadModal from '../modules/cv-builder/components/modals/JsonDownloadModal';
import PdfProgressModal from '../modules/cv-builder/components/modals/PdfProgressModal';
import PrivacyModal from '../modules/cv-builder/components/PrivacyModal';

import { CVProvider, useCVContext } from '../context/CVContext';
import { ToastProvider, useToast } from '../shared/core/ui/Toast';
import { useConfirm, ConfirmProvider } from '../shared/core/ui/ConfirmDialog';

function AppContent() {
  const { cvData, setCvData, resetToBlankCV, saveCV } = useCVContext();
  const { showSuccess, showError, showInfo } = useToast();
  const { confirm } = useConfirm();
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const [isPublicView, setIsPublicView] = useState(false);
  const [publicSlug, setPublicSlug] = useState<string | undefined>(undefined);

  useEffect(() => {
    getCurrentProfile().then(p => setCurrentProfile(p)).catch(() => {});

    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const publicId = params.get('c') || params.get('publicCv') || params.get('share');

      if (pathname.startsWith('/c/') || pathname.startsWith('/cv/')) {
        const slug = pathname.replace('/c/', '').replace('/cv/', '');
        if (slug) {
          setPublicSlug(slug);
          setIsPublicView(true);
        }
      } else if (publicId) {
        setPublicSlug(publicId);
        setIsPublicView(true);
      }
    }

    if (supabase) {
      supabase.auth.getSession()
        .then(({ data: { session } }) => {
          capturarConexionDriveSiCorresponde(session);
        })
        .catch(err => {
          console.warn('Error al obtener sesión de Supabase:', err);
        });
    }
  }, []);

  const [activeTab, setActiveTab] = useState('personales');
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Zoom and Responsive A4 Auto-Fit state
  const [zoomLevel, setZoomLevel] = useState(0.85);

  const triggerAutoFit = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      const sidebarWidth = isMobile ? 0 : (isPanelOpen ? 500 : 0);
      const availableWidth = window.innerWidth - sidebarWidth - 48;
      const a4WidthPx = 794;
      
      const calculatedScale = Math.min(Math.max(availableWidth / a4WidthPx, 0.45), 1.1);
      setZoomLevel(Number(calculatedScale.toFixed(2)));
    }
  }, [isPanelOpen]);

  useEffect(() => {
    triggerAutoFit();
    const handleResize = () => triggerAutoFit();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [triggerAutoFit]);

  const [isPhotoCropperOpen, setIsPhotoCropperOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSavedCVsOpen, setIsSavedCVsOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPdfComplete, setIsPdfComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mobileTabState, setMobileTabState] = useState('editor');

  const [isPdfCheckoutOpen, setIsPdfCheckoutOpen] = useState(false);
  const [isCardExportOpen, setIsCardExportOpen] = useState(false);

  const handleStartPDFGeneration = async () => {
    setIsGeneratingPDF(true);
    setIsPdfComplete(false);
    setPdfProgress(15);

    try {
      const { exportDocumentToPDF } = await import('../shared/core/pdf-engine/pdfExporter');
      const success = await exportDocumentToPDF(cvData, cvData?.activePresetId || 'cv-clasico');
      
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

  const triggerPdfGeneration = handleStartPDFGeneration;

  const handleExportPDFClick = () => {
    if (cvData?.activePresetId === 'tarjeta-personal') {
      setIsCardExportOpen(true);
      return;
    }

    setIsPdfCheckoutOpen(true);
  };

  const handleSaveCVClick = async () => {
    setIsSaving(true);
    try {
      const res = await saveCV();
      if (res?.success) {
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

    confirm({
      title: '¿Iniciar nuevo currículum?',
      message: '¿Deseas iniciar un nuevo currículum en blanco? Se guardará un borrador automático de tu currículum actual.',
      confirmText: 'Sí, crear nuevo',
      onConfirm: async () => {
        try {
          await saveCV();
        } catch (err) {
          console.warn('Error auto-guardando borrador al crear nuevo CV:', err);
        }
        resetToBlankCV();
        setActiveTab('personales');
        showSuccess('Tu borrador anterior ha sido resguardado con éxito. Ahora estás editando un currículum en blanco.');
      }
    });
  };

  const handleImportJsonFile = async (e: any) => {
    const file = e.target?.files?.[0];
    if (file) {
      try {
        const importedData = await importCVFromJsonFile(file);
        if (importedData) {
          if (importedData.id === 'cv_ejemplo_estandar') {
            importedData.id = `cv_${Date.now()}`;
          }
          setCvData(importedData);
          showSuccess('¡Currículum cargado exitosamente desde tu archivo .JSON!');
        } else {
          showError('El archivo seleccionado no tiene un formato válido de LEECV.');
        }
      } catch (err: any) {
        console.error('Error importando JSON:', err);
        showError(err?.message || 'Error al procesar el archivo .JSON seleccionado.');
      }
    }
  };

  if (isPublicView) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-rose-400 font-bold text-xs">
          <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mr-3" />
          <span>Cargando Perfil Público…</span>
        </div>
      }>
        <PublicCVView slugInput={publicSlug} />
      </Suspense>
    );
  }

  return (
    <div className="h-screen bg-[#2B1B2E] text-white flex flex-col font-sans overflow-hidden selection:bg-[#FF2E63] selection:text-white relative">
      <Navbar 
        onPrint={handleExportPDFClick} 
        onStartNewCVWizard={() => setIsWizardOpen(true)}
        onOpenSavedCVs={() => setIsSavedCVsOpen(true)}
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
        onOpenPricing={() => setIsPricingModalOpen(true)}
        onNewCV={handleNewCV}
        onSaveCV={handleSaveCVClick}
        isSaving={isSaving}
      />

      <main className="flex-1 flex overflow-hidden relative min-h-0">
        <CanvaIconDock 
          cvData={cvData}
          setCvData={setCvData}
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setMobileTabState('editor');
            setIsPanelOpen(true);
          }} 
          isPanelOpen={isPanelOpen}
          setIsPanelOpen={setIsPanelOpen}
        />

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
            onOpenSavedCVs={() => setIsSavedCVsOpen(true)}
          />
        </div>

        <div className={`flex-1 bg-[#1F1322] h-full overflow-y-auto p-2 sm:p-4 justify-center items-start relative ${
          mobileTabState === 'editor' && isPanelOpen ? 'hidden md:flex' : 'flex'
        }`}>
          <Suspense fallback={
            <div className="w-full h-[600px] flex flex-col items-center justify-center p-8 text-slate-400">
              <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Cargando Visor Vectorial de Alta Resolución…</span>
            </div>
          }>
            <CVPreview cvData={cvData} setCvData={setCvData} activeTab={activeTab} zoomLevel={zoomLevel} />
          </Suspense>

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
            currentPhoto={cvData?.personalInfo?.profilePhoto || ''}
            onSavePhoto={(croppedUrl: string) => {
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
            currentSignature={cvData?.signature}
            onSaveSignature={(sigData: any) => {
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
            onOpenPhotoCropper={() => setIsPhotoCropperOpen(true)}
            onOpenSignature={() => setIsSignatureOpen(true)}
            cvData={cvData}
            setCvData={setCvData}
          />
        )}

        {isSavedCVsOpen && (
          <SavedCVsModal 
            isOpen={isSavedCVsOpen}
            onClose={() => setIsSavedCVsOpen(false)}
            onSelectCV={(selectedCV: any) => {
              setCvData(selectedCV);
              setIsSavedCVsOpen(false);
            }}
            onImportJson={handleImportJsonFile}
            onOpenCloudStatus={() => setIsCloudModalOpen(true)}
          />
        )}

        {isSaveModalOpen && (
          <SaveModal
            isOpen={isSaveModalOpen}
            onClose={() => setIsSaveModalOpen(false)}
            onSaveStorage={handleSaveCVClick}
            onExportJson={() => exportCVToJson(cvData)}
            onOpenCloudStatus={() => setIsCloudModalOpen(true)}
            isSaving={isSaving}
          />
        )}

        {isCloudModalOpen && (
          <CloudStatusModal 
            isOpen={isCloudModalOpen}
            onClose={() => setIsCloudModalOpen(false)}
            onForceSave={handleSaveCVClick}
            isSaving={isSaving}
            cvData={cvData}
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

        {isCardExportOpen && (
          <Suspense fallback={null}>
            <CardExportModal
              isOpen={isCardExportOpen}
              onClose={() => setIsCardExportOpen(false)}
              cvData={cvData}
              presetId={cvData?.activePresetId || 'tarjeta-personal'}
            />
          </Suspense>
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
