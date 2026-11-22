import React, { Suspense } from 'react';
import { inferDocumentTypeId } from '../shared/core/capabilities/capabilityRegistry';
import type { OpenTab } from '../shared/core/documents/tabStore';
import type { DocumentTypeId } from '../types/document';
import type { AppRuntimeEntry } from './appRegistry';

export interface StudioRouteProps {
  entry: AppRuntimeEntry;
  tabs: OpenTab[];
  cvDataId?: string;
  globalUiTheme: string;
  cycleUITheme: () => void;
  onBackToHome: () => void;
  onSelectTab: (targetId: string, targetDocType?: string) => void;
  onCloseTab: (e: React.MouseEvent, id: string, title: string) => void;
  onNavigateToDocument: (targetDocType: DocumentTypeId, id: string) => void;
  onTabsChanged: React.Dispatch<React.SetStateAction<OpenTab[]>>;
  onNewDocument: (docType: DocumentTypeId) => void;
  onOpenSavedCVsModal: () => void;
  onOpenSaveAsModal: () => void;
  onOpenJsonDownloadModal: () => void;
  onOpenShareAppModal: () => void;
  onOpenPrivacy: () => void;
  modalsSlot: React.ReactNode;
}

export const StudioRoute: React.FC<StudioRouteProps> = ({
  entry,
  tabs,
  cvDataId,
  globalUiTheme,
  cycleUITheme,
  onBackToHome,
  onSelectTab,
  onCloseTab,
  onNavigateToDocument,
  onTabsChanged,
  onNewDocument,
  onOpenSavedCVsModal,
  onOpenSaveAsModal,
  onOpenJsonDownloadModal,
  onOpenShareAppModal,
  onOpenPrivacy,
  modalsSlot,
}) => {
  const StudioComponent = entry.StudioComponent;
  if (!StudioComponent) return null;

  const activeTab =
    tabs.find(
      (t) =>
        (t.id === cvDataId || t.cvId === cvDataId) &&
        (t.docType === entry.id || inferDocumentTypeId(t) === entry.id),
    ) ||
    tabs.find((t) => t.docType === entry.id || inferDocumentTypeId(t) === entry.id);

  if (entry.autoCreateBlankTabOnRouteEnter && !activeTab) {
    return (
      <div className="flex items-center justify-center h-screen text-sm opacity-60 animate-pulse">
        {entry.loadingLabel}
      </div>
    );
  }

  const activeTabId = activeTab?.id || activeTab?.cvId || cvDataId || '';

  return (
    <>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen text-sm opacity-60 animate-pulse">
            {entry.loadingLabel}
          </div>
        }
      >
        <StudioComponent
          currentUiTheme={globalUiTheme}
          onBackToHome={onBackToHome}
          documentTabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={(id) => onSelectTab(id, entry.id)}
          onCloseTab={(id) => {
            const tab = tabs.find((t) => t.id === id || t.cvId === id);
            onCloseTab({ stopPropagation: () => {} } as any, id, tab?.title || 'Documento');
          }}
          onNavigateToDocument={onNavigateToDocument}
          onTabsChanged={onTabsChanged}
          onNewDocument={onNewDocument}
          onNewCV={() => onNewDocument('cv')}
          onNewCard={() => onNewDocument('business_card')}
          onNewBook={() => onNewDocument('book')}
          onNewCoverLetter={() => onNewDocument('cover_letter')}
          onNewPlanner={() => onNewDocument('planner')}
          onNewInvoice={() => onNewDocument('invoice')}
          onNewEditorial={() => onNewDocument('editorial')}
          cycleUITheme={cycleUITheme}
          onOpenSavedCVsModal={onOpenSavedCVsModal}
          onOpenSaveAsModal={onOpenSaveAsModal}
          onOpenJsonDownloadModal={onOpenJsonDownloadModal}
          onOpenShareAppModal={onOpenShareAppModal}
          onOpenPrivacy={onOpenPrivacy}
        />
      </Suspense>
      {modalsSlot}
    </>
  );
};
