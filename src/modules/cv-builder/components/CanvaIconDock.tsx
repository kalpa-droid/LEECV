import React, { useMemo, useRef } from 'react';
import { 
  Palette, Layout, Sparkles, Menu, X, Plus
} from 'lucide-react';
import { DomSectionIcon } from '../../../shared/core/pdf-engine/layers/icons/DomSectionIcon';
import { getNextUiTheme, UI_THEME_META, elevationSystem, radius } from '../../../shared/core/uiDesignSystem';
import { resolveActiveDockSections } from '../../../shared/core/sections/activeSectionsDockEngine';

export interface CanvaIconDockProps {
  cvData?: any;
  setCvData?: React.Dispatch<React.SetStateAction<any>>;
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean) => void;
}

// 1. Pestañas de Estilo y Maquetación
const styleTabs = [
  { id: 'diseno', label: 'Diseño', icon: Palette },
  { id: 'portada', label: 'Portada', icon: Sparkles },
  { id: 'paneles', label: 'Columnas', icon: Layout },
];

// 2. Botón Especial: Sección (SIEMPRE PRIMERO ARRIBA)
const addSectionTab = { id: 'nueva_seccion', label: 'Sección', iconId: 'custom' };

// 3. Pestaña "Personal" — agrega contacto/datos-personales/frase en una sola vista
const personalTab = { id: 'personales', label: 'Personal', iconId: 'personales' };

