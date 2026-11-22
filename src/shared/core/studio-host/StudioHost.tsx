/**
 * StudioHost — Marco con Inversión de Control del Tronco (Fase 5 — Decisión #3).
 *
 * El tronco gobierna la sesión (`DocumentSessionProvider`), el shell (`AppShell`),
 * los controles de deshacer/rehacer (`UndoRedoControls`), la insignia de almacenamiento
 * derivada del manifiesto (`storage.kind`: local vs bóveda cifrada), los slots explícitos
 * (`headerActions`, `previewToolbar`, `sidebarFooter`) y el gating de exportación (`useExportEntitlement`).
 *
 * Las apps ya no arman ni duplican este cascarón: solo aportan su panel de paso y sus slots.
 */

import React, { useCallback, useState } from 'react';
import type { DocumentSessionApi } from '../../contracts/sessionContract';
import type { StepDescriptor } from '../../contracts/appContract';
import { getDocumentTypeConfig, type RegisteredDocumentTypeId } from '../capabilities/capabilityRegistry';
import { DocumentSessionProvider } from '../documents/session/DocumentSessionContext';
import { AppShell } from '../ui/AppShell';
import { UndoRedoControls } from '../ui/UndoRedoControls';
import type { DocumentTabsBarProps } from '../ui/DocumentTabsBar';
import { useExportEntitlement } from '../entitlements/useExportEntitlement';
import { elevationSystem, radius } from '../uiDesignSystem';

export interface StudioHostProps<TData = any> {
  docType: RegisteredDocumentTypeId;
  session: DocumentSessionApi<TData>;
  steps: readonly StepDescriptor[];
  activeStepId: string;
  onSelectStep: (stepId: string) => void;
  isPanelOpen: boolean;
  onTogglePanel: (open: boolean) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  tabsBarProps?: DocumentTabsBarProps;
  renderStepPanel: (stepId: string, session: DocumentSessionApi<TData>) => React.ReactNode;
  renderPreview: (session: DocumentSessionApi<TData>) => React.ReactNode;
  onExport: (session: DocumentSessionApi<TData>) => Promise<void>;
  onOpenCheckout?: () => void;
  headerActionsSlot?: React.ReactNode;
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
  headerActionsSlot,
  previewToolbarSlot,
  sidebarFooterSlot,
  assistantSlot,
  modalsSlot,
}: StudioHostProps<TData>) {
  const manifest = getDocumentTypeConfig(docType);
  const { consumeCreditIfNeeded } = useExportEntitlement();
  const [exporting, setExporting] = useState(false);

  const storageBadge =
    manifest.storage.kind === 'local-encrypted'
      ? 'Bóveda cifrada en esta computadora'
      : 'Guardado en esta computadora';

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

  return (
    <DocumentSessionProvider session={session}>
      <AppShell
        docType={docType}
        isPanelOpen={isPanelOpen}
        containerRef={containerRef}
        navbarSlot={
          <header
            className={`w-full h-14 px-3 sm:px-4 flex items-center justify-between gap-2 bg-[var(--ui-bg-card)] border-b border-[var(--ui-border)] ${elevationSystem.raised}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-sm font-extrabold text-[var(--ui-text-primary)] truncate">
                {session.title || manifest.defaultTitle}
              </span>
              <span
                className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-bold bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-secondary)] shrink-0"
                style={{ borderRadius: radius.control }}
              >
                {storageBadge}
              </span>
              <UndoRedoControls />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {headerActionsSlot}
              <button
                type="button"
                onClick={() => void session.saveNow()}
                className="px-3 py-1.5 text-xs font-bold bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] cursor-pointer"
                style={{ borderRadius: radius.control }}
              >
                {session.saveStatus === 'saving' ? 'Guardando…' : 'Guardar'}
              </button>
              <button
                type="button"
                disabled={exporting}
                onClick={() => void handleGuardedExport()}
                className="px-3 py-1.5 text-xs font-bold bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] cursor-pointer disabled:opacity-60"
                style={{ borderRadius: radius.control }}
              >
                {exporting ? 'Exportando…' : 'Exportar PDF'}
              </button>
            </div>
          </header>
        }
        dockSlot={
          <nav
            aria-label={`Pasos de ${manifest.name}`}
            className="w-16 sm:w-20 h-full flex flex-col gap-1 p-1.5 bg-[var(--ui-bg-dock)] border-r border-[var(--ui-dock-border)] overflow-y-auto"
          >
            {steps.map((step) => {
              const active = step.id === activeStepId;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    onSelectStep(step.id);
                    onTogglePanel(true);
                  }}
                  className={`w-full px-1.5 py-2 text-[10px] font-bold flex flex-col items-center gap-1 cursor-pointer transition ${
                    active
                      ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]'
                      : 'text-[var(--ui-dock-text)] hover:bg-[var(--ui-bg-panel)]'
                  }`}
                  style={{ borderRadius: radius.control }}
                  aria-current={active ? 'step' : undefined}
                >
                  <span className="truncate max-w-full">{step.label}</span>
                </button>
              );
            })}
          </nav>
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
