import React, { Suspense } from 'react';
import { inferDocumentTypeId } from '../shared/core/capabilities/capabilityRegistry';
import { getActiveTabId, OpenTab } from '../shared/core/documents/tabStore';
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
  onOpenCreditsModal?: () => void;
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
  onOpenCreditsModal,
  onOpenShareAppModal,
  onOpenPrivacy,
  modalsSlot,
}) => {
  const StudioComponent = entry.StudioComponent;
  if (!StudioComponent) return null;

  const storedActiveId = getActiveTabId();
  const matchesEntry = (t: OpenTab) => t.docType === entry.id || inferDocumentTypeId(t) === entry.id;
  const activeTab =
    (storedActiveId
      ? tabs.find((t) => (t.id === storedActiveId || t.cvId === storedActiveId) && matchesEntry(t))
      : undefined) ||
    (cvDataId
      ? tabs.find((t) => (t.id === cvDataId || t.cvId === cvDataId) && matchesEntry(t))
      : undefined) ||
    tabs.find(matchesEntry);

  if (entry.autoCreateBlankTabOnRouteEnter && !activeTab) {
    return (
      <div className="flex items-center justify-center h-screen text-sm opacity-60 animate-pulse">
        {entry.loadingLabel}
      </div>
    );
  }

  // Nunca propagar cvDataId hacia una app standalone cuando aún no existe pestaña propia.
  const activeTabId = activeTab?.id || activeTab?.cvId || '';

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
          onOpenCreditsModal={onOpenCreditsModal}
          onOpenShareAppModal={onOpenShareAppModal}
          onOpenPrivacy={onOpenPrivacy}
        />
      </Suspense>
      {modalsSlot}
    </>
  );
};
