import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '../../shared/core/ui/AppShell';
import StudioNavbar from '../../shared/core/studio-host/StudioNavbar';
import StudioDock from '../../shared/core/studio-host/StudioDock';
// ⚠️ NO envolver CardSheetDocument en React.lazy/Suspense: @react-pdf/renderer usa su propio reconciler.
import { CardSheetDocument } from '../../shared/core/pdf-engine/renderer/CardSheetDocument';
import { VectorDocViewer } from '../../shared/core/pdf-engine/VectorDocViewer';
import { resolveActivePreset } from '../../shared/core/pdf-engine/layers/presets/presetRegistry';
import {
  buildCardDataFromCV,
  BusinessCardData,
} from '../../shared/core/pdf-engine/layers/records/cardDataAdapter';
import { DocumentTypeId } from '../../types/document';
import { useDocumentViewport, useViewportGestures } from '../../shared/core/viewport';
import { OpenTab } from '../../shared/core/documents/tabStore';
import {
  AUTOSAVE_DEBOUNCE_MS,
  computeAutoDocumentTitle,
  resolveDocumentIdWithHandoff,
  useRegisterDocumentTab,
} from '../../shared/core/documents/documentEngine';
import { loadCardById, saveCard } from '../../shared/core/storage/documentStorageService';
import { useToast } from '../../shared/core/ui/Toast';
import { FloatingAssistant } from '../../shared/core/studio-host/FloatingAssistant';
import { elevationSystem, radius } from '../../shared/core/uiDesignSystem';
import { createBlankCardDocumentData } from './domain/cardContactImport';
import { CardSizeSection } from './ui/CardSizeSection';
import { CardExtractSection } from './ui/CardExtractSection';
import { CardLogoSection } from './ui/CardLogoSection';
import { CardFrontSection } from './ui/CardFrontSection';
import { CardBackSection } from './ui/CardBackSection';
import { CardQrSection } from './ui/CardQrSection';
import { CardExportModal } from './ui/CardExportModal';

interface CardStudioContentProps {
  currentUiTheme?: string;
  documentTabs: OpenTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNavigateToDocument: (targetDocType: DocumentTypeId, id: string) => void;
  onNewDocument?: (docType: DocumentTypeId) => void;
  onNewCV?: () => void;
  onNewCard?: () => void;
  onNewBook?: () => void;
  onNewPlanner?: () => void;
  cycleUITheme: () => void;
  onTabsChanged?: (tabs: OpenTab[]) => void;
  onOpenSavedCVsModal?: () => void;
  onOpenSaveAsModal?: () => void;
  onOpenJsonDownloadModal?: () => void;
  onOpenShareAppModal?: () => void;
  onOpenPrivacy?: () => void;
}

