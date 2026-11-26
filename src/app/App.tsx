import React, { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { useDocumentTabs } from '../shared/core/documents/useDocumentTabs';
import { LoginModal } from '../modules/auth/components/LoginModal';
import { getGlobalUiTheme, cycleGlobalUiTheme, subscribeToGlobalUiTheme } from '../shared/core/utils/globalThemePreference';
import { CookieConsentBanner } from '../shared/core/ui/CookieConsentBanner';
import { navigation } from '../shared/core/utils/navigation';
import { CVProvider, useCVContext } from '../context/CVContext';
import { useToast } from '../shared/core/ui/Toast';
import { ConfirmProvider } from '../shared/core/ui/ConfirmDialog';
import { trackPageView } from '../shared/core/analytics/analyticsService';
import { getDocTypeForRoute, getDocumentTypeConfig, inferDocumentTypeId } from '../shared/core/capabilities/capabilityRegistry';
import {
  findStandaloneStudioByRoute,
  isKnownAppRoute,
  resolveActiveDocTypeForRoute,
  resolveInitialTabForDocument,
} from './appRegistry';
import { StudioRoute } from './StudioRoute';
import { usePaymentReturnAndUpdates } from './usePaymentReturnAndUpdates';
import { useDocumentCreation } from './useDocumentCreation';
import { useWorkspaceModalsAndExport } from './useWorkspaceModalsAndExport';
import { useAppNavigationAndTabs } from './useAppNavigationAndTabs';
import { initPwaFileLaunchHandler } from '../shared/core/pwa/fileLaunchHandler';
import { setPendingDocumentToOpen } from '../shared/core/storage/pendingDocumentHandoff';
import { openTab as addOpenTab, getOpenTabs, setActiveTabId } from '../shared/core/documents/tabStore';
import { computeAutoDocumentTitle } from '../shared/core/documents/documentEngine';

const LandingPage = lazy(() => import('../modules/landing/LandingPage').then((m) => ({ default: m.LandingPage })));
const BlogModule = lazy(() => import('../modules/blog/BlogModule').then((m) => ({ default: m.BlogModule })));
const JobRoleLandingPage = lazy(() => import('../modules/landing/components/JobRoleLandingPage').then((m) => ({ default: m.default })));
const CvWorkspaceContent = lazy(() => import('./CvWorkspaceContent'));
const AppModals = lazy(() => import('./AppModals').then((m) => ({ default: m.AppModals })));

export const DEFAULT_PLANNER_PRESET_ID = 'planner-clasico';
export const DEFAULT_BOOK_PRESET_ID = 'libro-standard';

interface AppContentProps {
  initialPreset?: string;
  currentRoute?: string;
  onNavigate?: (route: string) => void;
}

function AppContent({ initialPreset = 'cv-clasico', currentRoute, onNavigate }: AppContentProps) {
  const {
    cvData,
    setCvData,
    resetToBlankCV,
    saveCV,
    saveCVAs,
    undo,
    redo,
    canUndo,
    canRedo,
    isSaving,
    hasPendingChanges,
    isSwitchingDocument,
    setIsSwitchingDocument,
  } = useCVContext();

  const { showSuccess, showError } = useToast();

  const [globalUiTheme, setGlobalUiTheme] = useState<string>(() => getGlobalUiTheme());
  useEffect(() => subscribeToGlobalUiTheme(setGlobalUiTheme), []);
  const cycleUITheme = () => setGlobalUiTheme(cycleGlobalUiTheme());

  const { updateBannerVisible, setUpdateBannerVisible } = usePaymentReturnAndUpdates({
    isSaving,
    hasPendingChanges,
  });

  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    const inferred = cvData
      ? inferDocumentTypeId(cvData)
      : getDocumentTypeConfig(inferDocumentTypeId({ activePresetId: initialPreset })).id;
    return resolveInitialTabForDocument(inferred, cvData);
  });

  const prevCvIdRef = useRef(cvData?.id);
  useEffect(() => {
    if (cvData?.id && prevCvIdRef.current && prevCvIdRef.current !== cvData.id) {
      setActiveTab(resolveInitialTabForDocument(inferDocumentTypeId(cvData), cvData));
    }
    prevCvIdRef.current = cvData?.id;
  }, [cvData?.id, cvData?.activePresetId, (cvData as any)?.cardSize, (cvData as any)?.docType, cvData?.doc_type_id]);

  const navigateToRoute = useCallback(
    (targetRoute: string) => {
      if (onNavigate) {
        onNavigate(targetRoute);
      } else if (typeof window !== 'undefined') {
        window.history.pushState({}, '', targetRoute);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    },
    [onNavigate],
  );

  const standaloneStudio = findStandaloneStudioByRoute(currentRoute);

  const { tabs, setTabs, activeCvId } = useDocumentTabs({
    cvData,
    isSwitchingDocument,
    currentRoute,
    isSharedCvWorkspaceRoute: !standaloneStudio,
    hasPendingChanges,
    setCvData,
    setIsSwitchingDocument,
  });

  useEffect(() => {
    return initPwaFileLaunchHandler({
      onDocumentOpened: ({ docType, data, route, fileName }) => {
        const title = computeAutoDocumentTitle(docType as any, data);
        addOpenTab(data.id, docType as any, title);
        setActiveTabId(data.id);
        setPendingDocumentToOpen(data.id, docType as any);
        setTabs(getOpenTabs());
        if (route === '/crear-cv') {
          setCvData(data);
        }
        navigateToRoute(route);
        showSuccess(`Archivo abierto (${fileName}).`);
      },
      onError: (msg) => showError(msg),
    });
  }, [navigateToRoute, setCvData, setTabs, showError, showSuccess]);

  const {
    createBlankDocumentWithTab,
    createApplicationVariantFor,
    handleGenerateCoverLetterFromCV,
    handleNewDocument,
  } = useDocumentCreation({
    cvData,
    currentRoute,
    resetToBlankCV,
    saveCV,
    saveCVAs,
    setTabs,
    setActiveTab,
    navigateToRoute,
  });

  const {
    handleSwitchDocumentTab,
    handleNavigateToDocumentTab,
    goToLandingPage,
    handleCloseFooterTab,
  } = useAppNavigationAndTabs({
    currentRoute,
    cvData,
    setCvData,
    saveCV,
    hasPendingChanges,
    isSwitchingDocument,
    setIsSwitchingDocument,
    tabs,
    setTabs,
    activeCvId,
    createBlankDocumentWithTab,
    navigateToRoute,
  });

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

  const activeDocType = resolveActiveDocTypeForRoute(currentRoute, cvData);
  const modalCtrl = useWorkspaceModalsAndExport({
    cvData, setCvData, activeDocType, activeTab, setActiveTab, isPanelOpen, setIsPanelOpen,
    isSaving, hasPendingChanges, activeCvId, setTabs, updateBannerVisible, setUpdateBannerVisible,
    handleSaveCVClick, createApplicationVariantFor, handleGenerateCoverLetterFromCV, goToLandingPage,
  });

  const appModals = (
    <Suspense fallback={null}>
      <AppModals {...modalCtrl.appModalsProps} />
    </Suspense>
  );

  if (standaloneStudio) {
    return (
      <StudioRoute
        entry={standaloneStudio} tabs={tabs} cvDataId={cvData?.id}
        globalUiTheme={globalUiTheme} cycleUITheme={cycleUITheme} onBackToHome={goToLandingPage}
        onSelectTab={handleSwitchDocumentTab} onCloseTab={handleCloseFooterTab}
        onNavigateToDocument={handleNavigateToDocumentTab} onTabsChanged={setTabs}
        onNewDocument={handleNewDocument} onOpenSavedCVsModal={modalCtrl.openSavedCVs}
        onOpenSaveAsModal={modalCtrl.openSaveAsModal} onOpenJsonDownloadModal={modalCtrl.openJsonDownloadModal}
        onOpenCreditsModal={modalCtrl.openCreditsModal}
        onOpenShareAppModal={modalCtrl.openShareAppModal} onOpenPrivacy={modalCtrl.openPrivacy}
        modalsSlot={appModals}
      />
    );
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[var(--ui-bg-panel)] text-[var(--ui-text-secondary)] text-sm font-semibold">Cargando Editor…</div>}>
      <CvWorkspaceContent
        currentRoute={currentRoute} cvData={cvData} setCvData={setCvData}
        globalUiTheme={globalUiTheme} cycleUITheme={cycleUITheme}
        activeTab={activeTab} setActiveTab={setActiveTab} isPanelOpen={isPanelOpen} setIsPanelOpen={setIsPanelOpen}
        isSaving={isSaving} undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo}
        tabs={tabs} activeCvId={activeCvId} onSwitchTab={handleSwitchDocumentTab}
        onNavigateToDocument={handleNavigateToDocumentTab} onNewDocument={handleNewDocument}
        onCloseTab={handleCloseFooterTab} onSaveCVClick={handleSaveCVClick}
        onCreateApplicationVariant={() => createApplicationVariantFor({})}
        onGenerateCoverLetterFromCV={handleGenerateCoverLetterFromCV}
        onOpenPhotoCropper={modalCtrl.openPhotoCropper} onOpenSignature={modalCtrl.openSignature}
        onOpenSavedCVs={modalCtrl.openSavedCVs} onOpenSaveAsModal={modalCtrl.openSaveAsModal}
        onOpenJsonDownloadModal={modalCtrl.openJsonDownloadModal} onOpenPricing={modalCtrl.openPricing}
        onOpenCreditsModal={modalCtrl.openCreditsModal} onOpenShareAppModal={modalCtrl.openShareAppModal}
        onOpenPrivacy={modalCtrl.openPrivacy} onOpenCardExport={modalCtrl.openCardExport}
        onOpenCoverLetterExport={modalCtrl.openCoverLetterExport} onOpenAtsLivePanel={modalCtrl.openAtsLivePanel}
        onOpenRegionFormat={modalCtrl.openRegionFormatModal}
        onOpenAtsModalWithResult={modalCtrl.openAtsModalWithResult}
        onOpenPdfCheckoutForExport={modalCtrl.openPdfCheckoutForExport}
        onStartPDFGeneration={modalCtrl.handleStartPDFGeneration} onAtsLiveResultChange={modalCtrl.setAtsLiveResult}
        modalsSlot={appModals}
      />
    </Suspense>
  );
}

