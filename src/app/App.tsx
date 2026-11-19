import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import Navbar from '../modules/cv-builder/components/Navbar';
import CanvaIconDock from '../modules/cv-builder/components/CanvaIconDock';
import EditorPanel from '../modules/cv-builder/components/EditorPanel';
const CVPreview = lazy(() => import('../modules/cv-builder/components/CVPreview'));
import { FileText, CreditCard, Palette, Plus, X, Sparkles, ChevronRight } from 'lucide-react';
import { getOpenTabs, openTab as addOpenTab, closeTab as removeOpenTab, updateTabTitle, OpenTab as OpenTabItem, TABS_CHANGED_EVENT } from '../shared/core/documents/tabStore';
import { useDocumentTabs } from '../shared/core/documents/useDocumentTabs';
import { generateDocumentId, computeAutoDocumentTitle, getDraftIdForDocType, isProvisionalDocument, markAsConfirmed, hasRealContent } from '../shared/core/documents/documentEngine';
import { createApplicationVariant, buildApplicationVariantData } from '../shared/core/documents/applicationVariant';
import * as workspaceController from '../shared/core/documents/workspaceController';
import { capabilitiesGate } from '../shared/core/documents/documentEngine/capabilitiesGate';
import { AppShell } from '../shared/core/ui/AppShell';
import { LoginModal } from '../modules/auth/components/LoginModal';
const LandingPage = lazy(() => import('../modules/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const BookStudio = lazy(() => import('../modules/book-studio/BookStudio').then(m => ({ default: m.BookStudio })));
const BlogModule = lazy(() => import('../modules/blog/BlogModule').then(m => ({ default: m.BlogModule })));
const JobRoleLandingPage = lazy(() => import('../modules/landing/components/JobRoleLandingPage').then(m => ({ default: m.default })));

import { supabase } from '../shared/core/lib/supabaseClient';
import { exportCVToJson, importCVFromJsonFile } from '../shared/core/utils/jsonImporterExporter';
import { withErrorHandling } from '../shared/core/utils/errorHandler';
import { applyUiTheme, getNextUiTheme, elevationSystem, radius } from '../shared/core/uiDesignSystem';
import { getGlobalUiTheme, setGlobalUiTheme as setGlobalUiThemeInStorage, cycleGlobalUiTheme, subscribeToGlobalUiTheme } from '../shared/core/utils/globalThemePreference';

import { CookieConsentBanner } from '../shared/core/ui/CookieConsentBanner';
import { useEntitlements } from '../shared/core/entitlements/useEntitlements';
import { navigation } from '../shared/core/utils/navigation';
import { AppModals } from './AppModals';
import { useExportEntitlement } from '../shared/core/entitlements/useExportEntitlement';
import { dal } from '../shared/core/storage/dataAccessLayer';

import { CVProvider, useCVContext } from '../context/CVContext';
import { ToastProvider, useToast } from '../shared/core/ui/Toast';
import { useConfirm, ConfirmProvider } from '../shared/core/ui/ConfirmDialog';

import { syncPresetsFromStorage, getPreset, resolveActivePreset } from '../shared/core/pdf-engine/layers/presets/presetRegistry';
import { cvDataToContentSections } from '../shared/core/pdf-engine/layers/records/cvDataAdapter';
import { runAtsPreflightCheck, AtsPreflightResult } from '../shared/core/pdf-engine/layers/ats/atsPreflightCheck';
import { useAtsLiveScore } from '../shared/core/ats/useAtsLiveScore';
const PlannerStudioContent = lazy(() => import('../modules/planner-studio/PlannerStudioContent').then(m => ({ default: m.PlannerStudioContent })));
const FacturadorStudioContent = lazy(() => import('../modules/facturador-studio/FacturadorStudioContent').then(m => ({ default: m.FacturadorStudioContent })));
import { loadCVById, loadDocumentById, saveCV } from '../shared/core/storage/documentStorageService';
import { setPendingDocumentToOpen, getPendingDocumentToOpen, clearPendingDocumentToOpen } from '../shared/core/storage/pendingDocumentHandoff';
import { runWithSafeSave } from '../shared/core/storage/safeNavigationEngine';

import { PwaInstallBanner } from '../shared/core/ui/PwaInstallBanner';
import { initUpdateEngine, onUpdateReady } from '../shared/core/pwa/updateEngine';
import { trackPageView } from '../shared/core/analytics/analyticsService';
import { getDocTypeForRoute, getRouteForDocType, getDefaultTitleForDocType, inferDocumentTypeId } from '../shared/core/capabilities/capabilityRegistry';
import { DocumentTypeId } from '../types/document';
import { useDocumentViewport } from '../shared/core/viewport';

import { procesarRetornoPago } from '../modules/payments/paymentService';
import { useAuth } from '../shared/core/auth/AuthContext';
import { claimCreditsOnAuth } from '../shared/core/auth/authService';

export const DEFAULT_PLANNER_PRESET_ID = 'planner-clasico';
export const DEFAULT_BOOK_PRESET_ID = 'libro-standard';

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
  const { inGracePeriod, graceEndsAt, refreshEntitlements } = useEntitlements();
  const { user, isLoading: authLoading } = useAuth();
  // Refs espejo para el retorno de pago: el effect corre una sola vez al montar
  // (mientras la sesión de Supabase todavía se hidrata) y debe leer el user
  // fresco, no el closure nulo del primer render.
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const authLoadingRef = useRef(authLoading);
  useEffect(() => { authLoadingRef.current = authLoading; }, [authLoading]);
  const atsLive = useAtsLiveScore(cvData, cvData?.jobTarget?.jobDescription);
  const atsLiveScore = atsLive.score;



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
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);


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

    const esperarSesionHidratada = async () => {
      // Techo de ~4.5s: si la sesión sigue hidratando más que eso, seguimos
      // con lo que haya (el claim corre igual cuando user exista en otro
      // disparo de claimCreditsOnAuth del propio authService).
      for (let i = 0; i < 15 && authLoadingRef.current; i++) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    };

    let cancelled = false;

    const procesar = async () => {
      const res = await procesarRetornoPago();
      if (!res || cancelled) return;
      if (res.status === 'paypal_captured') {
        showSuccess('¡Pago procesado con éxito vía PayPal! Tus créditos han sido activados.');
      } else if (res.status === 'payment_success') {
        showSuccess('¡Pago confirmado! Tu cuenta ha sido actualizada.');
      }

      // La pasarela acredita por webhook, que puede demorarse 2-3s respecto del
      // auto_return (y quedarse sin llegar). Polling de respaldo: claim +
      // refresh con user fresco, 3 reintentos cada 2s, siempre el último refresh.
      await esperarSesionHidratada();
      if (cancelled) return;
      const intentos = 3;
      for (let intento = 0; intento < intentos; intento++) {
        if (intento > 0) await new Promise((resolve) => setTimeout(resolve, 2000));
        if (cancelled) return;
        const currentUser = userRef.current;
        if (currentUser) await claimCreditsOnAuth(currentUser);
        await refreshEntitlements();
      }

      // Limpiar query params DESPUÉS de terminar el polling de créditos,
      // no antes. Así si el usuario recarga durante el polling, el retorno
      // se re-procesa y los créditos se muestran correctamente.
      navigation.cleanQueryParams();
    };

    procesar().catch((err) => {
      if (!cancelled) showError(err?.message || 'Inconveniente al procesar el retorno del pago.');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const [activeTab, setActiveTab] = useState(() => {
    const docType = cvData ? inferDocumentTypeId(cvData) : (initialPreset === 'tarjeta-personal' ? 'business_card' : 'cv');
    if (docType === 'business_card') return 'card_front';
    if (docType === 'cover_letter') return 'source_data';
    if (docType === 'book') return 'book_source_type';
    if (docType === 'planner') return 'planner_design';
    if (cvData?.sourceCvTabId || cvData?.body?.hookParagraph) return 'carta';
    return 'importar_datos';
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
        ? 'book_source_type'
        : docType === 'planner'
        ? 'planner_design'
        : cvData?.sourceCvTabId || cvData?.body?.hookParagraph
        ? 'carta'
        : 'importar_datos';
      setActiveTab(defaultTab);
    }
    prevCvIdRef.current = cvData?.id;
  }, [cvData?.id, cvData?.activePresetId, (cvData as any)?.cardSize, (cvData as any)?.docType, cvData?.doc_type_id]);

  const handleSwitchDocumentTab = async (targetCvId: string, targetDocType: string = 'cv', opts: { skipSaveCurrent?: boolean } = {}) => {
    if (targetDocType === 'invoice') {
      // FacturLee no usa cvData: navegar a la ruta de la factura sin cargar datos de CV.
      setTabs(getOpenTabs());
      if (currentRoute !== '/crear-factura') {
        if (onNavigate) {
          onNavigate('/crear-factura');
        } else if (typeof window !== 'undefined') {
          window.history.pushState({}, '', '/crear-factura');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }
      return;
    }
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

  const handleNavigateToDocumentTab = async (targetDocType: DocumentTypeId, targetId: string) => {
    const existingTab = tabs.find(t => t.docType === targetDocType);
    const finalTargetId = existingTab ? (existingTab.cvId || existingTab.id) : targetId;

    await runWithSafeSave(
      saveCV,
      async () => {
        setPendingDocumentToOpen(finalTargetId, targetDocType);
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




  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const activeDocType: 'cv' | 'business_card' | 'book' | 'cover_letter' | 'planner' | 'invoice' =
    currentRoute === '/crear-libro' || (cvData?.activePresetId?.startsWith('libro-') ?? false) || (cvData as any)?.docType === 'book'
      ? 'book'
      : cvData?.activePresetId === 'carta-presentacion' || (cvData as any)?.docType === 'cover_letter'
      ? 'cover_letter'
      : currentRoute === '/crear-factura'
      ? 'invoice'
      : currentRoute === '/crear-agenda' || cvData?.activePresetId?.startsWith('planner-') || (cvData as any)?.docType === 'planner'
      ? 'planner'
      : cvData?.activePresetId === 'tarjeta-personal'
      ? 'business_card'
      : 'cv';

  const activePageSizeId =
    (cvData as any)?.layout?.pageSizeId ||
    (cvData as any)?.layout?.paperSize ||
    (cvData as any)?.documentSettings?.paperSizeId ||
    (activeDocType === 'business_card' ? ((cvData as any)?.cardSize || 'tarjeta_estandar') : 'a4');

  const viewport = useDocumentViewport({
    pageSizeId: activePageSizeId
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
  const { consumeCreditIfNeeded } = useExportEntitlement();
  const [mobileTabState, setMobileTabState] = useState('editor');

  const [isPdfCheckoutOpen, setIsPdfCheckoutOpen] = useState(false);
  const [isCardExportOpen, setIsCardExportOpen] = useState(false);
  const [isCoverLetterExportOpen, setIsCoverLetterExportOpen] = useState(false);
  const [isAtsModalOpen, setIsAtsModalOpen] = useState(false);
  const [atsResult, setAtsResult] = useState<AtsPreflightResult | null>(null);
  const [isAtsLivePanelOpen, setIsAtsLivePanelOpen] = useState(false);

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
      return { id: newId, docType };
    }
    return null;
  }, [resetToBlankCV]);

  const prevRouteRef = useRef<string | undefined>(currentRoute);

  // Crea la pestaña inicial del Studio (libro / agenda) cuando el usuario
  // entra a una de esas rutas. Se hace en un efecto DESPUÉS del render, no
  // dentro de la función del componente: un setState durante render gatilla
  // "Cannot update a component while rendering a different component" y un
  // bucle infinito de React (#error 301) con el contenido de CVProvider/Book.
  // La guarda `lastCreatedTabIdRef` evita re-crear la pestaña mientras el store
  // todavía no la propagó a `tabs` (sincronización asíncrona): una vez que la
  // pestaña existe en `tabs`, el usuario puede cerrarla y se vuelve a crear.
  const lastCreatedTabIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentRoute) return;
    if (currentRoute === '/crear-libro') {
      const hasBookTab = tabs.some(
        (t) =>
          t.docType === 'book' ||
          inferDocumentTypeId(t) === 'book' ||
          t.id === lastCreatedTabIdRef.current
      );
      if (!hasBookTab) {
        const created = createBlankDocumentWithTab(DEFAULT_BOOK_PRESET_ID);
        if (created?.id) lastCreatedTabIdRef.current = created.id;
      }
      return;
    }
    if (currentRoute === '/crear-agenda') {
      const hasPlannerTab = tabs.some(
        (t) =>
          t.docType === 'planner' ||
          inferDocumentTypeId(t) === 'planner' ||
          t.id === lastCreatedTabIdRef.current
      );
      if (!hasPlannerTab) {
        const created = createBlankDocumentWithTab(DEFAULT_PLANNER_PRESET_ID);
        if (created?.id) lastCreatedTabIdRef.current = created.id;
      }
      return;
    }
    if (currentRoute === '/crear-factura') {
      // La pestaña de la factura la registra el propio estudio (useRegisterDocumentTab)
      // con su título de negocio: nunca crear un CV en blanco ni un borrador fiscal.
      return;
    }
  }, [currentRoute, tabs, createBlankDocumentWithTab]);


  // Paso 0: Resincronizar cvData con currentRoute cuando la ruta y el docType activo divergen,
  // y procesar intenciones explícitas de navegación (pendingDocumentToOpen)
  useEffect(() => {
    if (!currentRoute || currentRoute === '/' || currentRoute === '/blog' || currentRoute === '/dashboard') {
      prevRouteRef.current = currentRoute;
      return;
    }

    const routeChanged = prevRouteRef.current !== currentRoute;
    prevRouteRef.current = currentRoute;

    if (!routeChanged) return;

    const targetDocType = getDocTypeForRoute(currentRoute);
    if (targetDocType === 'invoice') {
      // FacturLee no usa cvData: su contenido vive en la bóveda cifrada local.
      prevRouteRef.current = currentRoute;
      return;
    }
    const currentDocType = cvData ? inferDocumentTypeId(cvData) : null;

    // Primero, si hay una intención explícita de navegación hacia un documento específico
    const pending = getPendingDocumentToOpen();
    if (pending && pending.docType === targetDocType) {
      clearPendingDocumentToOpen();
      handleSwitchDocumentTab(pending.id, pending.docType);
      return;
    }

    // Si no hay intención explícita, pero la ruta y el documento divergen (ej: por botones Back/Forward del navegador)
    if (currentDocType && currentDocType !== targetDocType) {
      const existingTab = tabs.find(t => t.docType === targetDocType);
      if (existingTab) {
        handleSwitchDocumentTab(existingTab.cvId || existingTab.id, targetDocType, { skipSaveCurrent: false });
      } else {
        const targetPreset = targetDocType === 'cover_letter' ? 'carta-clasica'
          : targetDocType === 'business_card' ? 'tarjeta-personal'
          : targetDocType === 'book' ? 'libro-standard'
          : targetDocType === 'planner' ? 'planner-clasico'
          : 'cv-clasico';
        
        // Verifica nuevamente si hay una pestaña activa antes de crear una nueva a lo ciego
        const newlyFoundTab = getOpenTabs().find(t => t.docType === targetDocType);
        if (newlyFoundTab) {
          handleSwitchDocumentTab(newlyFoundTab.cvId || newlyFoundTab.id, targetDocType, { skipSaveCurrent: false });
        } else {
          createBlankDocumentWithTab(targetPreset);
        }
      }
    }
  }, [currentRoute, cvData, tabs, createBlankDocumentWithTab, handleSwitchDocumentTab]);

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



  const handleOpenAtsCheck = () => {
    setIsAtsLivePanelOpen(true);
  };

  const handleExportAtsPdf = async (omitSensitiveData: boolean = false) => {
    const allowed = await consumeCreditIfNeeded();
    if (!allowed) {
      setPdfCheckoutPurpose('export');
      setIsPdfCheckoutOpen(true);
      return;
    }
    setIsGeneratingPDF(true);
    setIsPdfComplete(false);
    setPdfProgress(15);

    const result = await withErrorHandling(
      async () => {
        const { exportDocumentToPDF } = await import('../shared/core/pdf-engine/pdfExporter');
        let exportData = cvData;
        if (omitSensitiveData) {
          exportData = {
            ...cvData,
            hiddenFields: Array.from(new Set([...(cvData?.hiddenFields || []), 'dni', 'cuit', 'birthDate', 'estadoCivil', 'nacionalidad']))
          };
        }
        return exportDocumentToPDF(exportData, resolveActivePreset(exportData), true);
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

    const result = await withErrorHandling(
      async () => {
        const { exportDocumentToPDF } = await import('../shared/core/pdf-engine/pdfExporter');
        return exportDocumentToPDF(cvData, resolveActivePreset(cvData));
      },
      {
        context: 'Exportar PDF',
        errorMessage: 'Hubo un inconveniente al generar el PDF. Por favor verifica las imágenes o intenta nuevamente.',
        notify: (msg) => showError(msg)
      }
    );

    setPdfProgress(100);
    if (result.success && result.data) {
      setIsGeneratingPDF(false);
      setIsPdfComplete(true);
    } else {
      setIsGeneratingPDF(false);
    }
  };

  const triggerPdfGeneration = handleStartPDFGeneration;

  const proceedWithExport = async () => {
    const allowed = await consumeCreditIfNeeded();
    if (!allowed) {
      setPdfCheckoutPurpose('export');
      setIsPdfCheckoutOpen(true);
      return;
    }
    handleStartPDFGeneration();
  };

  const handleExportPDFClick = async () => {
    if (cvData?.activePresetId === 'tarjeta-personal') {
      setIsCardExportOpen(true);
      return;
    }

    if (activeDocType === 'cover_letter') {
      setIsCoverLetterExportOpen(true);
      return;
    }

    const preset = resolveActivePreset(cvData);
    const sections = cvDataToContentSections(cvData);
    const preflight = runAtsPreflightCheck(preset, sections, cvData, cvData?.jobTarget?.jobDescription);
    
    if (preflight.score < 100) {
      setAtsResult(preflight);
      setIsAtsModalOpen(true);
      showInfo("Revisá estas advertencias antes de descargar tu CV.");
      return;
    }

    await proceedWithExport();
  };



  const toggleDocumentPresetMode = () => {
    const isCard = cvData?.activePresetId === 'tarjeta-personal';
    const nextId = isCard ? 'cv-clasico' : 'tarjeta-personal';
    setCvData((prev: any) => ({ ...prev, activePresetId: nextId }));
    showInfo(isCard ? 'Vista cambiada a: Currículum Vitae 📄' : 'Vista cambiada a: Tarjeta Personal 📇');
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
      // "Guardar copia" es la misma función que "Crear postulación" (decisión aprobada):
      // copia fiel (texto y carta conservados), pestaña registrada y vinculada al origen.
      const result = await createApplicationVariantFor({
        versionLabel,
        keepJobTarget: true,
        resetLetterBody: false,
        goTo: 'keep',
        successMessage: `¡Nueva versión guardada! 📌 Título: "${versionLabel}"`,
      });
      if (!result) {
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
            const created = createBlankDocumentWithTab();
            setActiveTab('importar_datos');
            if (created) setPendingDocumentToOpen(created.id, created.docType);
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
            const created = createBlankDocumentWithTab('tarjeta-personal');
            setActiveTab('card_front');
            if (created) setPendingDocumentToOpen(created.id, created.docType);
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
      message: '¿Querés empezar un libro nuevo? Se resguardará tu borrador actual.',
      confirmText: 'Sí, crear libro',
      variant: 'info',
      onConfirm: async () => {
        await runWithSafeSave(
          saveCV,
          () => {
            const created = createBlankDocumentWithTab('libro-standard');
            setActiveTab('book_source_type');
            if (created) setPendingDocumentToOpen(created.id, created.docType);
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

  const navigateToCvBuilder = () => {
    if (currentRoute === '/crear-cv' || currentRoute === '/') return;
    if (onNavigate) {
      onNavigate('/crear-cv');
    } else if (typeof window !== 'undefined') {
      navigation.push('/crear-cv');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  /**
   * Flujo único de "Crear postulación" (V2.15.0): todos los puntos de entrada
   * (Vacante, Carta bloqueada, banner de Diseño, menú "+", botón Carta en
   * Guardados, Guardar copia) llaman a esta MISMA función — un motor, cero
   * clones. Reglas:
   * - sourceCvTabId siempre apunta al CV base original (nunca encadena).
   * - version_label = "Puesto · Empresa" con datos; "Nueva postulación" si no.
   * - SIEMPRE registra la pestaña del documento nuevo (ensureDocumentTab).
   * - Aterriza en Vacante si la copia no tiene datos de oferta; en Carta si ya los tiene.
   */
  const createApplicationVariantFor = async (options: {
    puesto?: string;
    empresa?: string;
    versionLabel?: string;
    keepJobTarget?: boolean;
    resetLetterBody?: boolean;
    goTo?: 'carta' | 'vacante' | 'keep';
    successMessage?: string;
    sourceCvData?: any;
  } = {}) => {
    const source = options.sourceCvData || cvData;
    if (!source) return null;
    const sourceType = inferDocumentTypeId(source) || 'cv';
    const built = buildApplicationVariantData(source, options);
    const hasJobTarget = Boolean(
      built.jobTarget?.jobTitle || built.jobTarget?.companyName || built.jobTarget?.jobDescription
    );
    const result = await createApplicationVariant(
      { ...options, cvData: source, docType: sourceType },
      {
        saveAs: (data, label) => saveCVAs(label, data),
        ensureTab: (id, docType, data) => workspaceController.ensureDocumentTab(id, docType, data),
      }
    );
    if (!result.success) {
      showError('No se pudo crear la postulación. El CV de origen se conservó sin cambios.');
      return null;
    }
    setTabs(getOpenTabs());
    if (sourceType === 'cv') {
      navigateToCvBuilder();
      if (options.goTo !== 'keep') {
        setActiveTab(options.goTo ?? (hasJobTarget ? 'carta' : 'vacante'));
      }
    }
    showSuccess(options.successMessage ?? 'Postulación creada. Completá la vacante y redactá la carta dentro de esta versión.');
    return result;
  };

  const handleNewCoverLetter = async () => {
    confirm({
      title: '¿Crear una nueva postulación?',
      message: 'Se creará una copia independiente de este CV para completar la vacante y su carta. El perfil de origen se conservará.',
      confirmText: 'Crear postulación',
      variant: 'info',
      onConfirm: async () => {
        // Misma función canónica que "Crear postulación" desde Vacante (V2.15.0).
        await createApplicationVariantFor({});
      }
    });
  };

  const handleNewInvoice = async () => {
    if (currentRoute !== '/crear-factura') {
      if (onNavigate) {
        onNavigate('/crear-factura');
      } else if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/crear-factura');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }
    showSuccess('FacturLee lista. Tus datos quedan solo en esta computadora.');
  };

  const handleNewPlanner = async () => {
    confirm({
      title: '¿Iniciar nueva Agenda / Planificador?',
      message: '¿Querés empezar una agenda nueva? Se resguardará tu borrador actual.',
      confirmText: 'Sí, crear agenda',
      variant: 'info',
      onConfirm: async () => {
        await runWithSafeSave(
          saveCV,
          () => {
            const created = createBlankDocumentWithTab('planner-clasico');
            setActiveTab('planner_design');
            if (created) setPendingDocumentToOpen(created.id, created.docType);
            if (currentRoute !== '/crear-agenda') {
              if (onNavigate) {
                onNavigate('/crear-agenda');
              } else if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/crear-agenda');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }
            showSuccess('Nueva agenda lista para configurar.');
          }
        );
      }
    });
  };

  const handleGenerateCoverLetterFromCV = async (sourceCvData?: any) => {
    // Un solo motor: crear postulación desde el CV activo o desde uno guardado.
    // Si el origen ya trae vacante, aterriza en Carta; si no, en Vacante.
    const fromSaved = Boolean(sourceCvData) && sourceCvData.id !== cvData?.id;
    await createApplicationVariantFor({
      ...(fromSaved ? { sourceCvData } : {}),
      keepJobTarget: true,
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

  // Modales de la app (Mis Libros Guardados, Guardar como, JSON, Compartir, etc.).
  // Se definen UNA sola vez y se montan tanto en la vista principal como en la
  // vista de Libro/Agenda (early returns): sin esto, los botones que abren
  // estos modales en /crear-libro no tienen dónde renderizarse.
  const appModals = (
    <AppModals
      isPhotoCropperOpen={isPhotoCropperOpen} setIsPhotoCropperOpen={setIsPhotoCropperOpen}
      isSignatureOpen={isSignatureOpen} setIsSignatureOpen={setIsSignatureOpen}
      isWizardOpen={isWizardOpen} setIsWizardOpen={setIsWizardOpen}
      isSavedCVsOpen={isSavedCVsOpen} setIsSavedCVsOpen={setIsSavedCVsOpen}
      isSaveModalOpen={isSaveModalOpen} setIsSaveModalOpen={setIsSaveModalOpen}
      isSaveAsModalOpen={isSaveAsModalOpen} setIsSaveAsModalOpen={setIsSaveAsModalOpen}
      initialSaveAsOpen={initialSaveAsOpen} setInitialSaveAsOpen={setInitialSaveAsOpen}
      isShareAppModalOpen={isShareAppModalOpen} setIsShareAppModalOpen={setIsShareAppModalOpen}
      isPdfCheckoutOpen={isPdfCheckoutOpen} setIsPdfCheckoutOpen={setIsPdfCheckoutOpen}
      isCardExportOpen={isCardExportOpen} setIsCardExportOpen={setIsCardExportOpen}
      isCoverLetterExportOpen={isCoverLetterExportOpen} setIsCoverLetterExportOpen={setIsCoverLetterExportOpen}
      isDownloadModalOpen={isDownloadModalOpen} setIsDownloadModalOpen={setIsDownloadModalOpen}
      isPrivacyModalOpen={isPrivacyModalOpen} setIsPrivacyModalOpen={setIsPrivacyModalOpen}
      isAtsModalOpen={isAtsModalOpen} setIsAtsModalOpen={setIsAtsModalOpen}
      isAtsLivePanelOpen={isAtsLivePanelOpen} setIsAtsLivePanelOpen={setIsAtsLivePanelOpen}
      atsLiveResult={atsLive?.result ?? null}
      activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); setIsPanelOpen(true); }}
      isPanelOpen={isPanelOpen} setIsPanelOpen={setIsPanelOpen}
      isPricingModalOpen={isPricingModalOpen} setIsPricingModalOpen={setIsPricingModalOpen}
      isCreditsModalOpen={isCreditsModalOpen} setIsCreditsModalOpen={setIsCreditsModalOpen}
      isLoginModalOpen={isLoginModalOpen} setIsLoginModalOpen={setIsLoginModalOpen}
      pdfCheckoutPurpose={pdfCheckoutPurpose}
      isGeneratingPDF={isGeneratingPDF}
      isPdfComplete={isPdfComplete} setIsPdfComplete={setIsPdfComplete}
      updateBannerVisible={updateBannerVisible} setUpdateBannerVisible={setUpdateBannerVisible}
      atsResult={atsResult}
      cvData={cvData}
      setCvData={setCvData}
      activeDocType={activeDocType}
      isSaving={isSaving}
      hasPendingChanges={hasPendingChanges}
      activeCvId={activeCvId}
      setTabs={setTabs}
      handleSaveCVClick={handleSaveCVClick}
      handleSaveCVAsClick={handleSaveCVAsClick}
      handleExportAtsPdf={handleExportAtsPdf}
      proceedWithExport={proceedWithExport}
      triggerPdfGeneration={triggerPdfGeneration}
      handleImportJsonFile={handleImportJsonFile}
      handleGenerateCoverLetterFromCV={handleGenerateCoverLetterFromCV}
      goToLandingPage={goToLandingPage}
    />
  );

  if (currentRoute === '/crear-libro') {
    const activeBookTab =
      tabs.find(t => (t.id === cvData?.id || t.cvId === cvData?.id) && (t.docType === 'book' || inferDocumentTypeId(t) === 'book')) ||
      tabs.find(t => t.docType === 'book' || inferDocumentTypeId(t) === 'book');
    if (!activeBookTab) {
      return (
        <div className="flex items-center justify-center h-screen text-sm opacity-60 animate-pulse">Cargando Creador de Libros...</div>
      );
    }
    const activeBookTabId = activeBookTab?.id || activeBookTab?.cvId || cvData?.id || '';
    return (
      <>
        <Suspense fallback={<div className="flex items-center justify-center h-screen text-sm opacity-60 animate-pulse">Cargando Creador de Libros...</div>}>
          <BookStudio
            currentUiTheme={globalUiTheme}
            onBackToHome={() => onNavigate?.('/')}
            documentTabs={tabs}
            activeTabId={activeBookTabId}
            onSelectTab={handleSwitchDocumentTab}
            onCloseTab={(id) => {
              const tab = tabs.find(t => t.id === id || t.cvId === id);
              handleCloseFooterTab({ stopPropagation: () => {} } as any, id, tab?.title || 'Documento');
            }}
            onNavigateToDocument={(targetDocType, id) => handleNavigateToDocumentTab(targetDocType, id)}
            onTabsChanged={setTabs}
            onNewCV={handleNewCV}
            onNewCard={handleNewCard}
            onNewBook={handleNewBook}
            cycleUITheme={cycleUITheme}
            onOpenSavedCVsModal={() => setIsSavedCVsOpen(true)}
            onOpenSaveAsModal={() => setIsSaveAsModalOpen(true)}
            onOpenJsonDownloadModal={() => setIsDownloadModalOpen(true)}
            onOpenShareAppModal={() => setIsShareAppModalOpen(true)}
            onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
          />
        </Suspense>
        {appModals}
      </>
    );
  }

  if (currentRoute === '/crear-factura') {
    const activeInvoiceTab = tabs.find(
      t => t.docType === 'invoice' || inferDocumentTypeId(t) === 'invoice'
    );
    const activeInvoiceTabId =
      activeInvoiceTab?.id || activeInvoiceTab?.cvId || cvData?.id || '';
    return (
      <>
        <Suspense fallback={<div className="flex items-center justify-center h-screen text-sm opacity-60 animate-pulse">Cargando FacturLee…</div>}>
          <FacturadorStudioContent
            currentUiTheme={globalUiTheme}
            documentTabs={tabs}
            activeTabId={activeInvoiceTabId}
            onSelectTab={handleSwitchDocumentTab}
            onCloseTab={(id) => {
              const tab = tabs.find(t => t.id === id || t.cvId === id);
              handleCloseFooterTab({ stopPropagation: () => {} } as any, id, tab?.title || 'Documento');
            }}
            onNavigateToDocument={(targetDocType, id) => handleNavigateToDocumentTab(targetDocType, id)}
            onTabsChanged={setTabs}
            onNewCV={handleNewCV}
            onNewCard={handleNewCard}
            onNewBook={handleNewBook}
            onNewPlanner={handleNewPlanner}
            onNewInvoice={handleNewInvoice}
            cycleUITheme={cycleUITheme}
            onOpenShareAppModal={() => setIsShareAppModalOpen(true)}
            onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
          />
        </Suspense>
        {appModals}
      </>
    );
  }

  if (currentRoute === '/crear-agenda') {
    const activePlannerTab = tabs.find(t => t.docType === 'planner' || inferDocumentTypeId(t) === 'planner');
    if (!activePlannerTab) {
      return (
        <div className="flex items-center justify-center h-screen text-sm opacity-60 animate-pulse">Cargando Estudio de Agendas...</div>
      );
    }
    const activePlannerTabId = activePlannerTab?.id || activePlannerTab?.cvId || cvData?.id || '';
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-screen text-sm opacity-60 animate-pulse">Cargando Estudio de Agendas...</div>}>
        <PlannerStudioContent 
          documentTabs={tabs}
          activeTabId={activePlannerTabId}
          onSelectTab={handleSwitchDocumentTab}
          onCloseTab={(id) => {
            const tab = tabs.find(t => t.id === id || t.cvId === id);
            handleCloseFooterTab({ stopPropagation: () => {} } as any, id, tab?.title || 'Documento');
          }}
          onNavigateToDocument={(targetDocType, id) => handleNavigateToDocumentTab(targetDocType, id)}
          onTabsChanged={setTabs}
          onNewCV={handleNewCV}
          onNewCard={handleNewCard}
          onNewBook={handleNewBook}
          onNewPlanner={handleNewPlanner}
          currentUiTheme={globalUiTheme}
          cycleUITheme={cycleUITheme}
          onOpenSavedCVsModal={() => setIsSavedCVsOpen(true)}
          onOpenSaveAsModal={() => setIsSaveAsModalOpen(true)}
          onOpenJsonDownloadModal={() => setIsDownloadModalOpen(true)}
          onOpenShareAppModal={() => setIsShareAppModalOpen(true)}
          onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
        />
      </Suspense>
    );
  }

  return (
    <AppShell
      docType={activeDocType}
      isPanelOpen={isPanelOpen}
      mobileTabState={mobileTabState}
      containerRef={viewport.containerRef}
      navbarSlot={
        <Navbar 
          currentCvData={cvData}
          currentUiTheme={globalUiTheme}
          setCvData={setCvData}
          onOpenSavedCVsModal={() => setIsSavedCVsOpen(true)}
          onSaveCVClick={handleSaveCVClick}
          onOpenSaveAsModal={() => setIsSaveAsModalOpen(true)}
          onOpenJsonDownloadModal={() => setIsDownloadModalOpen(true)}
          onPrint={handleExportPDFClick}
          onOpenAtsCheck={handleOpenAtsCheck}
          atsScore={atsLiveScore}
          onOpenPricing={() => setIsPricingModalOpen(true)}
          onOpenCreditsModal={() => setIsCreditsModalOpen(true)}
          onOpenShareAppModal={() => setIsShareAppModalOpen(true)}
          onOpenPrivacy={() => setIsPrivacyModalOpen(true)}

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
          onGenerateCoverLetterFromCV={handleGenerateCoverLetterFromCV}
          onExportCoverLetter={() => setIsCoverLetterExportOpen(true)}
          onRefreshCredits={refreshEntitlements}
          atsScore={atsLiveScore}
          onCreateApplicationVariant={() => createApplicationVariantFor({})}
          onBackToBaseCV={() => { if (cvData?.sourceCvTabId) handleSwitchDocumentTab(cvData.sourceCvTabId, 'cv'); }}
        />
      }
      mainSlot={
        <Suspense fallback={
          <div className="w-full h-[600px] flex flex-col items-center justify-center p-8 text-[var(--ui-text-secondary)]">
            <div className="w-10 h-10 border-4 border-[var(--color-accent-base)] border-t-transparent rounded-full animate-spin mb-4" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ui-text-primary)]">Preparando la vista previa…</span>
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
        onNewPlanner: handleNewPlanner,
        onNewInvoice: handleNewInvoice,
        onClose: handleCloseFooterTab
      }}
      modalsSlot={appModals}
    />
  );
}

export default function App() {
  const [isLandingLoginOpen, setIsLandingLoginOpen] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    const path = navigation.getPathname();
    if (path === '/crear-carta') return '/crear-cv';
    if (path === '/crear-cv' || path === '/crear-tarjeta' || path === '/crear-libro' || path === '/crear-agenda' || path === '/crear-factura' || path.startsWith('/blog')) {
      return path;
    }
    return '/';
  });

  useEffect(() => {
    const syncRoute = () => {
      const path = navigation.getPathname();
      if (path === '/crear-carta') {
        navigation.replace('/crear-cv');
        setCurrentRoute('/crear-cv');
        return;
      }
      setCurrentRoute(path);
    };

    if (navigation.getPathname() === '/crear-carta') {
      navigation.replace('/crear-cv');
    }
    const handlePopState = () => {
      syncRoute();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    trackPageView(currentRoute);
  }, [currentRoute]);

  const navigateTo = (route: string) => {
    const targetRoute = route === '/crear-carta' ? '/crear-cv' : route;
    navigation.push(targetRoute);
    setCurrentRoute(targetRoute);
  };

  return (
    <ConfirmProvider>
      <CVProvider>
        {currentRoute.startsWith('/blog') ? (
          <>
            <Suspense fallback={<div className="flex items-center justify-center h-screen text-sm opacity-60 animate-pulse">Cargando Blog...</div>}>
              <BlogModule initialSlug={currentRoute.replace('/blog', '').replace('/', '') || undefined} onNavigateHome={() => navigateTo('/')} onNavigateProduct={(r) => navigateTo(r)} />
            </Suspense>
          </>
        ) : currentRoute === '/' ? (
          <>
            <Suspense fallback={<div className="flex items-center justify-center h-screen text-sm opacity-60 animate-pulse">Cargando LEECV...</div>}>
              <LandingPage onNavigate={(r) => navigateTo(r)} onOpenLogin={() => setIsLandingLoginOpen(true)} />
            {isLandingLoginOpen && (
              <LoginModal
                isOpen={isLandingLoginOpen}
                onClose={() => setIsLandingLoginOpen(false)}
                onSuccess={() => {
                  setIsLandingLoginOpen(false);
                  navigateTo('/crear-cv');
                }}
              />
            )}
            </Suspense>
          </>
        ) : currentRoute.startsWith('/cv/') ? (
          <>
            <Suspense fallback={<div className="flex items-center justify-center h-screen text-sm opacity-60 animate-pulse">Cargando página de rol...</div>}>
              <JobRoleLandingPage />
            </Suspense>
          </>
        ) : (
          <>
            <AppContent currentRoute={currentRoute} onNavigate={(r) => navigateTo(r)} />
          </>
        )}
        <CookieConsentBanner />
      </CVProvider>
    </ConfirmProvider>
  );
}
