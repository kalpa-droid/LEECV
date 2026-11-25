import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import StudioNavbar, { type NavbarGlobalAction } from '../shared/core/studio-host/StudioNavbar';
import StudioDock from '../shared/core/studio-host/StudioDock';
import EditorPanel from '../modules/cv-builder/components/EditorPanel';
import { AppShell } from '../shared/core/ui/AppShell';
import { OpenTab as OpenTabItem } from '../shared/core/documents/tabStore';
import { hasCapability } from '../shared/core/capabilities/capabilityRegistry';
import { PRODUCT_ICON_IDS } from '../shared/core/ui/iconCatalog';
import { navigation } from '../shared/core/utils/navigation';
import { withErrorHandling } from '../shared/core/utils/errorHandler';
import { useExportEntitlement } from '../shared/core/entitlements/useExportEntitlement';
import { useEntitlements } from '../shared/core/entitlements/useEntitlements';
import { useToast } from '../shared/core/ui/Toast';
import { useDocumentViewport } from '../shared/core/viewport';
import { useAtsLiveScore } from '../shared/core/ats/useAtsLiveScore';
import type { AtsPreflightResult } from '../shared/core/pdf-engine/layers/ats/atsPreflightCheck';
import type { DocumentTypeId } from '../types/document';
import { resolveActiveDocTypeForRoute } from './appRegistry';

const CVPreview = lazy(() => import('../modules/cv-builder/components/CVPreview'));

export interface CvWorkspaceContentProps {
  currentRoute?: string;
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
  globalUiTheme: string;
  cycleUITheme: () => void;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  isPanelOpen: boolean;
  setIsPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isSaving: boolean;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  tabs: OpenTabItem[];
  activeCvId: string;
  onSwitchTab: (targetId: string, targetDocType?: string) => void;
  onNavigateToDocument: (targetDocType: DocumentTypeId, targetId: string) => void;
  onNewDocument: (docType: DocumentTypeId) => void;
  onCloseTab: (e: React.MouseEvent, id: string, title: string) => void;
  onSaveCVClick: () => void;
  onCreateApplicationVariant: () => void;
  onGenerateCoverLetterFromCV: (source?: any) => void;
  onOpenPhotoCropper: () => void;
  onOpenSignature: () => void;
  onOpenSavedCVs: () => void;
  onOpenSaveAsModal: () => void;
  onOpenJsonDownloadModal: () => void;
  onOpenPricing: () => void;
  onOpenCreditsModal: () => void;
  onOpenShareAppModal: () => void;
  onOpenPrivacy: () => void;
  onOpenCardExport: () => void;
  onOpenCoverLetterExport: () => void;
  onOpenAtsLivePanel: () => void;
  onOpenRegionFormat?: () => void;
  onOpenAtsModalWithResult: (result: AtsPreflightResult) => void;
  onOpenPdfCheckoutForExport: () => void;
  onStartPDFGeneration: () => Promise<void>;
  onAtsLiveResultChange?: (result: AtsPreflightResult | null) => void;
  modalsSlot: React.ReactNode;
}

