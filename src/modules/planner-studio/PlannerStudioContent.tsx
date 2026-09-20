import React, { useState, useMemo, useEffect } from 'react';
import { AppShell } from '../../shared/core/ui/AppShell';
import Navbar from '../cv-builder/components/Navbar';
import CanvaIconDock from '../cv-builder/components/CanvaIconDock';
import { PlannerPdfDocument } from '../../shared/core/pdf-engine/renderer/PlannerPdfDocument';
import { VectorDocViewer } from '../../shared/core/pdf-engine/VectorDocViewer';
import { getPreset } from '../../shared/core/pdf-engine/layers/presets/presetRegistry';
import { DocumentTypeId } from '../../types/document';
import { useDocumentViewport } from '../../shared/core/viewport';
import { OpenTab, openTab } from '../../shared/core/documents/tabStore';
import { generateDocumentId } from '../../shared/core/documents/documentEngine/titleEngine';
import { PlannerMonthOverride } from '../../shared/core/pdf-engine/layers/records/plannerDataAdapter';
import { PersonalInfoFields } from '../../shared/core/ui/PersonalInfoFields';

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

import { PLANNER_SECTION_REGISTRY } from './plannerSectionRegistry';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

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
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(0);
  
  const [plannerId] = useState<string>(() => activeTabId || generateDocumentId('planner'));
  
  const viewport = useDocumentViewport({
    pageSizeId: 'b5'
  });

  const [data, setData] = useState({
    year: new Date().getFullYear(),
    weekStart: 'monday' as 'monday' | 'sunday',
    weeklyLayout: 'horizontal' as 'horizontal' | 'vertical' | 'dashboard',
    temporalView: 'monthly' as 'monthly' | 'weekly' | 'daily' | 'undated',
    gridType: 'dot-grid' as 'blank' | 'dot-grid' | 'lined' | 'graph',
    layout: {
      pageSizeId: 'b5'
    },
    theme: {
      primaryColor: '#1E293B',
      fontFamily: 'Helvetica'
    },
    modules: {
      habitTracker: false,
      taskPriority: false,
      timeBlocking: false,
      notesBlock: false,
      expenseTracker: false,
    },
    personalInfo: {},
    monthOverrides: {} as Record<number, PlannerMonthOverride>
  });

  const preset = getPreset('planner-clasico');

  const updateMonthOverride = (monthIndex: number, patch: Partial<PlannerMonthOverride>) => {
    setData(d => ({
      ...d,
      monthOverrides: {
        ...d.monthOverrides,
        [monthIndex]: { ...(d.monthOverrides[monthIndex] || {}), ...patch }
      }
    }));
  };

  const clearMonthOverride = (monthIndex: number) => {
    setData(d => {
      const next = { ...d.monthOverrides };
      delete next[monthIndex];
      return { ...d, monthOverrides: next };
    });
  };

  useEffect(() => {
    const currentId = plannerId || generateDocumentId('planner');
    const name = `Agenda ${data.year}`;
    if (activeTabId === currentId && name === 'Agenda 2026') return; // Guard
    const updatedTabs = openTab(currentId, 'planner', name);
    if (onTabsChanged) onTabsChanged(updatedTabs);
  }, [plannerId, data.year, activeTabId, onTabsChanged]);

  const pdfElement = useMemo(() => (
    <PlannerPdfDocument data={data} presetId={preset.id} theme={data.theme} />
  ), [data, preset.id]);

  const currentMonthOverride = data.monthOverrides[selectedMonthIndex] || {};

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
                <label className="text-sm font-semibold">Retícula General</label>
                <select 
                  value={data.gridType}
                  onChange={e => setData(d => ({ ...d, gridType: e.target.value as any }))}
                  className="px-3 py-2 bg-[var(--ui-bg-base)] border border-[var(--ui-border-base)] rounded-md text-[var(--ui-text-primary)]"
                >
                  <option value="dot-grid">Puntos guía (Dot-Grid)</option>
                  <option value="lined">Renglones (Líneas)</option>
                  <option value="graph">Cuadrícula (Graph)</option>
                  <option value="blank">Blanco</option>
                </select>
              </div>
            </div>
          )}

          {activeStepTab === 'planner_structure' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">Estructura del Año</h2>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold">Año Objetivo</label>
                <input 
                  type="number" 
                  value={data.year} 
                  onChange={e => setData(d => ({ ...d, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                  className="px-3 py-2 bg-[var(--ui-bg-base)] border border-[var(--ui-border-base)] rounded-md text-[var(--ui-text-primary)]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold">Inicio de Semana</label>
                <select
                  value={data.weekStart}
                  onChange={e => setData(d => ({ ...d, weekStart: e.target.value as any }))}
                  className="px-3 py-2 bg-[var(--ui-bg-base)] border border-[var(--ui-border-base)] rounded-md text-[var(--ui-text-primary)]"
                >
                  <option value="monday">Lunes</option>
                  <option value="sunday">Domingo</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold">Disposición Semanal</label>
                <select
                  value={data.weeklyLayout}
                  onChange={e => setData(d => ({ ...d, weeklyLayout: e.target.value as any }))}
                  className="px-3 py-2 bg-[var(--ui-bg-base)] border border-[var(--ui-border-base)] rounded-md text-[var(--ui-text-primary)]"
                >
                  <option value="horizontal">Horizontal Estándar</option>
                  <option value="vertical">Vertical Amplia</option>
                  <option value="dashboard">Panel Compacto (Dashboard)</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold">Vista Temporal</label>
                <select
                  value={data.temporalView}
                  onChange={e => setData(d => ({ ...d, temporalView: e.target.value as any }))}
                  className="px-3 py-2 bg-[var(--ui-bg-base)] border border-[var(--ui-border-base)] rounded-md text-[var(--ui-text-primary)]"
                >
                  <option value="monthly">Anual con Grilla Mensual</option>
                  <option value="weekly">Planificador Semanal</option>
                  <option value="daily">Planificador Diario</option>
                  <option value="undated">Sin Fechas Fijas</option>
                </select>
              </div>
            </div>
          )}

          {activeStepTab === 'planner_sections' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">Módulos de Contenido</h2>
              <p className="text-xs text-[var(--ui-text-secondary)]">
                Activá los bloques de organización que aparecerán en la agenda.
              </p>
              
              {PLANNER_SECTION_REGISTRY.map(section => (
                <label key={section.id} className="flex items-center gap-3 p-3 bg-[var(--ui-bg-base)] border border-[var(--ui-border-base)] rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(data.modules as any)[section.id]}
                    onChange={e => setData(d => ({ ...d, modules: { ...d.modules, [section.id]: e.target.checked } }))}
                    className="w-4 h-4 rounded accent-[var(--color-accent-base)]"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{section.label}</span>
                    {section.description && <span className="text-xs text-[var(--ui-text-secondary)]">{section.description}</span>}
                  </div>
                </label>
              ))}
            </div>
          )}

          {activeStepTab === 'planner_months' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">Personalización por Mes</h2>
              <p className="text-xs text-[var(--ui-text-secondary)]">
                Por defecto los 12 meses usan el mismo fondo y color. Tocá un mes para darle un diseño distinto.
              </p>

              {/* Selector de 12 Meses */}
              <div className="grid grid-cols-3 gap-2">
                {MONTH_NAMES.map((name, idx) => {
                  const hasOverride = Boolean(data.monthOverrides[idx]);
                  const isSelected = selectedMonthIndex === idx;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSelectedMonthIndex(idx)}
                      className={`p-2 text-xs font-bold rounded-lg border text-center transition-all ${
                        isSelected
                          ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] border-[var(--color-accent-base)]'
                          : hasOverride
                          ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] border-[var(--color-accent-base)]/40'
                          : 'bg-[var(--ui-bg-base)] border-[var(--ui-border-base)] hover:border-[var(--color-accent-base)]'
                      }`}
                    >
                      {name}
                      {hasOverride && <span className="ml-1 text-[9px]">●</span>}
                    </button>
                  );
                })}
              </div>

              {/* Panel de Override del Mes Seleccionado */}
              <div className="p-4 bg-[var(--ui-bg-base)] border border-[var(--ui-border-base)] rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-[var(--color-accent-text)]">
                    Configuración de {MONTH_NAMES[selectedMonthIndex]}
                  </h3>
                  {data.monthOverrides[selectedMonthIndex] ? (
                    <button
                      type="button"
                      onClick={() => clearMonthOverride(selectedMonthIndex)}
                      className="text-xs text-[var(--ui-text-secondary)] underline hover:text-[var(--ui-text-primary)]"
                    >
                      Usar el diseño general
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateMonthOverride(selectedMonthIndex, { gridType: data.gridType, primaryColor: data.theme.primaryColor })}
                      className="text-xs font-semibold px-2.5 py-1 rounded border border-dashed border-[var(--ui-border-base)] text-[var(--color-accent-text)]"
                    >
                      + Personalizar este mes
                    </button>
                  )}
                </div>

                {data.monthOverrides[selectedMonthIndex] && (
                  <div className="space-y-3 pt-2 border-t border-[var(--ui-border-base)]">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold">Color del Mes</label>
                      <input
                        type="color"
                        value={currentMonthOverride.primaryColor || data.theme.primaryColor}
                        onChange={e => updateMonthOverride(selectedMonthIndex, { primaryColor: e.target.value })}
                        className="w-full h-8 p-1 bg-[var(--ui-bg-base)] border border-[var(--ui-border-base)] rounded-md cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold">Retícula del Mes</label>
                      <select
                        value={currentMonthOverride.gridType || data.gridType}
                        onChange={e => updateMonthOverride(selectedMonthIndex, { gridType: e.target.value as any })}
                        className="px-3 py-1.5 text-xs bg-[var(--ui-bg-base)] border border-[var(--ui-border-base)] rounded-md text-[var(--ui-text-primary)]"
                      >
                        <option value="dot-grid">Puntos guía (Dot-Grid)</option>
                        <option value="lined">Renglones (Líneas)</option>
                        <option value="graph">Cuadrícula (Graph)</option>
                        <option value="blank">Blanco</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold">Nota / Objetivo del Mes</label>
                      <input
                        type="text"
                        placeholder="Ej: Planificar proyectos de Q1"
                        value={currentMonthOverride.notes || ''}
                        onChange={e => updateMonthOverride(selectedMonthIndex, { notes: e.target.value })}
                        className="px-3 py-1.5 text-xs bg-[var(--ui-bg-base)] border border-[var(--ui-border-base)] rounded-md text-[var(--ui-text-primary)]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeStepTab === 'planner_personal' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">Datos Personales</h2>
              <p className="text-xs text-[var(--ui-text-secondary)]">
                Estos datos aparecerán en la portada o en secciones especiales de la agenda.
              </p>
              <PersonalInfoFields
                personalInfo={data.personalInfo}
                onChange={(patch) =>
                  setData((d) => ({
                    ...d,
                    personalInfo: { ...d.personalInfo, ...patch },
                  }))
                }
              />
            </div>
          )}
        </div>
      }
      mainSlot={
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-[var(--ui-bg-sunken)] relative overflow-hidden">
          <div className="flex-1 w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl border border-[var(--ui-border-base)] bg-[var(--ui-bg-base)]">
            <VectorDocViewer 
              document={pdfElement} 
              zoomLevel={viewport.zoomLevel}
              activeTab={activeStepTab}
            />
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