export default function App() {
  const [isLandingLoginOpen, setIsLandingLoginOpen] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    const path = navigation.getPathname();
    if (path === '/crear-carta') return '/crear-cv';
    return isKnownAppRoute(path) ? path : '/';
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
    if (navigation.getPathname() === '/crear-carta') navigation.replace('/crear-cv');
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  useEffect(() => { trackPageView(currentRoute); }, [currentRoute]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (currentRoute === '/') {
      document.title = 'LEECV — CV, Tesis, Libros, FacturLee y Agendas en tu navegador';
      return;
    }
    if (isKnownAppRoute(currentRoute) && !currentRoute.startsWith('/blog') && !currentRoute.startsWith('/cv/')) {
      const cfg = getDocumentTypeConfig(getDocTypeForRoute(currentRoute));
      document.title = cfg.seo?.title || `${cfg.titlePrefix} — ${cfg.name} | LEECV`;
    }
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
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[var(--ui-bg-panel)] text-[var(--ui-text-secondary)] text-sm font-semibold">Cargando Blog…</div>}>
            <BlogModule initialSlug={currentRoute.replace('/blog', '').replace('/', '') || undefined} onNavigateHome={() => navigateTo('/')} onNavigateProduct={navigateTo} />
          </Suspense>
        ) : currentRoute === '/' ? (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[var(--ui-bg-panel)] text-[var(--ui-text-secondary)] text-sm font-semibold">Cargando LEECV…</div>}>
            <LandingPage onNavigate={navigateTo} onOpenLogin={() => setIsLandingLoginOpen(true)} />
            {isLandingLoginOpen && (
              <LoginModal isOpen={isLandingLoginOpen} onClose={() => setIsLandingLoginOpen(false)} onSuccess={() => { setIsLandingLoginOpen(false); navigateTo('/crear-cv'); }} />
            )}
          </Suspense>
        ) : currentRoute.startsWith('/cv/') ? (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[var(--ui-bg-panel)] text-[var(--ui-text-secondary)] text-sm font-semibold">Cargando página de rol…</div>}>
            <JobRoleLandingPage />
          </Suspense>
        ) : (
          <AppContent currentRoute={currentRoute} onNavigate={navigateTo} />
        )}
        <CookieConsentBanner />
      </CVProvider>
    </ConfirmProvider>
  );
}
