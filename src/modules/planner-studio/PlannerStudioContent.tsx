import React, { useState, useMemo, useEffect } from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import { AppShell } from '../../shared/core/ui/AppShell';
import Navbar from '../cv-builder/components/Navbar';
import CanvaIconDock from '../cv-builder/components/CanvaIconDock';
import { PlannerPdfDocument } from '../../shared/core/pdf-engine/renderer/PlannerPdfDocument';
import { getPreset } from '../../shared/core/pdf-engine/layers/presets/presetRegistry';
import { DocumentTypeId } from '../../types/document';
import { useDocumentViewport } from '../../shared/core/viewport';
import { getNextPlannerStepId, getPrevPlannerStepId } from './plannerStepSequence';
import { OpenTab, openTab } from '../../shared/core/documents/tabStore';
import { generateDocumentId } from '../../shared/core/documents/documentEngine/titleEngine';

interface PlannerStudioContentProps {
  currentUiTheme?: string;
  documentTabs: OpenTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNavigateToDocument: (targetDocType: DocumentTypeId, id: string) => void;
  onNewCV?: () => void;
  onNewCard?: () => void;
  onNewBook?: () => void;
  cycleUITheme: () => void;
  onTabsChanged?: (tabs: OpenTab[]) => void;
  isLoggedIn?: boolean;
  onAuthToggle?: () => void;
}

export const PlannerStudioContent: React.FC<PlannerStudioContentProps> = ({
  currentUiTheme = 'day',
  documentTabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNavigateToDocument,
  onNewCV: _onNewCV,
  onNewCard,
  onNewBook,
  cycleUITheme,
  onTabsChanged = () => {},
  isLoggedIn = false,
  onAuthToggle = () => {},
}) => {
  const [activeStepTab, setActiveStepTab] = useState<string>('planner_design');
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);
  
  const [plannerId, setPlannerId] = useState<string>(() => {
    return activeTabId && activeTabId.startsWith('planner-') ? activeTabId : generateDocumentId('planner');
  });
  
  const viewport = useDocumentViewport({
    pageSizeId: 'b5'
  });

  const [data, setData] = useState({
    year: new Date().getFullYear(),
    gridType: 'dot-grid' as const,
    layout: {
      pageSizeId: 'b5'
    },
    theme: {
      primaryColor: '#1E293B',
      fontFamily: 'Helvetica'
    }
  });

  const preset = getPreset('planner-clasico');

  useEffect(() => {
    const currentId = plannerId || generateDocumentId('planner');
    const name = `Agenda ${data.year}`;
    const updatedTabs = openTab(currentId, 'planner', name);
    onTabsChanged(updatedTabs);
  }, [plannerId, data.year]);

  const pdfElement = useMemo(() => (
    <PlannerPdfDocument data={data} presetId={preset.id} theme={data.theme} />
  ), [data, preset.id]);

  return (
    <AppShell
      docType="planner"
      isPanelOpen={isPanelOpen}
      containerRef={viewport.containerRef}
      navbarSlot={
        <Navbar
          docType="planner"
          currentCvData={{ uiTheme: currentUiTheme }}
          onOpenSavedCVsModal={() => {}}
          onSaveCVClick={() => {}}
          onOpenSaveAsModal={() => {}}
          onOpenJsonDownloadModal={() => {}}
          onPrint={() => {}}
          onOpenShareAppModal={() => {}}
          onOpenCloudStatus={() => {}}
          zoomLevel={viewport.zoomLevel}
          setZoomLevel={viewport.setZoomLevel}
          triggerAutoFit={viewport.fitAndCenter}
          isAutoFitMode={viewport.isAutoFitMode}
          cycleUITheme={cycleUITheme}
          isLoggedIn={isLoggedIn}
          onAuthToggle={onAuthToggle}
        />
      }
      dockSlot={
        <CanvaIconDock
          docType="planner"
          activeTab={activeStepTab}
          setActiveTab={setActiveStepTab}
          isPanelOpen={isPanelOpen}
          setIsPanelOpen={setIsPanelOpen}
        />
      }
      panelSlot={
        <div className="p-4 pb-24 sm:pb-16 space-y-6 overflow-y-auto h-full max-h-full text-[var(--ui-text-primary)]">
          {activeStepTab === 'planner_design' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">Diseño y Paleta</h2>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold">Color Principal</label>
                <input 
                  type="color" 
                  value={data.theme.primaryColor} 
                  onChange={e => setData(d => ({ ...d, theme: { ...d.theme, primaryColor: e.target.value } }))}
                  className="w-full h-10 p-1 bg-[var(--ui-bg-base)] border border-[var(--ui-border-base)] rounded-md cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeStepTab === 'planner_background' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">Fondo de Hoja</h2>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold">Retícula</label>
                <select 
                  value={data.gridType}
                  onChange={e => setData(d => ({ ...d, gridType: e.target.value as any }))}
                  className="px-3 py-2 bg-[var(--ui-bg-base)] border border-[var(--ui-border-base)] rounded-md text-[var(--ui-text-primary)]"
                >
                  <option value="dot-grid">Puntos (Dot-Grid)</option>
                  <option value="lined">Líneas</option>
                  <option value="blank">Blanco</option>
                </select>
              </div>
            </div>
          )}

          {activeStepTab === 'planner_structure' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">Estructura del Año</h2>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold">Año</label>
                <input 
                  type="number" 
                  value={data.year} 
                  onChange={e => setData(d => ({ ...d, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                  className="px-3 py-2 bg-[var(--ui-bg-base)] border border-[var(--ui-border-base)] rounded-md text-[var(--ui-text-primary)]"
                />
              </div>
            </div>
          )}
          
          {activeStepTab === 'planner_months' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">Meses</h2>
              <p className="text-sm text-[var(--ui-text-secondary)]">Aquí configuraremos overrides por cada mes.</p>
            </div>
          )}
        </div>
      }
      mainSlot={
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-[var(--ui-bg-sunken)] relative overflow-hidden">
          <div className="flex-1 w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl border border-[var(--ui-border-base)] bg-[var(--ui-bg-base)]">
            <PDFViewer width="100%" height="100%" className="border-none">
              {pdfElement}
            </PDFViewer>
          </div>
        </div>
      }
      tabsBarProps={{
        tabs: documentTabs,
        activeId: activeTabId,
        docType: 'planner',
        onSwitch: onSelectTab,
        onNavigateToDocument: (targetType, id) => onNavigateToDocument(targetType, id),
        onAdd: () => {},
        onNewCV: _onNewCV,
        onNewCard: onNewCard,
        onNewBook: onNewBook,
        onClose: (e, id) => onCloseTab(id),
      }}
    />
  );
};
