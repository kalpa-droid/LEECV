import React, { useMemo, useRef } from 'react';
import { 
  Palette, Menu, X, Plus, Sparkles, ChevronDown, ChevronRight
} from 'lucide-react';
import { DomSectionIcon } from '../../../shared/core/pdf-engine/layers/icons/DomSectionIcon';
import { elevationSystem, radius } from '../../../shared/core/uiDesignSystem';
import { resolveActiveDockSections, DOCK_SPECIAL_TABS } from '../../../shared/core/sections/activeSectionsDockEngine';

export interface CanvaIconDockProps {
  cvData?: any;
  setCvData?: React.Dispatch<React.SetStateAction<any>>;
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean) => void;
  onOpenAtsCheck?: () => void;
}

// 1. Pestañas de Estilo (Diseño)
const styleTabs = [
  { id: 'diseno', label: 'Diseño', icon: Palette }
];

// 2. Pestañas de Sección Especiales Gobernadas por el Motor (activeSectionsDockEngine.ts)
const addSectionTab = DOCK_SPECIAL_TABS.addSection;
const portadaTab = DOCK_SPECIAL_TABS.portada;
const personalTab = DOCK_SPECIAL_TABS.personal;

export default function CanvaIconDock({ 
  cvData,
  setCvData: _setCvData,
  activeTab, 
  setActiveTab, 
  isPanelOpen, 
  setIsPanelOpen,
  onOpenAtsCheck
}: CanvaIconDockProps) {
  const mobileNavRef = useRef<HTMLDivElement>(null);

  // Motor dinámico único: reemplaza listas fijas y customSections.map
  const dockSections = useMemo(() => resolveActiveDockSections(cvData), [cvData]);

  const handleTabClick = (tabId: string) => {
    if (activeTab === tabId && isPanelOpen) {
      setIsPanelOpen(false);
    } else {
      setActiveTab(tabId);
      setIsPanelOpen(true);
    }
  };

  return (
    <>
      {/* Desktop & Tablet Vertical Left Dock (2 Columnas, Width: 96px / w-24) */}
      <aside 
        onWheel={(e) => {
          e.currentTarget.scrollTop += e.deltaY;
        }}
        className="hidden md:flex flex-col items-center py-2 bg-[var(--ui-bg-dock)] border-r border-[var(--ui-dock-border)] text-[var(--ui-dock-text)] z-[100] select-none w-24 shrink-0 fixed top-0 bottom-0 left-0 h-screen overflow-y-auto no-scrollbar shadow-[var(--shadow-dock)] px-1.5"
      >
        {/* Rejilla de 2 Columnas para PC */}
        <div className="grid grid-cols-2 gap-1.5 w-full items-center justify-items-center">
          
          {/* 1. BOTÓN ATS (Fila 1, Columna 1) */}
          <button
            type="button"
            onClick={onOpenAtsCheck}
            className={`w-9 h-9 rounded-[${radius.modal}] flex items-center justify-center transition group relative cursor-pointer border bg-[var(--ui-dock-hover)] border-[var(--color-status-warning-text)]/80 text-[var(--color-status-warning-text)] hover:bg-[var(--color-accent-amber-muted)] hover:scale-105 active:scale-95`}
            title="Auditoría Predictiva ATS"
          >
            <Sparkles className="w-4.5 h-4.5 text-[var(--color-status-warning-text)]" />
            <span className={`absolute left-20 bg-[var(--ui-bg-dock)] text-[var(--color-status-warning-text)] text-xs font-bold px-2 py-1 rounded-[${radius.control}] ${elevationSystem.overlay} opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-[var(--color-status-warning-text)]/40`}>
              Auditoría ATS
            </span>
          </button>

          {/* 2. BOTÓN MENÚ / DRAWER TOGGLE (Fila 1, Columna 2) */}
          <button
            type="button"
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className={`w-9 h-9 rounded-[${radius.modal}] flex items-center justify-center transition group relative cursor-pointer active:scale-95 ${
              isPanelOpen
                ? `bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.floating} shadow-[var(--color-accent-base)]/30`
                : 'bg-[var(--ui-dock-hover)] text-[var(--ui-dock-text-muted)] hover:text-[var(--ui-dock-text)]'
            }`}
            title={isPanelOpen ? 'Cerrar Panel Editor' : 'Abrir Panel Editor'}
          >
            {isPanelOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
            <span className={`absolute left-20 bg-[var(--ui-bg-dock)] text-[var(--ui-dock-text)] text-xs font-bold px-2 py-1 rounded-[${radius.control}] ${elevationSystem.overlay} opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-[var(--ui-dock-border)]`}>
              {isPanelOpen ? 'Cerrar Panel' : 'Abrir Panel'}
            </span>
          </button>

          {/* 3. BOTÓN DISEÑO / ESTILO (Fila 2, Columna 1) */}
          {styleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id && isPanelOpen;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className={`w-9 h-9 rounded-[${radius.modal}] flex items-center justify-center transition group relative cursor-pointer ${
                  isActive
                    ? `bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.floating} shadow-[var(--color-accent-base)]/30 scale-105`
                    : 'text-[var(--ui-dock-text-muted)] hover:text-[var(--ui-dock-text)] hover:bg-[var(--ui-dock-hover)]'
                }`}
                title={tab.label}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-[var(--color-accent-on-base)]' : 'text-[var(--color-secondary-bright)]'}`} />
                <span className={`absolute left-20 bg-[var(--ui-bg-dock)] text-[var(--ui-dock-text)] text-xs font-bold px-2 py-1 rounded-[${radius.control}] ${elevationSystem.overlay} opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-[var(--ui-dock-border)]`}>
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* 4. BOTÓN SECCIÓN + (Fila 2, Columna 2) */}
          {(() => {
            const isActive = activeTab === addSectionTab.id && isPanelOpen;
            return (
              <button
                key={addSectionTab.id}
                type="button"
                onClick={() => handleTabClick(addSectionTab.id)}
                className={`w-9 h-9 rounded-[${radius.modal}] flex items-center justify-center transition group relative cursor-pointer border ${
                  isActive
                    ? `bg-[var(--color-status-success-base)] border-[var(--color-status-success-base)] text-[var(--color-status-success-on-base)] ${elevationSystem.raised} scale-105`
                    : 'bg-[var(--ui-dock-hover)] border-[var(--color-status-success-base)]/80 text-[var(--color-status-success-bright)] hover:bg-[var(--color-status-success-muted)]'
                }`}
                title="Catálogo & Creador de Secciones"
              >
                <Plus className={`w-4.5 h-4.5 ${isActive ? 'text-[var(--color-status-success-on-base)]' : 'text-[var(--color-status-success-text)]'}`} />
                <span className={`absolute left-20 bg-[var(--ui-bg-dock)] text-[var(--color-status-success-text)] text-xs font-bold px-2 py-1 rounded-[${radius.control}] ${elevationSystem.overlay} opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-[var(--color-status-success-base)]/30`}>
                  Catálogo & Creador de Secciones
                </span>
              </button>
            );
          })()}

          {/* 5. BOTÓN PORTADA (Fila 3, Columna 1) */}
          {(() => {
            const isActive = activeTab === portadaTab.id && isPanelOpen;
            return (
              <button
                key={portadaTab.id}
                type="button"
                onClick={() => handleTabClick(portadaTab.id)}
                className={`w-9 h-9 rounded-[${radius.modal}] flex items-center justify-center transition group relative cursor-pointer border ${
                  isActive
                    ? `bg-[var(--color-accent-base)] border-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.floating} shadow-[var(--color-accent-base)]/30 scale-105`
                    : 'bg-[var(--ui-dock-hover)] border-[var(--ui-dock-border)] text-[var(--color-secondary-bright)] hover:text-[var(--ui-dock-text)] hover:bg-[var(--color-secondary-muted)]'
                }`}
                title="Portada Profesional"
              >
                <DomSectionIcon iconId="portada" className="w-4.5 h-4.5" color={isActive ? 'var(--color-accent-on-base)' : 'var(--color-secondary-bright)'} />
                <span className={`absolute left-20 bg-[var(--ui-bg-dock)] text-[var(--ui-dock-text)] text-xs font-bold px-2 py-1 rounded-[${radius.control}] ${elevationSystem.overlay} opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-[var(--ui-dock-border)]`}>
                  Portada Profesional
                </span>
              </button>
            );
          })()}

          {/* 6. BOTÓN PERSONAL (Fila 3, Columna 2) */}
          {(() => {
            const isActive = activeTab === personalTab.id && isPanelOpen;
            return (
              <button
                key={personalTab.id}
                type="button"
                onClick={() => handleTabClick(personalTab.id)}
                className={`w-9 h-9 rounded-[${radius.modal}] flex items-center justify-center transition group relative cursor-pointer ${
                  isActive
                    ? `bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] ${elevationSystem.floating} shadow-[var(--color-secondary-base)]/30 scale-105`
                    : 'text-[var(--ui-dock-text-muted)] hover:text-[var(--ui-dock-text)] hover:bg-[var(--ui-dock-hover)]'
                }`}
                title={personalTab.label}
              >
                <DomSectionIcon iconId={personalTab.iconId} className="w-4.5 h-4.5" color={isActive ? 'var(--color-secondary-on-base)' : 'var(--color-secondary-bright)'} />
                <span className={`absolute left-20 bg-[var(--ui-bg-dock)] text-[var(--ui-dock-text)] text-xs font-bold px-2 py-1 rounded-[${radius.control}] ${elevationSystem.overlay} opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-[var(--ui-dock-border)]`}>
                  {personalTab.label}
                </span>
              </button>
            );
          })()}

          {/* 7..N. SECCIONES DINÁMICAS (En 2 Columnas) */}
          {dockSections.map((sec) => {
            const isActive = activeTab === sec.id && isPanelOpen;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => handleTabClick(sec.id)}
                className={`w-9 h-9 rounded-[${radius.modal}] flex items-center justify-center transition group relative cursor-pointer ${
                  isActive
                    ? sec.isCustom
                      ? `bg-[var(--color-accent-purple)] text-white ${elevationSystem.floating} shadow-[var(--color-accent-purple)]/30 scale-105`
                      : `bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] ${elevationSystem.floating} shadow-[var(--color-secondary-base)]/30 scale-105`
                    : sec.isCustom
                      ? 'bg-[var(--ui-dock-hover)] text-[var(--color-secondary-bright)] border border-[var(--color-secondary-base)]/40 hover:bg-[var(--color-secondary-muted)]'
                      : 'text-[var(--ui-dock-text-muted)] hover:text-[var(--ui-dock-text)] hover:bg-[var(--ui-dock-hover)]'
                }`}
                title={sec.label}
              >
                <DomSectionIcon
                  iconId={sec.iconId}
                  className="w-4.5 h-4.5"
                  color={sec.isCustom ? (isActive ? '#FFFFFF' : 'var(--color-secondary-bright)') : (isActive ? 'var(--color-secondary-on-base)' : 'var(--color-secondary-bright)')}
                />
                <span className={`absolute left-20 bg-[var(--ui-bg-dock)] text-[var(--ui-dock-text)] text-xs font-bold px-2 py-1 rounded-[${radius.control}] ${elevationSystem.overlay} opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-[var(--ui-dock-border)]`}>
                  {sec.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Indicador sutil de scroll */}
        <div className="pt-2 pb-1 flex flex-col items-center justify-center text-[var(--color-secondary-bright)] animate-bounce opacity-70 hover:opacity-100 transition cursor-pointer shrink-0 mt-auto" title="Desliza para ver más secciones">
          <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
      </aside>

      {/* Mobile Bottom Dock Bar (< 768px): 2 Filas Horizontales con Flujo Grid (Height: 76px) */}
      <nav 
        ref={mobileNavRef}
        onWheel={(e) => {
          if (e.currentTarget) {
            e.currentTarget.scrollLeft += (e.deltaY || e.deltaX);
          }
        }}
        className={`md:hidden fixed bottom-0 left-0 right-0 z-[999] bg-[var(--ui-bg-dock)] border-t border-[var(--ui-dock-border)] p-1.5 grid grid-rows-2 grid-flow-col gap-1.5 overflow-x-auto no-scrollbar ${elevationSystem.overlay} select-none h-[76px] items-center`}
      >
        {/* 1. BOTÓN ATS (Fila 1, Columna 1 en Celular) */}
        <button
          type="button"
          onClick={onOpenAtsCheck}
          className="w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0 border bg-[var(--ui-bg-panel)] border-[var(--color-status-warning-text)]/80 text-[var(--color-status-warning-text)] active:scale-95 cursor-pointer"
          title="Auditoría ATS"
        >
          <Sparkles className="w-4 h-4 text-[var(--color-status-warning-text)]" />
        </button>

        {/* 2. BOTÓN MENÚ (Fila 2, Columna 1 en Celular - Pegado al Margen Inferior Izquierdo) */}
        <button
          type="button"
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className={`w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0 transition cursor-pointer active:scale-95 ${
            isPanelOpen
              ? `bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.raised}`
              : 'bg-[var(--ui-bg-panel)] text-[var(--color-accent-amber-bright)] border border-[var(--ui-border)]'
          }`}
          title={isPanelOpen ? 'Cerrar Panel' : 'Abrir Panel'}
        >
          {isPanelOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        {/* 3. BOTÓN DISEÑO / ESTILO (Fila 1, Columna 2 en Celular) */}
        {styleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && isPanelOpen;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0 transition cursor-pointer ${
                isActive
                  ? `bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.raised}`
                  : 'bg-[var(--ui-bg-panel)] text-[var(--ui-dock-text-muted)] border border-[var(--ui-border)]'
              }`}
              title={tab.label}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--color-accent-on-base)]' : 'text-[var(--ui-dock-text-muted)]'}`} />
            </button>
          );
        })}

        {/* 4. BOTÓN SECCIÓN + (Fila 2, Columna 2 en Celular) */}
        <button
          type="button"
          onClick={() => handleTabClick(addSectionTab.id)}
          className={`w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0 cursor-pointer border transition ${
            activeTab === addSectionTab.id && isPanelOpen
              ? 'bg-[var(--color-status-success-base)] border-[var(--color-status-success-base)] text-[var(--color-status-success-on-base)]'
              : 'bg-[var(--ui-bg-panel)] border-[var(--color-status-success-base)]/40 text-[var(--color-status-success-bright)]'
          }`}
          title="Agregar Sección +"
        >
          <Plus className={`w-4 h-4 ${activeTab === addSectionTab.id && isPanelOpen ? 'text-[var(--color-status-success-on-base)]' : ''}`} />
        </button>

        {/* 5. BOTÓN PORTADA (Fila 1, Columna 3 en Celular) */}
        {(() => {
          const isActive = activeTab === portadaTab.id && isPanelOpen;
          return (
            <button
              type="button"
              onClick={() => handleTabClick(portadaTab.id)}
              className={`w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0 cursor-pointer border transition ${
                isActive
                  ? 'bg-[var(--color-accent-base)] border-[var(--color-accent-base)] text-[var(--color-accent-on-base)]'
                  : 'bg-[var(--ui-bg-panel)] border-[var(--ui-border)] text-[var(--color-secondary-bright)]'
              }`}
              title="Portada Profesional"
            >
              <DomSectionIcon iconId="portada" className="w-4 h-4" color={isActive ? 'var(--color-accent-on-base)' : 'var(--color-secondary-bright)'} />
            </button>
          );
        })()}

        {/* 6. BOTÓN PERSONAL (Fila 2, Columna 3 en Celular) */}
        {(() => {
          const isActive = activeTab === personalTab.id && isPanelOpen;
          return (
            <button
              type="button"
              onClick={() => handleTabClick(personalTab.id)}
              className={`w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0 transition cursor-pointer border ${
                isActive
                  ? `bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] ${elevationSystem.raised}`
                  : 'bg-[var(--ui-bg-panel)] text-[var(--color-secondary-bright)] border-[var(--color-secondary-base)]/30'
              }`}
              title={personalTab.label}
            >
              <DomSectionIcon iconId={personalTab.iconId} className="w-4 h-4" color={isActive ? 'var(--color-secondary-on-base)' : 'var(--color-secondary-bright)'} />
            </button>
          );
        })()}

        {/* 7..N. SECCIONES DINÁMICAS (En 2 Filas Horizontales) */}
        {dockSections.map((sec) => {
          const isActive = activeTab === sec.id && isPanelOpen;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => handleTabClick(sec.id)}
              className={`w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0 transition cursor-pointer border ${
                isActive
                  ? sec.isCustom
                    ? `bg-[var(--color-accent-purple)] text-white ${elevationSystem.raised}`
                    : `bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] ${elevationSystem.raised}`
                  : sec.isCustom
                    ? 'bg-[var(--ui-bg-panel)] text-[var(--color-accent-purple-bright)] border-[var(--color-accent-purple)]/30'
                    : 'bg-[var(--ui-bg-panel)] text-[var(--color-secondary-bright)] border-[var(--color-secondary-base)]/30'
              }`}
              title={sec.label}
            >
              <DomSectionIcon
                iconId={sec.iconId}
                className="w-4 h-4"
                color={sec.isCustom ? (isActive ? '#FFFFFF' : 'var(--color-accent-purple-bright)') : (isActive ? 'var(--color-secondary-on-base)' : 'var(--color-secondary-bright)')}
              />
            </button>
          );
        })}

        {/* FLECHA SUTIL Y ELEGANTE EN MÓVIL: Indica más secciones desplazables */}
        <div className="shrink-0 px-1 flex items-center justify-center text-[var(--color-accent-amber-bright)] animate-pulse opacity-90" title="Desliza horizontalmente para ver más secciones">
          <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
      </nav>
    </>
  );
}
