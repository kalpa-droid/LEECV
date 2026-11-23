/**
 * StudioHost — Marco con Inversión de Control del Tronco (Fase 5 — Decisión #3).
 *
 * El tronco gobierna la sesión (`DocumentSessionProvider`), el shell (`AppShell`),
 * la barra superior unificada (`StudioNavbar`), el muelle lateral (`StudioDock`)
 * y el gating de exportación (`useExportEntitlement`).
 *
 * Las apps ya no arman ni duplican este cascarón: solo aportan su panel de paso y sus slots.
 */

import React, { useCallback, useState } from 'react';
import type { DocumentSessionApi } from '../../contracts/sessionContract';
import type { StepDescriptor } from '../../contracts/appContract';
import type { RegisteredDocumentTypeId } from '../capabilities/capabilityRegistry';
import { DocumentSessionProvider } from '../documents/session/DocumentSessionContext';
import { AppShell } from '../ui/AppShell';
import type { DocumentTabsBarProps } from '../ui/DocumentTabsBar';
import { useExportEntitlement } from '../entitlements/useExportEntitlement';
import {
  StudioNavbar,
  type NavbarGlobalAction,
  type NavbarGlobalContextPill,
} from './StudioNavbar';
import { StudioDock } from './StudioDock';
import type { DockTabItem } from './stepSequenceRegistry';

export interface StudioHostProps<TData = any> {
  docType: RegisteredDocumentTypeId;
  session: DocumentSessionApi<TData>;
  steps: readonly StepDescriptor[];
  activeStepId: string;
  onSelectStep: (stepId: string) => void;
  isPanelOpen: boolean;
  onTogglePanel: (open: boolean) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  tabsBarProps: DocumentTabsBarProps;
  renderStepPanel: (stepId: string, session: DocumentSessionApi<TData>) => React.ReactNode;
  renderPreview: (session: DocumentSessionApi<TData>) => React.ReactNode;
  onExport: (session: DocumentSessionApi<TData>) => Promise<void>;
  onOpenCheckout?: () => void;
  globalContextPills?: NavbarGlobalContextPill[];
  globalActions?: NavbarGlobalAction[];
  currentUiTheme?: string;
  cycleUITheme?: () => void;
  onOpenSavedModal?: () => void;
  onOpenSaveAsModal?: () => void;
  onOpenJsonDownloadModal?: () => void;
  onOpenCreditsModal?: () => void;
  onOpenShareAppModal?: () => void;
  onOpenPrivacy?: () => void;
  onCloseMobilePanel?: () => void;
  previewToolbarSlot?: React.ReactNode;
  sidebarFooterSlot?: React.ReactNode;
  assistantSlot?: React.ReactNode;
  modalsSlot?: React.ReactNode;
}

export function StudioHost<TData = any>({
  docType,
  session,
  steps,
  activeStepId,
  onSelectStep,
  isPanelOpen,
  onTogglePanel,
  containerRef,
  tabsBarProps,
  renderStepPanel,
  renderPreview,
  onExport,
  onOpenCheckout,
  globalContextPills,
  globalActions,
  currentUiTheme = 'day',
  cycleUITheme = () => {},
  onOpenSavedModal,
  onOpenSaveAsModal,
  onOpenJsonDownloadModal,
  onOpenCreditsModal,
  onOpenShareAppModal,
  onOpenPrivacy,
  onCloseMobilePanel,
  previewToolbarSlot,
  sidebarFooterSlot,
  assistantSlot,
  modalsSlot,
}: StudioHostProps<TData>) {
  const { consumeCreditIfNeeded } = useExportEntitlement();
  const [exporting, setExporting] = useState(false);

  const handleGuardedExport = useCallback(async () => {
    if (exporting) return;
    const allowed = await consumeCreditIfNeeded();
    if (!allowed) {
      onOpenCheckout?.();
      return;
    }
    setExporting(true);
    try {
      await onExport(session);
    } finally {
      setExporting(false);
    }
  }, [exporting, consumeCreditIfNeeded, onOpenCheckout, onExport, session]);

  const dockTabs: DockTabItem[] = steps.map((step) => ({
    id: step.id,
    label: step.label,
    iconId: step.iconId,
    stepNumber: step.stepNumber,
    isLarge: false,
    role: 'record',
  }));

  return (
    <DocumentSessionProvider session={session}>
      <AppShell
        docType={docType}
        isPanelOpen={isPanelOpen}
        containerRef={containerRef}
        navbarSlot={
          <StudioNavbar
            docType={docType}
            currentCvData={session.data}
            currentUiTheme={currentUiTheme}
            undo={session.undo}
            redo={session.redo}
            canUndo={session.canUndo}
            canRedo={session.canRedo}
            isSaving={session.saveStatus === 'saving' || exporting}
            onOpenSavedCVsModal={onOpenSavedModal || (() => {})}
            onSaveCVClick={() => void session.saveNow()}
            onOpenSaveAsModal={onOpenSaveAsModal || (() => {})}
            onOpenJsonDownloadModal={onOpenJsonDownloadModal || (() => {})}
            onPrint={() => void handleGuardedExport()}
            onOpenCreditsModal={onOpenCreditsModal}
            onOpenShareAppModal={onOpenShareAppModal || (() => {})}
            onOpenPrivacy={onOpenPrivacy}
            globalContextPills={globalContextPills}
            globalActions={globalActions}
            zoomLevel={1}
            setZoomLevel={() => {}}
            triggerAutoFit={() => {}}
            cycleUITheme={cycleUITheme}
            isPanelOpen={isPanelOpen}
            onCloseMobilePanel={onCloseMobilePanel || (() => onTogglePanel(false))}
          />
        }
        dockSlot={
          <StudioDock
            docType={docType}
            tabs={dockTabs}
            activeTab={activeStepId}
            setActiveTab={(tabId) => {
              onSelectStep(tabId);
              onTogglePanel(true);
            }}
            isPanelOpen={isPanelOpen}
            setIsPanelOpen={onTogglePanel}
          />
        }
        panelSlot={
          <div className="h-full flex flex-col overflow-hidden text-[var(--ui-text-primary)]">
            <div className="flex-1 overflow-y-auto p-4">{renderStepPanel(activeStepId, session)}</div>
            {sidebarFooterSlot && (
              <div className="border-t border-[var(--ui-border)] p-3 bg-[var(--ui-bg-panel)]">
                {sidebarFooterSlot}
              </div>
            )}
          </div>
        }
        mainSlot={
          <div className="w-full h-full flex flex-col overflow-hidden bg-[var(--ui-bg-panel)]">
            {previewToolbarSlot && (
              <div className="px-3 py-2 border-b border-[var(--ui-border)] bg-[var(--ui-bg-card)]">
                {previewToolbarSlot}
              </div>
            )}
            <div className="flex-1 overflow-hidden">{renderPreview(session)}</div>
          </div>
        }
        tabsBarProps={tabsBarProps}
        modalsSlot={
          <>
            {assistantSlot}
            {modalsSlot}
          </>
        }
      />
    </DocumentSessionProvider>
  );
}