export default function CanvaIconDock({ 
  cvData,
  setCvData,
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

  const handleWheelScroll = (e: React.WheelEvent) => {
    if (mobileNavRef.current) {
      mobileNavRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <>
      {/* Desktop & Tablet Vertical Left Dock (Width: 64px) */}
      <aside className="hidden md:flex flex-col items-center py-3 bg-[var(--ui-bg-dock)] border-r border-[var(--ui-dock-border)] text-[var(--ui-dock-text)] z-[100] select-none w-16 shrink-0 fixed top-0 bottom-0 left-0 h-screen overflow-y-auto no-scrollbar shadow-[var(--shadow-dock)]">
        {/* Toggle Drawer Button */}
        <button
          type="button"
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className={`p-2.5 rounded-[${radius.modal}] mb-3 transition transform active:scale-95 cursor-pointer ${
            isPanelOpen
              ? `bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.floating} shadow-[var(--color-accent-base)]/30`
              : 'bg-[var(--ui-dock-hover)] text-[var(--ui-dock-text-muted)] hover:text-[var(--ui-dock-text)]'
          }`}
          title={isPanelOpen ? 'Cerrar Panel Editor' : 'Abrir Panel Editor'}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="w-8 h-px bg-[var(--ui-dock-separator)] mb-3" />

        {/* Style & Layout Group */}
        <div className="flex flex-col items-center gap-2 mb-3">
          {styleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id && isPanelOpen;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className={`w-12 h-12 rounded-[${radius.modal}] flex flex-col items-center justify-center transition group relative cursor-pointer ${
                  isActive
                    ? `bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.floating} shadow-[var(--color-accent-base)]/30 scale-105`
                    : 'text-[var(--ui-dock-text-muted)] hover:text-[var(--ui-dock-text)] hover:bg-[var(--ui-dock-hover)]'
                }`}
                title={tab.label}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[var(--color-accent-on-base)]' : 'text-[var(--color-secondary-bright)]'}`} />
                <span className={`text-[9px] font-bold tracking-tighter mt-0.5 ${isActive ? 'text-[var(--color-accent-on-base)]' : 'text-[var(--ui-dock-text-muted)]'}`}>{tab.label}</span>
                
                <span className={`absolute left-14 bg-[var(--ui-bg-dock)] text-[var(--ui-dock-text)] text-xs font-bold px-2.5 py-1 rounded-[${radius.control}] ${elevationSystem.overlay} opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-[var(--ui-dock-border)]`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="w-8 h-px bg-[var(--ui-dock-separator)] mb-3" />

        {/* Content Sections Group */}
        <div className="flex flex-col items-center gap-2 flex-1 w-full px-1">
          {/* 1. BOTÓN SIEMPRE PRIMERO ARRIBA: Sección + */}
          {(() => {
            const isActive = activeTab === addSectionTab.id && isPanelOpen;
            return (
              <button
                key={addSectionTab.id}
                type="button"
                onClick={() => handleTabClick(addSectionTab.id)}
                className={`w-12 h-12 rounded-[${radius.modal}] flex flex-col items-center justify-center transition group relative cursor-pointer border-2 ${
                  isActive
                    ? `bg-[var(--color-status-success-base)] border-[var(--color-status-success-base)] text-[var(--color-status-success-on-base)] ${elevationSystem.raised} scale-105`
                    : 'bg-[var(--ui-dock-hover)] border-[var(--color-status-success-base)]/80 text-[var(--color-status-success-bright)] hover:bg-[var(--color-status-success-muted)]'
                }`}
                title="Catálogo y Creador de Secciones (Sección)"
              >
                <Plus className={`w-5 h-5 ${isActive ? 'text-[var(--color-status-success-on-base)]' : 'text-[var(--color-status-success-text)]'}`} />
                <span className={`text-[8px] font-black tracking-tighter uppercase mt-0.5 leading-none ${isActive ? 'text-[var(--color-status-success-on-base)]' : 'text-[var(--color-status-success-text)]'}`}>
                  {addSectionTab.label}
                </span>

                <span className={`absolute left-14 bg-[var(--ui-bg-dock)] text-[var(--color-status-success-text)] text-xs font-bold px-2.5 py-1 rounded-[${radius.control}] ${elevationSystem.overlay} opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-[var(--color-status-success-base)]/30`}>
                  Catálogo & Creador de Secciones
                </span>
              </button>
            );
          })()}

          {/* 2. Personal (pestaña agregada de contacto) */}
          {(() => {
            const isActive = activeTab === personalTab.id && isPanelOpen;
            return (
              <button
                key={personalTab.id}
                type="button"
                onClick={() => handleTabClick(personalTab.id)}
                className={`w-12 h-11 rounded-[${radius.modal}] flex flex-col items-center justify-center transition group relative cursor-pointer ${
                  isActive
                    ? `bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] ${elevationSystem.floating} shadow-[var(--color-secondary-base)]/30 scale-105`
                    : 'text-[var(--ui-dock-text-muted)] hover:text-[var(--ui-dock-text)] hover:bg-[var(--ui-dock-hover)]'
                }`}
                title={personalTab.label}
              >
                <DomSectionIcon iconId={personalTab.iconId} className="w-4 h-4" color={isActive ? 'var(--color-secondary-on-base)' : 'var(--color-secondary-bright)'} />
                <span className={`text-[9px] font-extrabold tracking-tighter mt-0.5 leading-none ${isActive ? 'text-[var(--color-secondary-on-base)]' : 'text-[var(--ui-dock-text-muted)]'}`}>{personalTab.label}</span>
                <span className={`absolute left-14 bg-[var(--ui-bg-dock)] text-[var(--ui-dock-text)] text-xs font-bold px-2.5 py-1 rounded-[${radius.control}] ${elevationSystem.overlay} opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-[var(--ui-dock-border)]`}>
                  {personalTab.label}
                </span>
              </button>
            );
          })()}

          {/* 3. Secciones dinámicas generadas por activeSectionsDockEngine */}
          {dockSections.map((sec) => {
            const isActive = activeTab === sec.id && isPanelOpen;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => handleTabClick(sec.id)}
                className={`w-12 h-11 rounded-[${radius.modal}] flex flex-col items-center justify-center transition group relative cursor-pointer ${
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
                  className="w-4 h-4"
                  color={sec.isCustom ? (isActive ? '#FFFFFF' : 'var(--color-secondary-bright)') : (isActive ? 'var(--color-secondary-on-base)' : 'var(--color-secondary-bright)')}
                />
                <span className={`text-[9px] font-extrabold tracking-tighter mt-0.5 leading-none truncate max-w-[44px] ${isActive ? (sec.isCustom ? 'text-white' : 'text-[var(--color-secondary-on-base)]') : 'text-[var(--ui-dock-text-muted)]'}`}>
                  {sec.isCustom ? sec.label.substring(0, 6) : sec.label}
                </span>

                <span className={`absolute left-14 bg-[var(--ui-bg-dock)] text-[var(--ui-dock-text)] text-xs font-bold px-2.5 py-1 rounded-[${radius.control}] ${elevationSystem.overlay} opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-[var(--ui-dock-border)]`}>
                  {sec.label}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Mobile Bottom Dock Bar (< 768px) */}
      <nav 
        ref={mobileNavRef}
        onWheel={handleWheelScroll}
        className={`md:hidden fixed bottom-0 left-0 right-0 z-[999] ui-bg-dock border-t border-[var(--ui-dock-border)] px-2 py-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar ${elevationSystem.overlay} select-none`}
      >
        <button
          type="button"
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className={`p-2.5 rounded-[${radius.card}] transition flex items-center justify-center shrink-0 cursor-pointer ${
            isPanelOpen
              ? `bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.raised}`
              : 'bg-[var(--ui-bg-panel)] text-[var(--color-accent-amber-bright)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-card)]'
          }`}
          title={isPanelOpen ? 'Cerrar Panel' : 'Abrir Panel'}
        >
          {isPanelOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        <div className="w-px h-6 bg-[var(--ui-dock-border)] shrink-0" />

        {/* Botón Tema en Móvil */}
        {(() => {
          const currentThemeId = cvData?.uiTheme || 'default';
          const meta = UI_THEME_META[currentThemeId] || UI_THEME_META.default;
          return (
            <button
              type="button"
              onClick={() => {
                if (setCvData) {
                  setCvData((prev: any) => {
                    const current = prev?.uiTheme || 'default';
                    const nextTheme = getNextUiTheme(current);
                    if (typeof document !== 'undefined') {
                      document.documentElement.setAttribute('data-ui-theme', nextTheme);
                    }
                    return { ...prev, uiTheme: nextTheme };
                  });
                }
              }}
              className={`px-2.5 py-1.5 rounded-[${radius.card}] bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] text-[11px] font-black shrink-0 flex items-center gap-1.5 cursor-pointer active:scale-95 ${elevationSystem.raised}`}
              title={`Tema actual: ${meta.label}`}
            >
              <span>{meta.shortLabel}</span>
              <span className="text-sm leading-none">{meta.emoji}</span>
            </button>
          );
        })()}

        <div className="w-px h-6 bg-[var(--ui-dock-border)] shrink-0" />

        {styleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && isPanelOpen;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`px-3 py-1.5 rounded-[${radius.card}] flex items-center gap-1 text-[11px] font-black shrink-0 transition cursor-pointer ${
                isActive
                  ? `bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.raised}`
                  : 'bg-[var(--ui-bg-panel)] text-[var(--ui-dock-text-muted)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-card)] hover:text-[var(--ui-dock-text)]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[var(--color-accent-on-base)]' : 'text-[var(--ui-dock-text-muted)]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}

        {/* Botón Sección justo después del botón Columnas en Mobile */}
        <button
          type="button"
          onClick={() => handleTabClick(addSectionTab.id)}
          className={`px-3 py-1.5 rounded-[${radius.card}] font-black text-[11px] shrink-0 flex items-center gap-1 shadow cursor-pointer border ${
            activeTab === addSectionTab.id && isPanelOpen
              ? 'bg-[var(--color-status-success-base)] border-[var(--color-status-success-base)] text-[var(--color-status-success-on-base)]'
              : 'bg-[var(--ui-bg-panel)] border-[var(--color-status-success-base)]/40 text-[var(--color-status-success-bright)] hover:bg-[var(--color-status-success-muted)]'
          }`}
        >
          <Plus className={`w-3.5 h-3.5 ${activeTab === addSectionTab.id && isPanelOpen ? 'text-[var(--color-status-success-on-base)]' : ''}`} />
          <span>Sección</span>
        </button>

        <div className="w-px h-6 bg-[var(--ui-dock-border)] shrink-0" />

        {(() => {
          const isActive = activeTab === personalTab.id && isPanelOpen;
          return (
            <button
              type="button"
              onClick={() => handleTabClick(personalTab.id)}
              className={`px-3 py-1.5 rounded-[${radius.card}] flex items-center gap-1 text-[11px] font-black shrink-0 transition cursor-pointer ${
                isActive
                  ? `bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] ${elevationSystem.raised}`
                  : 'bg-[var(--ui-bg-panel)] text-[var(--color-secondary-bright)] border border-[var(--color-secondary-base)]/30 hover:bg-[var(--color-secondary-muted)]'
              }`}
            >
              <DomSectionIcon iconId={personalTab.iconId} className="w-3.5 h-3.5" color={isActive ? 'var(--color-secondary-on-base)' : 'var(--color-secondary-bright)'} />
              <span>{personalTab.label}</span>
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
              className={`px-3 py-1.5 rounded-[${radius.card}] flex items-center gap-1 text-[11px] font-black shrink-0 transition cursor-pointer ${
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
              <span>{sec.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
