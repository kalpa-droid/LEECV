import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import Navbar from '../modules/cv-builder/components/Navbar';
import CanvaIconDock from '../modules/cv-builder/components/CanvaIconDock';
import EditorPanel from '../modules/cv-builder/components/EditorPanel';
const CVPreview = lazy(() => import('../modules/cv-builder/components/CVPreview'));
import { FileText, CreditCard, Palette, Plus, X, Sparkles } from 'lucide-react';
import { getOpenTabs, addOpenTab, removeOpenTab, OpenTabItem } from '../shared/core/storage/documentTabEngine';

import { getCurrentProfile, capturarConexionDriveSiCorresponde } from '../modules/auth/authService';
import { supabase } from '../shared/core/lib/supabaseClient';
import { exportCVToJson, importCVFromJsonFile } from '../shared/core/utils/jsonImporterExporter';
import { withErrorHandling } from '../shared/core/utils/errorHandler';
import { applyUiTheme, getNextUiTheme, elevationSystem, radius } from '../shared/core/uiDesignSystem';

const PublicCVView = lazy(() => import('../modules/cv-builder/components/PublicCVView').then(m => ({ default: m.PublicCVView })));
const CardExportModal = lazy(() => import('../modules/cv-builder/components/modals/CardExportModal').then(m => ({ default: m.CardExportModal })));

// Direct Modals Imports (Prevents dynamic chunk fetch errors on updates)
import PhotoCropperModal from '../modules/cv-builder/components/PhotoCropperModal';
import SignatureModal from '../modules/cv-builder/components/SignatureModal';
import WizardModal from '../modules/cv-builder/components/WizardModal';
import SavedCVsModal from '../modules/cv-builder/components/SavedCVsModal';
import { ZoomControls } from '../shared/core/ui/ZoomControls';
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

import { syncPresetsFromStorage, getPreset, resolveActivePreset } from '../shared/core/pdf-engine/layers/presets/presetRegistry';
import { cvDataToContentSections } from '../shared/core/pdf-engine/layers/records/cvDataAdapter';
import { runAtsPreflightCheck, AtsPreflightResult } from '../shared/core/pdf-engine/layers/ats/atsPreflightCheck';
import { AtsCheckModal } from '../modules/cv-builder/components/AtsCheckModal';
import { navigation } from '../shared/core/utils/navigation';

import EmailSaveModal from '../modules/cv-builder/components/modals/EmailSaveModal';
import ShareAppModal from '../modules/cv-builder/components/modals/ShareAppModal';
import { loadCVById, saveCV } from '../shared/core/storage/documentStorageService';
import { runWithSafeSave } from '../shared/core/storage/safeNavigationEngine';
import { signInWithGoogle, logout } from '../modules/auth/authService';