export const CardStudioContent: React.FC<CardStudioContentProps> = ({
  currentUiTheme = 'day',
  documentTabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNavigateToDocument,
  onNewDocument,
  onNewCV,
  onNewCard,
  onNewBook,
  onNewPlanner,
  cycleUITheme,
  onTabsChanged = () => {},
  onOpenSavedCVsModal,
  onOpenSaveAsModal,
  onOpenJsonDownloadModal,
  onOpenShareAppModal,
  onOpenPrivacy,
}) => {
  const { showSuccess, showError } = useToast();
  const [activeStepTab, setActiveStepTab] = useState<string>('card_front');
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  const cardId = useMemo(
    () => resolveDocumentIdWithHandoff(activeTabId, 'business_card'),
    [activeTabId],
  );

  const [cardDocData, setCardDocData] = useState<any>(() =>
    createBlankCardDocumentData(cardId),
  );
  const [preparedCardData, setPreparedCardData] = useState<BusinessCardData | null>(null);
  const hydratedIdRef = useRef<string | null>(null);
  const hasEditedRef = useRef<boolean>(false);

  const viewport = useDocumentViewport({ pageSizeId: 'a4' });
  const sheetRef = useRef<HTMLDivElement>(null);

  useViewportGestures({
    containerRef: viewport.containerRef,
    sheetRef,
    onZoomChange: viewport.setZoomLevel,
    zoomLevel: viewport.zoomLevel,
  });

  useEffect(() => {
    let active = true;
    hydratedIdRef.current = null;
    hasEditedRef.current = false;

    void (async () => {
      try {
        const saved = await loadCardById(cardId);
        if (!active) return;
        if (saved) {
          setCardDocData({
            ...createBlankCardDocumentData(cardId),
            ...saved,
            id: cardId,
          });
        } else {
          setCardDocData(createBlankCardDocumentData(cardId));
        }
      } catch (err) {
        console.warn('Error cargando tarjeta local:', err);
      } finally {
        if (active) hydratedIdRef.current = cardId;
      }
    })();

    return () => {
      active = false;
    };
  }, [cardId]);

  const cardTitle = useMemo(
    () => computeAutoDocumentTitle('business_card', cardDocData),
    [cardDocData],
  );

  useRegisterDocumentTab({
    id: cardId,
    docType: 'business_card',
    title: cardTitle,
    documentTabs,
    onTabsChanged,
  });

  const handleUpdateCardData: React.Dispatch<React.SetStateAction<any>> = useCallback(
    (updater) => {
      hasEditedRef.current = true;
      setCardDocData((prev: any) =>
        typeof updater === 'function' ? updater(prev) : updater,
      );
    },
    [],
  );

  useEffect(() => {
    if (hydratedIdRef.current !== cardId || !hasEditedRef.current) return;
    const timer = window.setTimeout(() => {
      void saveCard({
        ...cardDocData,
        id: cardId,
        docType: 'business_card',
        title: cardTitle,
      });
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [cardDocData, cardId, cardTitle]);

  useEffect(() => {
    let cancelled = false;
    buildCardDataFromCV(cardDocData)
      .then((built) => {
        if (!cancelled) setPreparedCardData(built);
      })
      .catch((err) => console.warn('Error generando preview de tarjeta:', err));
    return () => {
      cancelled = true;
    };
  }, [cardDocData]);

  const activePreset = useMemo(
    () =>
      resolveActivePreset({
        ...cardDocData,
        activePresetId: cardDocData?.activePresetId || 'tarjeta-personal',
      }),
    [cardDocData],
  );

  const persistCardState = useCallback(async () => {
    try {
      const res = await saveCard({
        ...cardDocData,
        id: cardId,
        docType: 'business_card',
        title: cardTitle,
        updatedAt: new Date().toISOString(),
      });
      if (res?.success) {
        showSuccess(`Tarjeta guardada: "${res.title || cardTitle}"`);
      } else {
        showError('No pudimos guardar la tarjeta.');
      }
    } catch {
      showError('Ocurrió un inconveniente al guardar la tarjeta.');
    }
  }, [cardDocData, cardId, cardTitle, showSuccess, showError]);

  const pdfElement = useMemo(() => {
    if (!preparedCardData) return null;
    return <CardSheetDocument card={preparedCardData} preset={activePreset} />;
  }, [preparedCardData, activePreset]);

  return (
    <>
      <AppShell
        docType="business_card"
        isPanelOpen={isPanelOpen}
        containerRef={viewport.containerRef}
        navbarSlot={
          <StudioNavbar
            docType="business_card"
            currentCvData={cardDocData}
            currentUiTheme={currentUiTheme}
            onOpenSavedCVsModal={onOpenSavedCVsModal || (() => {})}
            onSaveCVClick={persistCardState}
            onOpenSaveAsModal={onOpenSaveAsModal || (() => {})}
            onOpenJsonDownloadModal={onOpenJsonDownloadModal || (() => {})}
            onPrint={() => setIsExportModalOpen(true)}
            onOpenShareAppModal={onOpenShareAppModal || (() => {})}
            onOpenPrivacy={onOpenPrivacy || (() => {})}
            zoomLevel={viewport.zoomLevel}
            setZoomLevel={viewport.setZoomLevel}
            triggerAutoFit={viewport.fitAndCenter}
            isAutoFitMode={viewport.isAutoFitMode}
            cycleUITheme={cycleUITheme}
          />
        }
        dockSlot={
          <StudioDock
            docType="business_card"
            activeTab={activeStepTab}
            setActiveTab={(tab) => {
              setActiveStepTab(tab);
              setIsPanelOpen(true);
            }}
            isPanelOpen={isPanelOpen}
            setIsPanelOpen={setIsPanelOpen}
          />
        }
        panelSlot={
          <div className="p-4 sm:p-5 space-y-6">
            {(activeStepTab === 'diseno' || activeStepTab === 'card_size') && (
              <CardSizeSection cvData={cardDocData} setCvData={handleUpdateCardData} />
            )}
            {activeStepTab === 'card_extract' && (
              <CardExtractSection cvData={cardDocData} setCvData={handleUpdateCardData} />
            )}
            {activeStepTab === 'card_logo' && (
              <CardLogoSection cvData={cardDocData} setCvData={handleUpdateCardData} />
            )}
            {activeStepTab === 'card_front' && (
              <CardFrontSection cvData={cardDocData} setCvData={handleUpdateCardData} />
            )}
            {activeStepTab === 'card_back' && (
              <CardBackSection cvData={cardDocData} setCvData={handleUpdateCardData} />
            )}
            {activeStepTab === 'card_qr' && (
              <CardQrSection cvData={cardDocData} setCvData={handleUpdateCardData} />
            )}
          </div>
        }
        mainSlot={
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-[var(--ui-bg-panel)] relative overflow-hidden">
            <div
              ref={sheetRef}
              className={`flex-1 w-full max-w-4xl overflow-hidden border border-[var(--ui-border)] bg-[var(--ui-bg-card)] rounded-[${radius.card}] ${elevationSystem.floating}`}
            >
              {pdfElement ? (
                <VectorDocViewer
                  document={pdfElement}
                  zoomLevel={viewport.zoomLevel}
                  activeTab={activeStepTab}
                  preset={activePreset}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-[var(--ui-text-secondary)]">
                  Preparando vista previa de tarjeta...
                </div>
              )}
            </div>
          </div>
        }
        tabsBarProps={{
          tabs: documentTabs,
          activeId: cardId,
          docType: 'business_card',
          onSwitch: onSelectTab,
          onNavigateToDocument: (targetType, id) => onNavigateToDocument(targetType, id),
          onAdd: onNewCard || (() => {}),
          onNewDocument,
          onNewCV,
          onNewCard,
          onNewBook,
          onNewPlanner,
          onClose: (_e, id) => onCloseTab(id),
        }}
      />
      <FloatingAssistant
        docType="business_card"
        activeTab={activeStepTab}
        cvData={cardDocData}
        onNavigate={(tabId) => {
          setActiveStepTab(tabId);
          setIsPanelOpen(true);
        }}
      />
      <CardExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        cvData={cardDocData}
        presetId={cardDocData?.activePresetId || 'tarjeta-personal'}
      />
    </>
  );
};

export default CardStudioContent;
