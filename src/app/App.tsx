import React, { useState, useEffect, lazy, Suspense } from 'react';
import Navbar from '../modules/cv-builder/components/Navbar';
import CanvaIconDock from '../modules/cv-builder/components/CanvaIconDock';
import EditorPanel from '../modules/cv-builder/components/EditorPanel';
const CVPreview = lazy(() => import('../modules/cv-builder/components/CVPreview'));
import { ZoomIn, ZoomOut, Smartphone, FileText, CreditCard, Palette, Sun, Moon } from 'lucide-react';

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
import { getActiveUiTheme } from '../shared/core/uiDesignSystem';

function AppContent() {
  const { cvData, setCvData, resetToBlankCV, saveCV } = useCVContext();
  const { showSuccess, showError, showInfo } = useToast();
  const { confirm } = useConfirm();
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const [isPublicView, setIsPublicView] = useState(false);
  const [publicSlug, setPublicSlug] = useState<string | undefined>(undefined);

  const activeUiTheme = getActiveUiTheme(cvData?.uiTheme);

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
      const sidebarWidth = isMobile ? 0 : (isPanelOpen ? 500 : 64);
      const availableWidth = window.innerWidth - sidebarWidth - 32;
      const a4WidthPx = 794;
      
      const calculatedScale = Math.min(Math.max(availableWidth / a4WidthPx, 0.35), 1.0);
      setZoomLevel(Number(calculatedScale.toFixed(2)));
    }
  }, [isPanelOpen]);

  useEffect(() => {
    triggerAutoFit();
    const timer = setTimeout(triggerAutoFit, 350);
    const handleResize = () => triggerAutoFit();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [isPanelOpen, triggerAutoFit]);

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

  const cycleUITheme = () => {
    const current = cvData?.uiTheme || 'default';
    const nextTheme = current === 'default' ? 'dark' : current === 'dark' ? 'teal_ocean' : 'default';
    setCvData((prev: any) => ({ ...prev, uiTheme: nextTheme }));
    const labels: Record<string, string> = {
      default: '☀️ Editorial Warm (Cálido)',
      dark: '🌙 Cyber Dark (Nocturno)',
      teal_ocean: '🌊 Midnight Ocean (Teal)'
    };
    showInfo(`Fondo de Interfaz: ${labels[nextTheme]}`);
  };

  const toggleDocumentPresetMode = () => {
    const isCard = cvData?.activePresetId === 'tarjeta-personal';
    const nextId = isCard ? 'cv-clasico' : 'tarjeta-personal';
    setCvData((prev: any) => ({ ...prev, activePresetId: nextId }));
    showInfo(isCard ? 'Vista cambiada a: Currículum Vitae A4 📄' : 'Vista cambiada a: Tarjeta Personal 📇');
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
      <div className="md:pl-16">
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
      </div>

      <main className="flex-1 flex overflow-hidden relative min-h-0 md:pl-16">
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
          style={{ backgroundColor: activeUiTheme.bgPanel, color: activeUiTheme.textPrimary }}
          className={`transition-all duration-300 ease-in-out border-r border-[#6B5B6E]/30 z-20 flex flex-col h-full overflow-y-auto ${
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

      {/* Barra de Estado Inferior Reorganizada (Zoom, Modo CV/Tarjeta y Switcher de Tema) */}
      <footer className="hidden md:flex bg-[#1C121E] text-slate-300 border-t border-[#EFE2C9]/10 py-2 px-4 md:pl-20 items-center justify-between no-print z-30 shadow-2xl select-none text-xs">
        {/* Izquierda: Alternador CV vs Tarjeta Personal */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDocumentPresetMode}
            className="px-3 py-1 rounded-xl bg-[#2B1B2E] border border-purple-500/40 hover:border-[#FF2E63] text-purple-200 hover:text-white font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
            title="Alternar entre modo Currículum Vitae A4 y Tarjeta Personal"
          >
            {cvData?.activePresetId === 'tarjeta-personal' ? (
              <>
                <CreditCard className="w-3.5 h-3.5 text-[#FFC93C]" />
                <span>Vista: Tarjeta Personal 📇</span>
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5 text-[#00A8A0]" />
                <span>Vista: Currículum Vitae 📄</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsPrivacyModalOpen(true)}
            className="text-slate-400 hover:text-white font-bold text-[11px] transition cursor-pointer underline underline-offset-2 ml-2"
          >
            🔒 Privacidad
          </button>
        </div>

        {/* Centro: Controles de Zoom del Visor */}
        <div className="flex items-center gap-1 bg-[#2B1B2E] px-2 py-1 rounded-xl border border-white/10 shadow-inner">
          <button
            onClick={() => setZoomLevel(prev => Math.max(0.3, parseFloat((prev - 0.1).toFixed(2))))}
            className="p-1 rounded-lg hover:bg-[#FF2E63] text-white transition cursor-pointer"
            title="Alejar (-10%)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="px-2 text-[#FFC93C] text-xs font-black min-w-10 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>

          <button
            onClick={() => setZoomLevel(prev => Math.min(2.0, parseFloat((prev + 0.1).toFixed(2))))}
            className="p-1 rounded-lg hover:bg-[#FF2E63] text-white transition cursor-pointer"
            title="Acercar (+10%)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={triggerAutoFit}
            className="px-2 py-0.5 rounded-lg bg-[#00A8A0] hover:bg-[#00877F] text-white text-[10px] font-black transition flex items-center gap-1 shadow-sm cursor-pointer ml-1"
            title="Auto-encajar el diseño al tamaño de pantalla"
          >
            <Smartphone className="w-3 h-3" />
            <span>Encajar</span>
          </button>
        </div>

        {/* Derecha: Botón Interactivo de Cambio de Tema de Interfaz */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cycleUITheme}
            className="px-3 py-1 rounded-xl bg-[#2B1B2E] border border-amber-400/40 hover:border-amber-400 text-amber-300 hover:text-amber-200 font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
            title="Tocar para cambiar el color de fondo de la interfaz (Cálido, Nocturno, Océano)"
          >
            <span>Tema</span>
            <Palette className="w-3.5 h-3.5 text-[#FF2E63]" />
          </button>

          <span className="text-[10px] font-bold text-slate-500">© 2026 LEECV</span>
        </div>
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