function AppContent() {
  const { cvData, setCvData, resetToBlankCV, saveCV, saveCVAs } = useCVContext();
  const { showSuccess, showError, showInfo } = useToast();
  const { confirm } = useConfirm();
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const [isPublicView, setIsPublicView] = useState(false);
  const [publicSlug, setPublicSlug] = useState<string | undefined>(undefined);

  const currentUiThemeId = cvData?.uiTheme || 'day';

  // Aplicación unificada e instantánea del tema de interfaz
  useEffect(() => {
    if (typeof window !== 'undefined') {
      applyUiTheme(currentUiThemeId);
    }
  }, [currentUiThemeId]);

  useEffect(() => {
    syncPresetsFromStorage().catch(err => console.warn('Error sincronizando presets iniciales:', err));
    getCurrentProfile().then(p => setCurrentProfile(p)).catch(() => {});

    if (typeof window !== 'undefined') {
      const pathname = navigation.getPathname();
      const params = navigation.getSearchParams();
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

  // Resetea activeTab a 'personales' cuando se abre o cambia a un documento distinto (cvData.id cambia)
  const prevCvIdRef = useRef(cvData?.id);
  useEffect(() => {
    if (cvData?.id && prevCvIdRef.current && prevCvIdRef.current !== cvData.id) {
      setActiveTab('personales');
    }
    prevCvIdRef.current = cvData?.id;
  }, [cvData?.id]);

  const handleSwitchDocumentTab = async (targetCvId: string) => {
    if (!targetCvId || targetCvId === cvData?.id) return;

    await runWithSafeSave(
      saveCV,
      async () => {
        try {
          const loaded = await loadCVById(targetCvId);
          if (loaded) {
            setCvData(loaded);
            showSuccess(`Conmutado a "${loaded.title || 'Documento'}"`);
          } else {
            showError('No se pudo cargar el documento de la pestaña seleccionada.');
          }
        } catch (err) {
          console.error('Error al conmutar pestaña de documento:', err);
          showError('Error al abrir la pestaña de documento.');
        }
      }
    );
  };
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
  const [initialSaveAsOpen, setInitialSaveAsOpen] = useState(false);
  const [isEmailSaveModalOpen, setIsEmailSaveModalOpen] = useState(false);
  const [isShareAppModalOpen, setIsShareAppModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [, setPdfProgress] = useState(0);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPdfComplete, setIsPdfComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mobileTabState, setMobileTabState] = useState('editor');

  const [isPdfCheckoutOpen, setIsPdfCheckoutOpen] = useState(false);
  const [isCardExportOpen, setIsCardExportOpen] = useState(false);
  const [isAtsModalOpen, setIsAtsModalOpen] = useState(false);
  const [atsResult, setAtsResult] = useState<AtsPreflightResult | null>(null);

  const [tabs, setTabs] = useState<OpenTabItem[]>([]);
  const activeCvId = cvData?.id || '';

  useEffect(() => {
    if (activeCvId) {
      const updated = addOpenTab(
        activeCvId,
        cvData?.title || 'Mi Currículum Vitae',
        cvData?.version_label
      );
      setTabs(updated);
    } else {
      setTabs(getOpenTabs());
    }
  }, [activeCvId, cvData?.title, cvData?.version_label]);

  const handleCloseFooterTab = (e: React.MouseEvent, cvId: string, title: string) => {
    e.stopPropagation();
    confirm({
      title: '¿Cerrar pestaña?',
      message: `¿Deseas cerrar "${title}"? Tus datos guardados se mantendrán a salvo en tus archivos.`,
      confirmText: 'Cerrar Pestaña',
      onConfirm: async () => {
        const remaining = removeOpenTab(cvId);
        setTabs(remaining);

        if (cvId === activeCvId) {
          if (remaining.length > 0) {
            const lastTab = remaining[remaining.length - 1];
            await handleSwitchDocumentTab(lastTab.cvId);
          } else {
            handleNewCV();
          }
        }
      }
    });
  };

  // Protección ante cierre accidental del navegador
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (cvData) {
        e.preventDefault();
        e.returnValue = '¿Deseas salir de la página? Asegúrate de que tus datos estén guardados.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cvData]);

  const handleAuthToggle = async () => {
    if (currentProfile) {
      await logout();
      setCurrentProfile(null);
      showSuccess('Sesión cerrada correctamente.');
    } else {
      // Proteger todos los datos y pestañas abiertas antes del redireccionamiento OAuth
      try {
        if (cvData) await saveCV();
      } catch {}
      await signInWithGoogle();
    }
  };

  const handleOpenAtsCheck = () => {
    const preset = resolveActivePreset(cvData);
    const sections = cvDataToContentSections(cvData);
    const res = runAtsPreflightCheck(preset, sections, cvData?.personalInfo);
    setAtsResult(res);
    setIsAtsModalOpen(true);
  };

  const handleExportAtsPdf = async () => {
    setIsGeneratingPDF(true);
    setIsPdfComplete(false);
    setPdfProgress(15);

    const result = await withErrorHandling(
      async () => {
        const { exportDocumentToPDF } = await import('../shared/core/pdf-engine/pdfExporter');
        return exportDocumentToPDF(cvData, resolveActivePreset(cvData), true);
      },
      {
        context: 'Exportar PDF ATS',
        errorMessage: 'Hubo un inconveniente al generar el PDF ATS.',
        notify: (msg) => showError(msg)
      }
    );

    if (result.success && result.data) {
      setPdfProgress(100);
      setIsGeneratingPDF(false);
      setIsPdfComplete(true);
      showSuccess('Versión ATS de 1 columna generada exitosamente.');
    } else {
      setIsGeneratingPDF(false);
    }
  };

  const handleStartPDFGeneration = async () => {
    setIsGeneratingPDF(true);
    setIsPdfComplete(false);
    setPdfProgress(15);

    try {
      const { exportDocumentToPDF } = await import('../shared/core/pdf-engine/pdfExporter');
      const success = await exportDocumentToPDF(cvData, resolveActivePreset(cvData));
      
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
    const nextTheme = getNextUiTheme(current);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-ui-theme', nextTheme);
    }
    setCvData((prev: any) => ({ ...prev, uiTheme: nextTheme }));
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-ui-theme', cvData?.uiTheme || 'default');
    }
  }, [cvData?.uiTheme]);

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

  const handleSaveCVAsClick = async (versionLabel: string) => {
    setIsSaving(true);
    try {
      const res = await saveCVAs(versionLabel);
      if (res?.success) {
        showSuccess(`¡Nueva versión guardada! 📌 Título: "${res.title || versionLabel}"`);
      } else {
        showError('Hubo un inconveniente al crear la nueva versión.');
      }
    } catch (err) {
      console.error(err);
      showError('Error al crear la nueva versión del documento.');
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
        await runWithSafeSave(
          saveCV,
          () => {
            resetToBlankCV();
            setActiveTab('personales');
            showSuccess('Tu borrador anterior ha sido resguardado con éxito. Ahora estás editando un currículum en blanco.');
          }
        );
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
        <div className="min-h-screen bg-black flex items-center justify-center text-[var(--color-accent-base)] font-bold text-xs">
          <div className="w-8 h-8 border-4 border-[var(--color-accent-base)] border-t-transparent rounded-full animate-spin mr-3" />
          <span>Cargando Perfil Público…</span>
        </div>
      }>
        <PublicCVView slugInput={publicSlug} />
      </Suspense>
    );
  }

  return (
    <div className="h-screen bg-[var(--color-neutral-text-primary)] text-white flex flex-col font-sans overflow-hidden selection:bg-[var(--color-accent-base)] selection:text-white relative">
      <div className="md:pl-16">
        <Navbar 
          currentCvData={cvData}
          setCvData={setCvData}
          onOpenSavedCVsModal={() => setIsSavedCVsOpen(true)}
          onSaveCVClick={handleSaveCVClick}
          onOpenSaveAsModal={() => {
            setInitialSaveAsOpen(true);
            setIsSaveModalOpen(true);
          }}
          onOpenJsonDownloadModal={() => setIsDownloadModalOpen(true)}
          onPrint={handleExportPDFClick}
          onOpenAtsCheck={handleOpenAtsCheck}
          onOpenPricing={() => setIsPricingModalOpen(true)}
          onOpenShareAppModal={() => setIsShareAppModalOpen(true)}
          onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
          onAuthToggle={handleAuthToggle}
          isLoggedIn={!!currentProfile}
          userRole={currentProfile?.role || 'candidate'}
          isSaving={isSaving}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          triggerAutoFit={triggerAutoFit}
          cycleUITheme={cycleUITheme}
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
          className={`bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] transition-all duration-300 ease-in-out border-r border-[var(--ui-border)] z-20 flex flex-col h-full overflow-y-auto ${
            isPanelOpen 
              ? 'w-full md:w-[460px] lg:w-[500px] opacity-100 ${elevationSystem.overlay}' 
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

        <div className={`flex-1 bg-[var(--ui-preview-bg)] h-full overflow-y-auto p-2 sm:p-4 justify-center items-start relative ${
          mobileTabState === 'editor' && isPanelOpen ? 'hidden md:flex' : 'flex'
        }`}>
          <Suspense fallback={
            <div className="w-full h-[600px] flex flex-col items-center justify-center p-8 text-white/60">
              <div className="w-10 h-10 border-4 border-[var(--color-accent-purple)] border-t-transparent rounded-full animate-spin mb-4" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--ui-on-dark-purple)]">Cargando Visor Vectorial de Alta Resolución…</span>
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
            onClose={() => {
              setIsSaveModalOpen(false);
              setInitialSaveAsOpen(false);
            }}
            onSaveStorage={handleSaveCVClick}
            onSaveAs={handleSaveCVAsClick}
            onExportJson={() => setIsDownloadModalOpen(true)}
            onOpenCloudStatus={() => setIsCloudModalOpen(true)}
            isSaving={isSaving}
            initialSaveAsOpen={initialSaveAsOpen}
          />
        )}

        {isShareAppModalOpen && (
          <ShareAppModal
            isOpen={isShareAppModalOpen}
            onClose={() => setIsShareAppModalOpen(false)}
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

        {isAtsModalOpen && atsResult && (
          <AtsCheckModal
            isOpen={isAtsModalOpen}
            onClose={() => setIsAtsModalOpen(false)}
            result={atsResult}
            onExportAtsPdf={handleExportAtsPdf}
          />
        )}
      </Suspense>

      {/* BARRA INFERIOR / FOOTER: Pestañas de Documentos + Botón "+" + Botón ATS en Margen Derecho (mb-14 en celular para verse sobre muelle) */}
      <footer className="h-10 bg-[var(--ui-bg-panel)] border-t border-[var(--ui-border)] text-[var(--ui-text-primary)] px-3 md:pl-20 flex items-center justify-between gap-2 shrink-0 no-print select-none text-xs font-sans z-40 mb-14 md:mb-0">
        
        {/* Pestañas de CVs Abiertos + Botón "+" */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 py-0.5">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full">
            {tabs.map((tab) => {
              const isActive = tab.cvId === activeCvId;
              return (
                <div
                  key={tab.cvId}
                  onClick={() => {
                    if (!isActive) handleSwitchDocumentTab(tab.cvId);
                  }}
                  className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-[${radius.card}] text-xs font-bold transition cursor-pointer shrink-0 border ${
                    isActive
                      ? `bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] border-[var(--color-accent-base)] ${elevationSystem.raised}`
                      : 'bg-[var(--ui-bg-card)] text-[var(--ui-dock-text-muted)] border-[var(--ui-border)] hover:bg-[var(--ui-bg-panel)] hover:text-[var(--ui-dock-text)]'
                  }`}
                  title={tab.title}
                >
                  <FileText className={`w-3.5 h-3.5 ${isActive ? 'text-[var(--color-accent-on-base)]' : 'text-[var(--color-secondary-bright)]'}`} />
                  <span className="truncate max-w-[100px] sm:max-w-[140px] leading-none">
                    {tab.title}
                  </span>

                  {tab.versionLabel && (
                    <span className={`text-[9px] px-1 py-0.5 rounded font-black uppercase tracking-tighter ${
                      isActive
                        ? 'bg-[var(--color-accent-on-base)] text-[var(--color-accent-base)]'
                        : 'bg-[var(--ui-bg-panel)] text-[var(--color-secondary-bright)] border border-[var(--ui-border)]'
                    }`}>
                      {tab.versionLabel}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleCloseFooterTab(e, tab.cvId, tab.title)}
                    className="p-0.5 rounded transition cursor-pointer opacity-80 hover:opacity-100"
                    title="Cerrar Pestaña"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Botón "+" (Agregar Pestaña / Nuevo Documento) */}
          <button
            type="button"
            onClick={handleNewCV}
            className={`p-1.5 rounded-full bg-[var(--ui-bg-card)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-panel)] text-[var(--color-status-success-bright)] transition cursor-pointer active:scale-95 shrink-0 ${elevationSystem.raised}`}
            title="Crear Nuevo Documento (+)"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Margen Derecho: Botón ATS Compacto (Icono + siglas ATS) */}
        <button
          type="button"
          onClick={handleOpenAtsCheck}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-[${radius.card}] text-xs font-black text-[var(--ui-text-primary)] bg-[var(--ui-bg-card)] hover:bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] transition ${elevationSystem.raised} cursor-pointer whitespace-nowrap active:scale-95 shrink-0 ml-2`}
          title="Auditoría de lectura predictiva para ATS"
        >
          <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent-amber-bright)] flex-shrink-0" />
          <span>ATS</span>
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
