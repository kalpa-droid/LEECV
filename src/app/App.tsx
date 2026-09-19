import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import Navbar from '../modules/cv-builder/components/Navbar';
import CanvaIconDock from '../modules/cv-builder/components/CanvaIconDock';
import EditorPanel from '../modules/cv-builder/components/EditorPanel';
const CVPreview = lazy(() => import('../modules/cv-builder/components/CVPreview'));
import { FileText, CreditCard, Palette, Plus, X, Sparkles, ChevronRight } from 'lucide-react';
import { getOpenTabs, openTab as addOpenTab, closeTab as removeOpenTab, updateTabTitle, OpenTab as OpenTabItem, TABS_CHANGED_EVENT } from '../shared/core/documents/tabStore';
import { useDocumentTabs } from '../shared/core/documents/useDocumentTabs';
import { generateDocumentId, computeAutoDocumentTitle, getDraftIdForDocType, isProvisionalDocument, markAsConfirmed, hasRealContent } from '../shared/core/documents/documentEngine';
import * as workspaceController from '../shared/core/documents/workspaceController';
import { capabilitiesGate } from '../shared/core/documents/documentEngine/capabilitiesGate';
import { AppShell } from '../shared/core/ui/AppShell';
const LandingPage = lazy(() => import('../modules/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const BookStudio = lazy(() => import('../modules/book-studio/BookStudio').then(m => ({ default: m.BookStudio })));
const BlogModule = lazy(() => import('../modules/blog/BlogModule').then(m => ({ default: m.BlogModule })));

import { getCurrentProfile, capturarConexionDriveSiCorresponde } from '../modules/auth/authService';
import { supabase } from '../shared/core/lib/supabaseClient';
import { exportCVToJson, importCVFromJsonFile } from '../shared/core/utils/jsonImporterExporter';
import { applyUiTheme, getNextUiTheme, elevationSystem, radius } from '../shared/core/uiDesignSystem';
import { getGlobalUiTheme, setGlobalUiTheme as setGlobalUiThemeInStorage, cycleGlobalUiTheme, subscribeToGlobalUiTheme } from '../shared/core/utils/globalThemePreference';

const PublicCVView = lazy(() => import('../modules/cv-builder/components/PublicCVView').then(m => ({ default: m.PublicCVView })));
const CardExportModal = lazy(() => import('../modules/cv-builder/components/modals/CardExportModal').then(m => ({ default: m.CardExportModal })));
import { SeoMetaManager } from '../shared/core/seo/SeoMetaManager';

// Direct Modals Imports (Prevents dynamic chunk fetch errors on updates)
import PhotoCropperModal from '../modules/cv-builder/components/PhotoCropperModal';
import SignatureModal from '../modules/cv-builder/components/SignatureModal';
import WizardModal from '../modules/cv-builder/components/WizardModal';
import SavedCVsModal from '../modules/cv-builder/components/SavedCVsModal';
import SaveModal from '../modules/cv-builder/components/SaveModal';
import SaveAsVersionModal from '../modules/cv-builder/components/SaveAsVersionModal';
import CloudStatusModal from '../modules/cv-builder/components/CloudStatusModal';
import PricingModal from '../modules/payments/PricingModal';
import PdfCheckoutModal from '../modules/cv-builder/components/modals/PdfCheckoutModal';
import JsonDownloadModal from '../modules/cv-builder/components/modals/JsonDownloadModal';
import PdfProgressModal from '../modules/cv-builder/components/modals/PdfProgressModal';
import PrivacyModal from '../modules/cv-builder/components/PrivacyModal';
import { GracePeriodBanner } from '../shared/core/ui/GracePeriodBanner';
import { RetentionOfferModal } from '../modules/payments/components/RetentionOfferModal';
import { CookieConsentBanner } from '../shared/core/ui/CookieConsentBanner';
import { useEntitlements } from '../shared/core/entitlements/useEntitlements';
import { dal } from '../shared/core/storage/dataAccessLayer';

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
import { loadCVById, loadDocumentById, saveCV } from '../shared/core/storage/documentStorageService';
import { setPendingDocumentToOpen, getPendingDocumentToOpen, clearPendingDocumentToOpen } from '../shared/core/storage/pendingDocumentHandoff';
import { runWithSafeSave } from '../shared/core/storage/safeNavigationEngine';
import { signInWithGoogle, logout } from '../modules/auth/authService';
import { PwaInstallBanner } from '../shared/core/ui/PwaInstallBanner';
import { initUpdateEngine, onUpdateReady } from '../shared/core/pwa/updateEngine';
import { trackPageView } from '../shared/core/analytics/analyticsService';
import { getDocTypeForRoute, getRouteForDocType, getDefaultTitleForDocType, inferDocumentTypeId } from '../shared/core/capabilities/capabilityRegistry';
import { UpdateToast } from '../shared/core/ui/UpdateToast';
import { useDocumentViewport } from '../shared/core/viewport';

import { procesarRetornoPago } from '../modules/payments/paymentService';

interface AppContentProps {
  initialPreset?: string;
  currentRoute?: string;
  onNavigate?: (route: string) => void;
}

function AppContent({ initialPreset = 'cv-clasico', currentRoute, onNavigate }: AppContentProps) {
  const { cvData, setCvData, resetToBlankCV, saveCV, saveCVAs, isSaving, hasPendingChanges, isSwitchingDocument, setIsSwitchingDocument } = useCVContext();
  const didReconcileRef = useRef(false);
  const [updateBannerVisible, setUpdateBannerVisible] = useState(false);

  const { showSuccess, showError, showInfo } = useToast();
  const { confirm } = useConfirm();
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const { inGracePeriod, graceEndsAt } = useEntitlements();
  const [graceCvList, setGraceCvList] = useState<any[]>([]);
  const [isRetentionModalOpen, setIsRetentionModalOpen] = useState(false);

  // Solo se consulta la lista de CVs cuando el usuario está en período de gracia —
  // evita una query extra para el resto de los usuarios en cada carga de la app.
  useEffect(() => {
    if (!inGracePeriod || !currentProfile?.id) return;
    dal.cvs.listByUser(currentProfile.id).then(setGraceCvList).catch(() => {});
  }, [inGracePeriod, currentProfile?.id]);

  useEffect(() => {
    initUpdateEngine();
    onUpdateReady(() => setUpdateBannerVisible(true));
  }, []);

  useEffect(() => {
    if (!updateBannerVisible) return;
    const timer = setTimeout(() => {
      if (!isSaving && !hasPendingChanges) {
        navigation.reload();
      }
    }, 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [updateBannerVisible, isSaving, hasPendingChanges]);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const [isPublicView, setIsPublicView] = useState(false);
  const [publicSlug, setPublicSlug] = useState<string | undefined>(undefined);

  const [globalUiTheme, setGlobalUiTheme] = useState<string>(() => {
    return getGlobalUiTheme();
  });

  useEffect(() => {
    return subscribeToGlobalUiTheme(setGlobalUiTheme);
  }, []);

  const cycleUITheme = () => {
    const nextTheme = cycleGlobalUiTheme();
    setGlobalUiTheme(nextTheme);
  };

  useEffect(() => {
    syncPresetsFromStorage().catch(err => console.warn('Error sincronizando presets iniciales:', err));
    getCurrentProfile().then(p => setCurrentProfile(p)).catch(() => {});

    procesarRetornoPago()
      .then((res) => {
        if (res?.status === 'paypal_captured') {
          showSuccess('¡Pago procesado con éxito vía PayPal! Tu suscripción o créditos han sido activados.');
          getCurrentProfile().then(p => setCurrentProfile(p)).catch(() => {});
        } else if (res?.status === 'payment_success') {
          showSuccess('¡Pago confirmado! Tu cuenta ha sido actualizada.');
          getCurrentProfile().then(p => setCurrentProfile(p)).catch(() => {});
        }
      })
      .catch((err) => {
        showError(err?.message || 'Inconveniente al procesar el retorno del pago.');
      });

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

  const [activeTab, setActiveTab] = useState(() => {
    const docType = cvData ? inferDocumentTypeId(cvData) : (initialPreset === 'tarjeta-personal' ? 'business_card' : 'cv');
    if (docType === 'business_card') return 'card_front';
    if (docType === 'cover_letter') return 'source_data';
    if (docType === 'book') return 'grid_viewer';
    return 'personales';
  });

  // Resetea activeTab al tab inicial correcto según el docType cuando cambia el documento activo (cvData.id)
  const prevCvIdRef = useRef(cvData?.id);
  useEffect(() => {
    if (cvData?.id && prevCvIdRef.current && prevCvIdRef.current !== cvData.id) {
      const docType = inferDocumentTypeId(cvData);
      const defaultTab = docType === 'business_card' 
        ? 'card_front' 
        : docType === 'cover_letter' 
        ? 'source_data' 
        : docType === 'book' 
        ? 'grid_viewer' 
        : 'personales';
      setActiveTab(defaultTab);
    }
    prevCvIdRef.current = cvData?.id;
  }, [cvData?.id, cvData?.activePresetId, (cvData as any)?.cardSize, (cvData as any)?.docType, cvData?.doc_type_id]);

  const handleSwitchDocumentTab = async (targetCvId: string, targetDocType: string = 'cv', opts: { skipSaveCurrent?: boolean } = {}) => {
    if (!targetCvId || targetCvId === cvData?.id || isSwitchingDocument) return;

    setIsSwitchingDocument(true);
    try {
      const currentDocState: workspaceController.CurrentDocumentState | null = cvData ? {
        id: cvData.id,
        docType: inferDocumentTypeId(cvData),
        data: cvData,
        isDirty: hasPendingChanges
      } : null;

      const success = await workspaceController.switchToTab(
        targetCvId,
        currentDocState,
        setCvData,
        { saveCurrentIfDirty: !opts.skipSaveCurrent, targetDocType }
      );

      if (success) {
        setTabs(getOpenTabs());
        showSuccess('Pestaña conmutada exitosamente.');
      } else {
        showError('No se pudo cargar el documento de la pestaña seleccionada.');
      }
    } catch (err) {
      console.error('Error al conmutar pestaña de documento:', err);
      showError('Error al abrir la pestaña de documento.');
    } finally {
      setIsSwitchingDocument(false);
    }
  };

  const handleNavigateToDocumentTab = async (targetDocType: 'cv' | 'business_card' | 'book' | 'cover_letter', targetId: string) => {
    await runWithSafeSave(
      saveCV,
      async () => {
        setPendingDocumentToOpen(targetId, targetDocType);
        const targetRoute = getRouteForDocType(targetDocType);
        if (onNavigate) {
          onNavigate(targetRoute);
        } else if (typeof window !== 'undefined') {
          window.history.pushState({}, '', targetRoute);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }
    );
  };

  useEffect(() => {
    const pending = getPendingDocumentToOpen();
    if (pending && (pending.docType === 'cv' || pending.docType === 'business_card' || pending.docType === 'cover_letter')) {
      clearPendingDocumentToOpen();
      handleSwitchDocumentTab(pending.id, pending.docType);
    }
  }, []);


  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const activeDocType: 'cv' | 'business_card' | 'book' | 'cover_letter' =
    currentRoute === '/crear-carta' || cvData?.activePresetId === 'carta-presentacion' || (cvData as any)?.docType === 'cover_letter'
      ? 'cover_letter'
      : cvData?.activePresetId === 'tarjeta-personal'
      ? 'business_card'
      : 'cv';

  const activePageSizeId = activeDocType === 'business_card' ? ((cvData as any)?.cardSize || 'tarjeta_estandar') : 'a4';

  const viewport = useDocumentViewport({
    pageSizeId: activePageSizeId,
    safetyPaddingPx: 48
  });

  const [isPhotoCropperOpen, setIsPhotoCropperOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSavedCVsOpen, setIsSavedCVsOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
  const [initialSaveAsOpen, setInitialSaveAsOpen] = useState(false);
  const [isEmailSaveModalOpen, setIsEmailSaveModalOpen] = useState(false);
  const [isShareAppModalOpen, setIsShareAppModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [pdfCheckoutPurpose, setPdfCheckoutPurpose] = useState<'export' | 'publish'>('export');
  const [, setPdfProgress] = useState(0);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPdfComplete, setIsPdfComplete] = useState(false);
  const [mobileTabState, setMobileTabState] = useState('editor');

  const [isPdfCheckoutOpen, setIsPdfCheckoutOpen] = useState(false);
  const [isCardExportOpen, setIsCardExportOpen] = useState(false);
  const [isAtsModalOpen, setIsAtsModalOpen] = useState(false);
  const [atsResult, setAtsResult] = useState<AtsPreflightResult | null>(null);

  // Gestión unificada y desacoplada de pestañas mediante el custom hook useDocumentTabs
  const { tabs, setTabs, activeCvId } = useDocumentTabs({
    cvData,
    isSwitchingDocument,
    currentRoute,
    hasPendingChanges,
    setCvData,
    setIsSwitchingDocument
  });

  /**
   * Crea un documento en blanco Y registra su pestaña explícitamente.
   * Única vía para "documento nuevo" — antes cada llamador hacía solo
   * resetToBlankCV() y dependía de que el sincronizador pasivo le creara la
   * pestaña de rebote, que es justo lo que causaba que una pestaña recién
   * cerrada reapareciera sola.
   */
  const createBlankDocumentWithTab = useCallback((presetId?: string) => {
    const blank = resetToBlankCV(presetId ? { activePresetId: presetId } : undefined) as any;
    const newId = blank?.id;
    if (newId) {
      const docType = inferDocumentTypeId(blank);
      addOpenTab(newId, docType as any, computeAutoDocumentTitle(docType as any, blank));
      setTabs(getOpenTabs());
    }
  }, [resetToBlankCV]);

  const goToLandingPage = React.useCallback(() => {
    if (onNavigate) {
      onNavigate('/');
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [onNavigate]);

  const handleCloseFooterTab = (e: React.MouseEvent, cvId: string, title: string) => {
    e.stopPropagation();
    confirm({
      title: '¿Cerrar pestaña?',
      message: `¿Deseas cerrar "${title}"? Tus datos guardados se mantendrán a salvo en tus archivos.`,
      confirmText: 'Cerrar Pestaña',
      onConfirm: async () => {
        setIsSwitchingDocument(true);
        try {
          const currentDocState: workspaceController.CurrentDocumentState | null = cvData ? {
            id: cvData.id,
            docType: inferDocumentTypeId(cvData),
            data: cvData,
            isDirty: hasPendingChanges
          } : null;
          
          await workspaceController.closeTab(cvId, currentDocState, setCvData, goToLandingPage, activeCvId);
          setTabs(getOpenTabs());
        } finally {
          setIsSwitchingDocument(false);
        }
      }
    });
  };

  // Protección ante cierre accidental del navegador
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (cvData && hasPendingChanges) {
        e.preventDefault();
        e.returnValue = '¿Deseas salir de la página? Asegúrate de que tus datos estén guardados.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cvData, hasPendingChanges]);

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

    setPdfCheckoutPurpose('export');
    setIsPdfCheckoutOpen(true);
  };



  const toggleDocumentPresetMode = () => {
    const isCard = cvData?.activePresetId === 'tarjeta-personal';
    const nextId = isCard ? 'cv-clasico' : 'tarjeta-personal';
    setCvData((prev: any) => ({ ...prev, activePresetId: nextId }));
    showInfo(isCard ? 'Vista cambiada a: Currículum Vitae A4 📄' : 'Vista cambiada a: Tarjeta Personal 📇');
  };

  const handleSaveCVClick = async () => {
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
    }
  };

  const handleSaveCVAsClick = async (versionLabel: string) => {
    try {
      const res = await saveCVAs(versionLabel);
      if (res?.success) {
        // La copia es un documento nuevo: registrarle su pestaña (el original conserva la suya).
        const copyId = res.record?.id;
        if (copyId) {
          const copy = { ...cvData, id: copyId, version_label: versionLabel };
          setTabs(workspaceController.ensureDocumentTab(copyId, inferDocumentTypeId(cvData) as any, copy));
        }
        showSuccess(`¡Nueva versión guardada! 📌 Título: "${res.title || versionLabel}"`);
      } else {
        showError('Hubo un inconveniente al crear la nueva versión.');
      }
    } catch (err) {
      console.error(err);
      showError('Error al crear la nueva versión del documento.');
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
            createBlankDocumentWithTab();
            setActiveTab('personales');
            if (currentRoute !== '/crear-cv' && currentRoute !== '/') {
              if (onNavigate) {
                onNavigate('/crear-cv');
              } else if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/crear-cv');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }
            showSuccess('Tu borrador anterior ha sido resguardado con éxito. Ahora estás editando un currículum en blanco.');
          }
        );
      }
    });
  };

  const handleNewCard = async () => {
    confirm({
      title: '¿Iniciar nueva Tarjeta Personal?',
      message: '¿Deseas iniciar una tarjeta personal en blanco? Se guardará un borrador automático de tu documento actual.',
      confirmText: 'Sí, crear tarjeta',
      onConfirm: async () => {
        await runWithSafeSave(
          saveCV,
          () => {
            createBlankDocumentWithTab('tarjeta-personal');
            setActiveTab('personales');
            if (currentRoute !== '/crear-tarjeta') {
              if (onNavigate) {
                onNavigate('/crear-tarjeta');
              } else if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/crear-tarjeta');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }
            showSuccess('Tarjeta personal creada en blanco.');
          }
        );
      }
    });
  };

  const handleNewBook = async () => {
    confirm({
      title: '¿Iniciar nuevo Libro / Folleto?',
      message: '¿Deseas iniciar la imposición de un nuevo libro? Se resguardará tu borrador actual.',
      confirmText: 'Sí, crear libro',
      variant: 'info',
      onConfirm: async () => {
        await runWithSafeSave(
          saveCV,
          () => {
            createBlankDocumentWithTab('libro-standard');
            setActiveTab('grid_viewer');
            if (currentRoute !== '/crear-libro') {
              if (onNavigate) {
                onNavigate('/crear-libro');
              } else if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/crear-libro');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }
            showSuccess('Nuevo libro / folleto listo para procesar.');
          }
        );
      }
    });
  };

  const handleNewCoverLetter = async () => {
    confirm({
      title: '¿Iniciar nueva Carta de Presentación?',
      message: '¿Deseas iniciar una carta de presentación en blanco? Se resguardará tu borrador actual.',
      confirmText: 'Sí, crear carta',
      variant: 'info',
      onConfirm: async () => {
        await runWithSafeSave(
          saveCV,
          () => {
            createBlankDocumentWithTab('carta-clasica');
            setActiveTab('source_data');
            if (currentRoute !== '/crear-carta') {
              if (onNavigate) {
                onNavigate('/crear-carta');
              } else if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/crear-carta');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }
            showSuccess('Nueva carta de presentación lista para editar.');
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

  if (currentRoute === '/crear-libro') {
    const activeBookTab = tabs.find(t => t.docType === 'book' || t.cvId.startsWith('book-')) || { cvId: 'book-main' };
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-screen text-sm opacity-60 animate-pulse">Cargando Creador de Libros...</div>}>
        <BookStudio
          currentUiTheme={globalUiTheme}
          onBackToHome={() => onNavigate?.('/')}
          documentTabs={tabs}
          activeTabId={activeBookTab.cvId}
          onSelectTab={handleSwitchDocumentTab}
          onCloseTab={(id) => {
            const tab = tabs.find(t => t.cvId === id);
            handleCloseFooterTab({ stopPropagation: () => {} } as any, id, tab?.title || 'Documento');
          }}
          onNavigateToDocument={(targetDocType, id) => handleNavigateToDocumentTab(targetDocType, id)}
          onTabsChanged={(updated) => setTabs(updated)}
          onNewCV={handleNewCV}
          onNewCard={handleNewCard}
          onNewBook={handleNewBook}
          cycleUITheme={cycleUITheme}
          isLoggedIn={!!currentProfile}
          onAuthToggle={handleAuthToggle}
        />
      </Suspense>
    );
  }

  return (
    <AppShell
      docType={activeDocType}
      isPanelOpen={isPanelOpen}
      mobileTabState={mobileTabState}
      bannerSlot={
        <>
          {inGracePeriod && currentProfile?.id && (
            <div className="px-3 pt-3 md:px-6 md:pt-4">
              <GracePeriodBanner
                graceEndsAt={graceEndsAt}
                cvList={graceCvList}
                userName={currentProfile?.email || 'Usuario'}
                onOpenRetentionModal={() => setIsRetentionModalOpen(true)}
              />
            </div>
          )}
          {currentProfile?.id && (
            <RetentionOfferModal
              isOpen={isRetentionModalOpen}
              onClose={() => setIsRetentionModalOpen(false)}
              userId={currentProfile.id}
            />
          )}
        </>
      }
      navbarSlot={
        <Navbar 
          currentCvData={{ ...cvData, uiTheme: globalUiTheme }}
          setCvData={setCvData}
          onOpenSavedCVsModal={() => setIsSavedCVsOpen(true)}
          onSaveCVClick={handleSaveCVClick}
          onOpenSaveAsModal={() => setIsSaveAsModalOpen(true)}
          onOpenJsonDownloadModal={() => setIsDownloadModalOpen(true)}
          onPrint={handleExportPDFClick}
          onOpenAtsCheck={handleOpenAtsCheck}
          onOpenPricing={() => setIsPricingModalOpen(true)}
          onOpenShareAppModal={() => setIsShareAppModalOpen(true)}
          onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
          onOpenCloudStatus={() => setIsCloudModalOpen(true)}
          onAuthToggle={handleAuthToggle}
          isLoggedIn={!!currentProfile}
          userRole={currentProfile?.role || 'candidate'}
          isSaving={isSaving}
          zoomLevel={viewport.zoomLevel}
          setZoomLevel={viewport.setZoomLevel}
          triggerAutoFit={viewport.fitAndCenter}
          isAutoFitMode={viewport.isAutoFitMode}
          cycleUITheme={cycleUITheme}
          mobileTabState={mobileTabState}
          onToggleMobileTab={(tab) => {
            setMobileTabState(tab);
            if (tab === 'editor') {
              setIsPanelOpen(true);
            } else {
              viewport.fitAndCenter();
              if (typeof window !== 'undefined') {
                requestAnimationFrame(() => {
                  setTimeout(viewport.fitAndCenter, 120);
                });
              }
            }
          }}
        />
      }
      dockSlot={
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
          onOpenAtsCheck={handleOpenAtsCheck}
          docType={activeDocType}
        />
      }
      panelSlot={
        <EditorPanel 
          cvData={cvData} 
          setCvData={setCvData} 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          docType={activeDocType}
          onOpenPhotoCropper={() => setIsPhotoCropperOpen(true)}
          onOpenSignature={() => setIsSignatureOpen(true)}
          onOpenSavedCVs={() => setIsSavedCVsOpen(true)}
        />
      }
      mainSlot={
        <Suspense fallback={
          <div className="w-full h-[600px] flex flex-col items-center justify-center p-8 text-[var(--ui-text-secondary)]">
            <div className="w-10 h-10 border-4 border-[var(--color-accent-base)] border-t-transparent rounded-full animate-spin mb-4" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ui-text-primary)]">Cargando Visor Vectorial de Alta Resolución…</span>
          </div>
        }>
          <CVPreview 
            cvData={cvData} 
            setCvData={setCvData} 
            activeTab={activeTab} 
            zoomLevel={viewport.zoomLevel} 
            onZoomChange={viewport.setZoomLevel}
            containerRef={viewport.containerRef}
            paperSheetRef={viewport.paperSheetRef}
            pageSizeId={activePageSizeId}
          />
        </Suspense>
      }
      tabsBarProps={{
        tabs: tabs,
        activeId: activeCvId,
        onSwitch: handleSwitchDocumentTab,
        onNavigateToDocument: handleNavigateToDocumentTab,
        onAdd: handleNewCV,
        onNewCV: handleNewCV,
        onNewCard: handleNewCard,
        onNewBook: handleNewBook,
        onNewCoverLetter: handleNewCoverLetter,
        onClose: handleCloseFooterTab
      }}
      modalsSlot={
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
              docType={activeDocType}
              onClose={() => setIsSavedCVsOpen(false)}
              onSelectCV={(selectedCV: any) => {
                setCvData(selectedCV);
                // Abrir desde "Mis archivos" también debe dejar su pestaña visible.
                setTabs(workspaceController.ensureDocumentTab(selectedCV.id, inferDocumentTypeId(selectedCV) as any, selectedCV));
                setIsSavedCVsOpen(false);
              }}
              onImportJson={handleImportJsonFile}
              onOpenCloudStatus={() => setIsCloudModalOpen(true)}
              onDocumentClosed={(deletedId) => {
                const currentDocState: workspaceController.CurrentDocumentState | null = cvData ? {
                  id: cvData.id,
                  docType: inferDocumentTypeId(cvData),
                  data: cvData,
                  isDirty: hasPendingChanges
                } : null;
                workspaceController.closeTab(deletedId, currentDocState, setCvData, goToLandingPage, activeCvId).then(() => setTabs(getOpenTabs()));
              }}
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

          {isSaveAsModalOpen && capabilitiesGate.canVersionByJob(inferDocumentTypeId(cvData)) && (
            <SaveAsVersionModal
              isOpen={isSaveAsModalOpen}
              onClose={() => setIsSaveAsModalOpen(false)}
              onSaveAs={handleSaveCVAsClick}
              isSaving={isSaving}
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
              onOpenPdfCheckout={() => {
                setPdfCheckoutPurpose('publish');
                setIsPdfCheckoutOpen(true);
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
              purpose={pdfCheckoutPurpose}
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

          <UpdateToast
            isVisible={updateBannerVisible}
            onUpdate={() => navigation.reload()}
            onDismiss={() => setUpdateBannerVisible(false)}
          />
        </Suspense>
      }
    />
  );
}

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    const path = navigation.getPathname();
    if (path === '/crear-cv' || path === '/crear-tarjeta' || path === '/crear-libro' || path === '/crear-carta' || path === '/blog') {
      return path;
    }
    return '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(navigation.getPathname());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    trackPageView(currentRoute);
  }, [currentRoute]);

  const navigateTo = (route: string) => {
    navigation.push(route);
    setCurrentRoute(route);
  };

  return (
    <ToastProvider>
      <ConfirmProvider>
        <CVProvider>
          {currentRoute === '/blog' ? (
            <>
              <SeoMetaManager title="Blog & Recursos — LEECV" />
              <Suspense fallback={<div className="flex items-center justify-center h-screen text-sm opacity-60 animate-pulse">Cargando Blog...</div>}>
                <BlogModule onNavigateHome={() => navigateTo('/')} onNavigateProduct={(r) => navigateTo(r)} />
              </Suspense>
            </>
          ) : currentRoute === '/' ? (
            <>
              <SeoMetaManager title="LEECV — CVs, Tarjetas y Libros en Calidad Imprenta" />
              <Suspense fallback={<div className="flex items-center justify-center h-screen text-sm opacity-60 animate-pulse">Cargando LEECV...</div>}>
                <LandingPage onNavigate={(r) => navigateTo(r)} />
              </Suspense>
            </>
          ) : (
            <>
              <SeoMetaManager title={`${getDefaultTitleForDocType(getDocTypeForRoute(currentRoute))} — LEECV`} noIndex />
              <AppContent currentRoute={currentRoute} onNavigate={(r) => navigateTo(r)} />
            </>
          )}
          <CookieConsentBanner />
        </CVProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
