import React, { useMemo, useRef } from 'react';
import { 
  Palette, Layout, Menu, X, Plus, ChevronDown, ChevronRight
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
}

// 1. Pestañas de Estilo y Maquetación (Diseño y Columnas)
const styleTabs = [
  { id: 'diseno', label: 'Diseño', icon: Palette },
  { id: 'paneles', label: 'Columnas', icon: Layout },
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
  setIsPanelOpen 
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
      {/* Desktop & Tablet Vertical Left Dock (Width: 64px) con interlineado compacto */}
      <aside 
        onWheel={(e) => {
          e.currentTarget.scrollTop += e.deltaY;
        }}
        className="hidden md:flex flex-col items-center py-2 bg-[var(--ui-bg-dock)] border-r border-[var(--ui-dock-border)] text-[var(--ui-dock-text)] z-[100] select-none w-16 shrink-0 fixed top-0 bottom-0 left-0 h-screen overflow-y-auto no-scrollbar shadow-[var(--shadow-dock)]"
      >
        {/* Toggle Drawer Button */}
        <button
          type="button"
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className={`p-2 rounded-[${radius.modal}] mb-1.5 transition transform active:scale-95 cursor-pointer ${
            isPanelOpen
              ? `bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.floating} shadow-[var(--color-accent-base)]/30`
              : 'bg-[var(--ui-dock-hover)] text-[var(--ui-dock-text-muted)] hover:text-[var(--ui-dock-text)]'
          }`}
          title={isPanelOpen ? 'Cerrar Panel Editor' : 'Abrir Panel Editor'}
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="w-7 h-px bg-[var(--ui-dock-separator)] mb-1.5" />

        {/* Style & Layout Group: Botones de Estilo (SOLO icono) */}
        <div className="flex flex-col items-center gap-1 mb-1.5">
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
                <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--color-accent-on-base)]' : 'text-[var(--color-secondary-bright)]'}`} />
                
                {/* Tooltip flotante al pasar el cursor en escritorio */}
                <span className={`absolute left-14 bg-[var(--ui-bg-dock)] text-[var(--ui-dock-text)] text-xs font-bold px-2 py-1 rounded-[${radius.control}] ${elevationSystem.overlay} opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-[var(--ui-dock-border)]`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="w-7 h-px bg-[var(--ui-dock-separator)] mb-1.5" />

        {/* Content Sections Group: Interlineado compacto entre todos los botones */}
        <div className="flex flex-col items-center gap-1 flex-1 w-full px-1">
          {/* 1. BOTÓN SIEMPRE PRIMERO ARRIBA: Sección + */}
          {(() => {
            const isActive = activeTab === addSectionTab.id && isPanelOpen;
            return (
              <button
                key={addSectionTab.id}
                type="button"
                onClick={() => handleTabClick(addSectionTab.id)}
                className={`w-11 h-9 rounded-[${radius.modal}] flex flex-col items-center justify-center transition group relative cursor-pointer border ${
                  isActive
                    ? `bg-[var(--color-status-success-base)] border-[var(--color-status-success-base)] text-[var(--color-status-success-on-base)] ${elevationSystem.raised} scale-105`
                    : 'bg-[var(--ui-dock-hover)] border-[var(--color-status-success-base)]/80 text-[var(--color-status-success-bright)] hover:bg-[var(--color-status-success-muted)]'
                }`}
                title="Catálogo y Creador de Secciones (Sección)"
              >
                <Plus className={`w-3.5 h-3.5 ${isActive ? 'text-[var(--color-status-success-on-base)]' : 'text-[var(--color-status-success-text)]'}`} />
                <span className={`text-[8px] font-black tracking-tighter uppercase mt-0.5 leading-none ${isActive ? 'text-[var(--color-status-success-on-base)]' : 'text-[var(--color-status-success-text)]'}`}>
                  {addSectionTab.label}
                </span>

                <span className={`absolute left-14 bg-[var(--ui-bg-dock)] text-[var(--color-status-success-text)] text-xs font-bold px-2 py-1 rounded-[${radius.control}] ${elevationSystem.overlay} opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-[var(--color-status-success-base)]/30`}>
                  Catálogo & Creador de Secciones
                </span>
              </button>
            );
          })()}

          {/* 2. BOTÓN PORTADA: Ubicado inmediatamente después del botón Sección + */}
          {(() => {
            const isActive = activeTab === portadaTab.id && isPanelOpen;
            return (
              <button
                key={portadaTab.id}
                type="button"
                onClick={() => handleTabClick(portadaTab.id)}
                className={`w-11 h-9 rounded-[${radius.modal}] flex flex-col items-center justify-center transition group relative cursor-pointer border ${
                  isActive
                    ? `bg-[var(--color-accent-base)] border-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.floating} shadow-[var(--color-accent-base)]/30 scale-105`
                    : 'bg-[var(--ui-dock-hover)] border-[var(--ui-dock-border)] text-[var(--color-secondary-bright)] hover:text-[var(--ui-dock-text)] hover:bg-[var(--color-secondary-muted)]'
                }`}
                title="Diseñador & Configuración de Portada Profesional (Portada)"
              >
                <DomSectionIcon iconId="portada" className="w-3.5 h-3.5" color={isActive ? 'var(--color-accent-on-base)' : 'var(--color-secondary-bright)'} />
                <span className={`text-[8px] font-extrabold tracking-tighter mt-0.5 leading-none ${isActive ? 'text-[var(--color-accent-on-base)]' : 'text-[var(--ui-dock-text-muted)]'}`}>
                  {portadaTab.label}
                </span>

                <span className={`absolute left-14 bg-[var(--ui-bg-dock)] text-[var(--ui-dock-text)] text-xs font-bold px-2 py-1 rounded-[${radius.control}] ${elevationSystem.overlay} opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-[var(--ui-dock-border)]`}>
                  Portada Profesional
                </span>
              </button>
            );
          })()}

          {/* 3. Personal (pestaña agregada de contacto) */}
          {(() => {
            const isActive = activeTab === personalTab.id && isPanelOpen;
            return (
              <button
                key={personalTab.id}
                type="button"
                onClick={() => handleTabClick(personalTab.id)}
                className={`w-11 h-9 rounded-[${radius.modal}] flex flex-col items-center justify-center transition group relative cursor-pointer ${
                  isActive
                    ? `bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] ${elevationSystem.floating} shadow-[var(--color-secondary-base)]/30 scale-105`
                    : 'text-[var(--ui-dock-text-muted)] hover:text-[var(--ui-dock-text)] hover:bg-[var(--ui-dock-hover)]'
                }`}
                title={personalTab.label}
              >
                <DomSectionIcon iconId={personalTab.iconId} className="w-3.5 h-3.5" color={isActive ? 'var(--color-secondary-on-base)' : 'var(--color-secondary-bright)'} />
                <span className={`text-[8px] font-extrabold tracking-tighter mt-0.5 leading-none ${isActive ? 'text-[var(--color-secondary-on-base)]' : 'text-[var(--ui-dock-text-muted)]'}`}>{personalTab.label}</span>
                <span className={`absolute left-14 bg-[var(--ui-bg-dock)] text-[var(--ui-dock-text)] text-xs font-bold px-2 py-1 rounded-[${radius.control}] ${elevationSystem.overlay} opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-[var(--ui-dock-border)]`}>
                  {personalTab.label}
                </span>
              </button>
            );
          })()}

          {/* 4. Secciones dinámicas generadas por activeSectionsDockEngine */}
          {dockSections.map((sec) => {
            const isActive = activeTab === sec.id && isPanelOpen;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => handleTabClick(sec.id)}
                className={`w-11 h-9 rounded-[${radius.modal}] flex flex-col items-center justify-center transition group relative cursor-pointer ${
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
                  className="w-3.5 h-3.5"
                  color={sec.isCustom ? (isActive ? '#FFFFFF' : 'var(--color-secondary-bright)') : (isActive ? 'var(--color-secondary-on-base)' : 'var(--color-secondary-bright)')}
                />
                <span className={`text-[8px] font-extrabold tracking-tighter mt-0.5 leading-none truncate max-w-[42px] ${isActive ? 'text-[var(--ui-dock-text)]' : 'text-[var(--ui-dock-text-muted)]'}`}>
                  {sec.isCustom ? sec.label.substring(0, 6) : sec.label}
                </span>

                <span className={`absolute left-14 bg-[var(--ui-bg-dock)] text-[var(--ui-dock-text)] text-xs font-bold px-2 py-1 rounded-[${radius.control}] ${elevationSystem.overlay} opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-[var(--ui-dock-border)]`}>
                  {sec.label}
                </span>
              </button>
            );
          })}

          {/* FLECHA SUTIL Y ELEGANTE AL FINAL DEL DOCK EN ESCRITORIO: Indica más secciones abajo */}
          <div className="pt-1.5 pb-1 flex flex-col items-center justify-center text-[var(--color-secondary-bright)] animate-bounce opacity-70 hover:opacity-100 transition cursor-pointer shrink-0" title="Desliza para ver más secciones">
            <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Dock Bar (< 768px): Compacto y estilizado */}
      <nav 
        ref={mobileNavRef}
        onWheel={(e) => {
          if (e.currentTarget) {
            e.currentTarget.scrollLeft += (e.deltaY || e.deltaX);
          }
        }}
        className={`md:hidden fixed bottom-0 left-0 right-0 z-[999] bg-[var(--ui-bg-dock)] border-t border-[var(--ui-dock-border)] px-1.5 py-1 flex items-center gap-1 overflow-x-auto no-scrollbar ${elevationSystem.overlay} select-none h-11`}
      >
        <button
          type="button"
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className={`p-2 rounded-[${radius.card}] flex items-center justify-center shrink-0 transition cursor-pointer ${
            isPanelOpen
              ? `bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.raised}`
              : 'bg-[var(--ui-bg-panel)] text-[var(--color-accent-amber-bright)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-card)]'
          }`}
          title={isPanelOpen ? 'Cerrar Panel' : 'Abrir Panel'}
        >
          {isPanelOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
        </button>

        <div className="w-px h-5 bg-[var(--ui-dock-border)] shrink-0" />

        {/* BOTONES DE ESTILO EN MÓVIL (Diseño y Columnas) */}
        {styleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && isPanelOpen;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`p-2 rounded-[${radius.card}] flex items-center justify-center shrink-0 transition cursor-pointer ${
                isActive
                  ? `bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.raised}`
                  : 'bg-[var(--ui-bg-panel)] text-[var(--ui-dock-text-muted)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-card)] hover:text-[var(--ui-dock-text)]'
              }`}
              title={tab.label}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[var(--color-accent-on-base)]' : 'text-[var(--ui-dock-text-muted)]'}`} />
            </button>
          );
        })}

        {/* Botón Sección justo después de Columnas en Mobile */}
        <button
          type="button"
          onClick={() => handleTabClick(addSectionTab.id)}
          className={`px-2 py-1 rounded-[${radius.card}] font-black text-[9px] shrink-0 flex flex-col items-center justify-center cursor-pointer border ${
            activeTab === addSectionTab.id && isPanelOpen
              ? 'bg-[var(--color-status-success-base)] border-[var(--color-status-success-base)] text-[var(--color-status-success-on-base)]'
              : 'bg-[var(--ui-bg-panel)] border-[var(--color-status-success-base)]/40 text-[var(--color-status-success-bright)] hover:bg-[var(--color-status-success-muted)]'
          }`}
        >
          <Plus className={`w-3.5 h-3.5 ${activeTab === addSectionTab.id && isPanelOpen ? 'text-[var(--color-status-success-on-base)]' : ''}`} />
          <span className="mt-0.5 leading-none">{addSectionTab.label}</span>
        </button>

        {/* Botón Portada ubicado inmediatamente después del botón Sección + en Mobile */}
        {(() => {
          const isActive = activeTab === portadaTab.id && isPanelOpen;
          return (
            <button
              type="button"
              onClick={() => handleTabClick(portadaTab.id)}
              className={`px-2 py-1 rounded-[${radius.card}] font-black text-[9px] shrink-0 flex flex-col items-center justify-center cursor-pointer border transition ${
                isActive
                  ? 'bg-[var(--color-accent-base)] border-[var(--color-accent-base)] text-[var(--color-accent-on-base)]'
                  : 'bg-[var(--ui-bg-panel)] border-[var(--ui-border)] text-[var(--color-secondary-bright)] hover:bg-[var(--ui-bg-card)]'
              }`}
              title="Portada Profesional"
            >
              <DomSectionIcon iconId="portada" className="w-3.5 h-3.5" color={isActive ? 'var(--color-accent-on-base)' : 'var(--color-secondary-bright)'} />
              <span className="mt-0.5 leading-none">{portadaTab.label}</span>
            </button>
          );
        })()}

        <div className="w-px h-5 bg-[var(--ui-dock-border)] shrink-0" />

        {(() => {
          const isActive = activeTab === personalTab.id && isPanelOpen;
          return (
            <button
              type="button"
              onClick={() => handleTabClick(personalTab.id)}
              className={`px-2 py-1 rounded-[${radius.card}] flex flex-col items-center justify-center text-[9px] font-black shrink-0 transition cursor-pointer ${
                isActive
                  ? `bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] ${elevationSystem.raised}`
                  : 'bg-[var(--ui-bg-panel)] text-[var(--color-secondary-bright)] border border-[var(--color-secondary-base)]/30 hover:bg-[var(--color-secondary-muted)]'
              }`}
            >
              <DomSectionIcon iconId={personalTab.iconId} className="w-3.5 h-3.5" color={isActive ? 'var(--color-secondary-on-base)' : 'var(--color-secondary-bright)'} />
              <span className="mt-0.5 leading-none">{personalTab.label}</span>
            </button>
          );
        })()}

        {dockSections.map((sec) => {
          const isActive = activeTab === sec.id && isPanelOpen;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => handleTabClick(sec.id)}
              className={`px-2 py-1 rounded-[${radius.card}] flex flex-col items-center justify-center text-[9px] font-black shrink-0 transition cursor-pointer ${
                isActive
                  ? sec.isCustom
                    ? `bg-[var(--color-accent-purple)] text-white ${elevationSystem.raised}`
                    : `bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] ${elevationSystem.raised}`
                  : sec.isCustom
                    ? 'bg-[var(--ui-bg-panel)] text-[var(--color-accent-purple-bright)] border border-[var(--color-accent-purple)]/30 hover:bg-[var(--color-accent-purple-light)]'
                    : 'bg-[var(--ui-bg-panel)] text-[var(--color-secondary-bright)] border border-[var(--color-secondary-base)]/30 hover:bg-[var(--color-secondary-muted)]'
              }`}
            >
              <DomSectionIcon
                iconId={sec.iconId}
                className="w-3.5 h-3.5"
                color={sec.isCustom ? (isActive ? '#FFFFFF' : 'var(--color-accent-purple-bright)') : (isActive ? 'var(--color-secondary-on-base)' : 'var(--color-secondary-bright)')}
              />
              <span className="mt-0.5 leading-none">{sec.label}</span>
            </button>
          );
        })}

        {/* FLECHA SUTIL Y ELEGANTE EN MÓVIL: Indica más secciones desplazables a la derecha */}
        <div className="shrink-0 px-1 flex items-center justify-center text-[var(--color-accent-amber-bright)] animate-pulse opacity-90" title="Desliza horizontalmente para ver más secciones">
          <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
      </nav>
    </>
  );
}