export const CvWorkspaceContent: React.FC<CvWorkspaceContentProps> = ({
  currentRoute,
  cvData,
  setCvData,
  globalUiTheme,
  cycleUITheme,
  activeTab,
  setActiveTab,
  isPanelOpen,
  setIsPanelOpen,
  isSaving,
  undo,
  redo,
  canUndo,
  canRedo,
  tabs,
  activeCvId,
  onSwitchTab,
  onNavigateToDocument,
  onNewDocument,
  onCloseTab,
  onSaveCVClick,
  onCreateApplicationVariant,
  onGenerateCoverLetterFromCV,
  onOpenPhotoCropper,
  onOpenSignature,
  onOpenSavedCVs,
  onOpenSaveAsModal,
  onOpenJsonDownloadModal,
  onOpenPricing,
  onOpenCreditsModal,
  onOpenShareAppModal,
  onOpenPrivacy,
  onOpenCardExport,
  onOpenCoverLetterExport,
  onOpenAtsLivePanel,
  onOpenRegionFormat,
  onOpenAtsModalWithResult,
  onOpenPdfCheckoutForExport,
  onStartPDFGeneration,
  onAtsLiveResultChange,
  modalsSlot,
}) => {
  const { showInfo } = useToast();
  const { consumeCreditIfNeeded } = useExportEntitlement();
  const { refreshEntitlements } = useEntitlements();

  const activeDocType: DocumentTypeId = resolveActiveDocTypeForRoute(currentRoute, cvData);

  const activePageSizeId =
    (cvData as any)?.layout?.pageSizeId ||
    (cvData as any)?.layout?.paperSize ||
    (cvData as any)?.documentSettings?.paperSizeId ||
    (hasCapability(activeDocType, 'qr_code') ? ((cvData as any)?.cardSize || 'tarjeta_estandar') : 'a4');

  const viewport = useDocumentViewport({ pageSizeId: activePageSizeId });

  const atsLive = useAtsLiveScore(cvData, cvData?.jobTarget?.jobDescription);
  const atsLiveScore = atsLive.score;

  useEffect(() => {
    onAtsLiveResultChange?.(atsLive?.result ?? null);
  }, [atsLive?.result, onAtsLiveResultChange]);

  const appliedToolParamRef = useRef(false);
  useEffect(() => {
    if (appliedToolParamRef.current) return;
    const tool = navigation.getSearchParams().get('tool');
    if (tool === 'carta') {
      appliedToolParamRef.current = true;
      setActiveTab('carta');
      setIsPanelOpen(true);
    } else if (tool === 'tarjeta') {
      appliedToolParamRef.current = true;
      onOpenCardExport();
    }
  }, [onOpenCardExport, setActiveTab, setIsPanelOpen]);

  const handleExportPDFClick = useCallback(async () => {
    if (cvData?.activePresetId === 'tarjeta-personal') {
      onOpenCardExport();
      return;
    }

    if (hasCapability(activeDocType, 'cover_letter_body')) {
      onOpenCoverLetterExport();
      return;
    }

    const [{ resolveActivePreset }, { cvDataToContentSections }, { runAtsPreflightCheck }] =
      await Promise.all([
        import('../shared/core/pdf-engine/layers/presets/presetRegistry'),
        import('../shared/core/pdf-engine/layers/records/cvDataAdapter'),
        import('../shared/core/pdf-engine/layers/ats/atsPreflightCheck'),
      ]);

    const preset = resolveActivePreset(cvData);
    const sections = cvDataToContentSections(cvData);
    const preflight = runAtsPreflightCheck(
      preset,
      sections,
      cvData,
      cvData?.jobTarget?.jobDescription,
    );

    if (preflight.score < 100) {
      onOpenAtsModalWithResult(preflight);
      showInfo('Revisá estas advertencias antes de descargar tu CV.');
      return;
    }

    const allowed = await consumeCreditIfNeeded();
    if (!allowed) {
      onOpenPdfCheckoutForExport();
      return;
    }
    await onStartPDFGeneration();
  }, [
    activeDocType,
    consumeCreditIfNeeded,
    cvData,
    onOpenAtsModalWithResult,
    onOpenCardExport,
    onOpenCoverLetterExport,
    onOpenPdfCheckoutForExport,
    onStartPDFGeneration,
    showInfo,
  ]);

  const handleCloseMobilePanel = useCallback(() => {
    setIsPanelOpen(false);
    viewport.fitAndCenter();
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        setTimeout(viewport.fitAndCenter, 120);
      });
    }
  }, [setIsPanelOpen, viewport]);

  const globalActions: NavbarGlobalAction[] = useMemo(() => {
    if (!hasCapability(activeDocType, 'experience')) return [];
    return [
      {
        id: 'cover_letter_handoff',
        label: 'Carta',
        mobileLabel: 'Carta',
        tooltip: 'Carta de Presentación gratis incluida con tu CV',
        ariaLabel: 'Abrir Carta de Presentación gratis',
        iconId: PRODUCT_ICON_IDS.carta,
        tone: 'secondary',
        active: activeTab === 'carta' && isPanelOpen,
        onClick: () => {
          setActiveTab('carta');
          setIsPanelOpen(true);
        },
      },
      {
        id: 'business_card_handoff',
        label: 'Tarjeta',
        mobileLabel: 'Tarjeta',
        tooltip: 'Tarjeta Personal con código QR gratis desde tu CV',
        ariaLabel: 'Crear Tarjeta Personal gratis',
        iconId: PRODUCT_ICON_IDS.tarjeta,
        tone: 'accent',
        onClick: onOpenCardExport,
      },
    ];
  }, [activeDocType, activeTab, isPanelOpen, onOpenCardExport, setActiveTab, setIsPanelOpen]);

  return (
    <AppShell
      docType={activeDocType}
      isPanelOpen={isPanelOpen}
      containerRef={viewport.containerRef}
      navbarSlot={
        <StudioNavbar
          docType={activeDocType}
          undo={undo}
          redo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          currentCvData={cvData}
          currentUiTheme={globalUiTheme}
          setCvData={setCvData}
          onOpenSavedCVsModal={onOpenSavedCVs}
          onSaveCVClick={onSaveCVClick}
          onOpenSaveAsModal={onOpenSaveAsModal}
          onOpenJsonDownloadModal={onOpenJsonDownloadModal}
          onPrint={() => {
            void withErrorHandling(handleExportPDFClick, {
              context: 'Preparar exportación PDF',
              errorMessage: 'No se pudo preparar la exportación en PDF.',
            });
          }}
          onOpenAtsCheck={onOpenAtsLivePanel}
          atsScore={atsLiveScore}
          onOpenRegionFormat={onOpenRegionFormat}
          globalActions={globalActions}
          onOpenPricing={onOpenPricing}
          onOpenCreditsModal={onOpenCreditsModal}
          onOpenShareAppModal={onOpenShareAppModal}
          onOpenPrivacy={onOpenPrivacy}
          isSaving={isSaving}
          zoomLevel={viewport.zoomLevel}
          setZoomLevel={viewport.setZoomLevel}
          triggerAutoFit={viewport.fitAndCenter}
          isAutoFitMode={viewport.isAutoFitMode}
          cycleUITheme={cycleUITheme}
          isPanelOpen={isPanelOpen}
          onCloseMobilePanel={handleCloseMobilePanel}
        />
      }
      dockSlot={
        <StudioDock
          cvData={cvData}
          setCvData={setCvData}
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setIsPanelOpen(true);
          }}
          isPanelOpen={isPanelOpen}
          setIsPanelOpen={setIsPanelOpen}
          onOpenAtsCheck={onOpenAtsLivePanel}
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
          onOpenPhotoCropper={onOpenPhotoCropper}
          onOpenSignature={onOpenSignature}
          onOpenSavedCVs={onOpenSavedCVs}
          onGenerateCoverLetterFromCV={onGenerateCoverLetterFromCV}
          onExportCoverLetter={onOpenCoverLetterExport}
          onRefreshCredits={refreshEntitlements}
          atsScore={atsLiveScore}
          onOpenRegionFormat={onOpenRegionFormat}
          onCreateApplicationVariant={onCreateApplicationVariant}
          onBackToBaseCV={() => {
            if (cvData?.sourceCvTabId) onSwitchTab(cvData.sourceCvTabId, 'cv');
          }}
        />
      }
      mainSlot={
        <Suspense
          fallback={
            <div className="w-full h-[600px] flex flex-col items-center justify-center p-8 text-[var(--ui-text-secondary)]">
              <div className="w-10 h-10 border-4 border-[var(--color-accent-base)] border-t-transparent rounded-full animate-spin mb-4" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--ui-text-primary)]">
                Preparando la vista previa…
              </span>
            </div>
          }
        >
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
        tabs,
        activeId: activeCvId,
        onSwitch: onSwitchTab,
        onNavigateToDocument,
        onNewDocument,
        onAdd: () => onNewDocument('cv'),
        onNewCV: () => onNewDocument('cv'),
        onNewCard: () => onNewDocument('business_card'),
        onNewBook: () => onNewDocument('book'),
        onNewCoverLetter: () => onNewDocument('cover_letter'),
        onNewPlanner: () => onNewDocument('planner'),
        onNewInvoice: () => onNewDocument('invoice'),
        onNewEditorial: () => onNewDocument('editorial'),
        onClose: onCloseTab,
      }}
      modalsSlot={modalsSlot}
    />
  );
};

export default CvWorkspaceContent;
