import React, { useRef } from 'react';
import { 
  Palette, Layout, Sparkles, Menu, X, Plus
} from 'lucide-react';
import { DomSectionIcon } from '../../../shared/core/pdf-engine/layers/icons/DomSectionIcon';

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

// 2. Botón Especial: Sección + (SIEMPRE PRIMERO ARRIBA)
const addSectionTab = { id: 'nueva_seccion', label: 'Sección +', iconId: 'custom' };

// 3. Orden Fijo Prioritario Solicitado por el Usuario
const fixedPrioritySections = [
  { id: 'personales', label: 'Personal', iconId: 'personales' },
  { id: 'formacion', label: 'Formación', iconId: 'formacion' },
  { id: 'profesion', label: 'Profesión', iconId: 'profesion' },
  { id: 'cursos', label: 'Cursos', iconId: 'cursos' },
  { id: 'experiencia', label: 'Experiencia', iconId: 'experiencia' },
  { id: 'informatica', label: 'Informática', iconId: 'informatica' },
  { id: 'firma', label: 'Firma', iconId: 'firma' },
  { id: 'certificados', label: 'Certificados', iconId: 'certificados' },
];

export default function CanvaIconDock({ 
  cvData,
  setCvData,
  activeTab, 
  setActiveTab, 
  isPanelOpen, 
  setIsPanelOpen 
}: CanvaIconDockProps) {
  const mobileNavRef = useRef<HTMLDivElement>(null);

  const customSections = cvData?.customSections || [];

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
      {/* Desktop & Tablet Vertical Left Dock (Width: 64px) — Por encima de Barra Superior y Footer */}
      <aside className="hidden md:flex flex-col items-center py-3 bg-[#1C121E] border-r border-[var(--color-neutral-text-secondary)]/30 text-white z-[100] select-none w-16 shrink-0 fixed top-0 bottom-0 left-0 h-screen overflow-y-auto no-scrollbar shadow-2xl">
        {/* Toggle Drawer Button (Menú para esconder/abrir panel) */}
        <button
          type="button"
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className={`p-2.5 rounded-2xl mb-3 transition transform active:scale-95 cursor-pointer ${
            isPanelOpen
              ? 'bg-[var(--color-accent-base)] text-white shadow-lg shadow-[var(--color-accent-base)]/30'
              : 'bg-[var(--color-neutral-text-primary)] text-slate-300 hover:text-white hover:bg-[#3D2740]'
          }`}
          title={isPanelOpen ? 'Cerrar Panel Editor' : 'Abrir Panel Editor'}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="w-8 h-px bg-white/10 mb-3" />

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
                className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition group relative cursor-pointer ${
                  isActive
                    ? 'bg-[var(--color-accent-base)] text-white shadow-lg shadow-[var(--color-accent-base)]/30 scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-[var(--color-neutral-text-primary)]'
                }`}
                title={tab.label}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#FFC93C]'}`} />
                <span className="text-[9px] font-bold tracking-tighter mt-0.5">{tab.label}</span>
                
                <span className="absolute left-14 bg-[var(--color-neutral-text-primary)] text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-white/10">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="w-8 h-px bg-white/10 mb-3" />

        {/* Content Sections Group */}
        <div className="flex flex-col items-center gap-1.5 flex-1 w-full px-1">
          {/* 1. BOTÓN SIEMPRE PRIMERO ARRIBA: Sección + */}
          {(() => {
            const isActive = activeTab === addSectionTab.id && isPanelOpen;
            return (
              <button
                key={addSectionTab.id}
                type="button"
                onClick={() => handleTabClick(addSectionTab.id)}
                className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition group relative cursor-pointer border-2 ${
                  isActive
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/30 scale-105'
                    : 'bg-[var(--color-neutral-text-primary)] border-emerald-500/60 text-emerald-400 hover:bg-emerald-950'
                }`}
                title="Catálogo y Creador de Secciones (Sección +)"
              >
                <Plus className="w-5 h-5 text-emerald-400" />
                <span className="text-[8px] font-black tracking-tighter uppercase mt-0.5 leading-none">
                  {addSectionTab.label}
                </span>

                <span className="absolute left-14 bg-[var(--color-neutral-text-primary)] text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-emerald-500/30">
                  Catálogo & Creador (+ Sección)
                </span>
              </button>
            );
          })()}

          {/* 2. Secciones Personalizadas Incorporadas (Se ubican justo debajo de Sección +) */}
          {customSections.map((cs: any) => {
            const isActive = activeTab === cs.id && isPanelOpen;
            const iconId = cs.iconId || 'custom';
            return (
              <button
                key={cs.id}
                type="button"
                onClick={() => handleTabClick(cs.id)}
                className={`w-12 h-11 rounded-2xl flex flex-col items-center justify-center transition group relative cursor-pointer ${
                  isActive
                    ? 'bg-[var(--color-secondary-base)] text-white shadow-lg shadow-[var(--color-secondary-base)]/30 scale-105'
                    : 'bg-[var(--color-neutral-text-primary)] text-teal-300 border border-teal-500/30 hover:bg-[#3D2740]'
                }`}
                title={cs.titleText}
              >
                <DomSectionIcon iconId={iconId} className="w-4 h-4" color={isActive ? '#ffffff' : 'var(--color-secondary-base)'} />
                <span className="text-[9px] font-extrabold tracking-tighter mt-0.5 leading-none truncate max-w-[44px]">
                  {cs.titleText?.substring(0, 6) || 'Personal'}
                </span>

                <span className="absolute left-14 bg-[var(--color-neutral-text-primary)] text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-white/10">
                  {cs.titleText}
                </span>
              </button>
            );
          })}

          {/* 3. Secciones Prioritarias Fijas */}
          {fixedPrioritySections.map((sec) => {
            const isActive = activeTab === sec.id && isPanelOpen;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => handleTabClick(sec.id)}
                className={`w-12 h-11 rounded-2xl flex flex-col items-center justify-center transition group relative cursor-pointer ${
                  isActive
                    ? 'bg-[var(--color-secondary-base)] text-white shadow-lg shadow-[var(--color-secondary-base)]/30 scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-[var(--color-neutral-text-primary)]'
                }`}
                title={sec.label}
              >
                <DomSectionIcon iconId={sec.iconId} className="w-4 h-4" color={isActive ? '#ffffff' : '#FFC93C'} />
                <span className="text-[9px] font-extrabold tracking-tighter mt-0.5 leading-none">{sec.label}</span>

                <span className="absolute left-14 bg-[var(--color-neutral-text-primary)] text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-white/10">
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
        className="md:hidden fixed bottom-0 left-0 right-0 z-[999] ui-bg-dock border-t border-[var(--color-neutral-text-secondary)]/40 px-2 py-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-2xl select-none"
      >
        <button
          type="button"
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className={`p-2.5 rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer ${
            isPanelOpen
              ? 'bg-[var(--color-accent-base)] text-white shadow-md'
              : 'bg-[var(--color-neutral-text-primary)] text-amber-400 border border-amber-400/30'
          }`}
          title={isPanelOpen ? 'Cerrar Panel' : 'Abrir Panel'}
        >
          {isPanelOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        <div className="w-px h-6 bg-white/20 shrink-0" />

        {/* Botón Tema en Móvil */}
        <button
          type="button"
          onClick={() => {
            if (setCvData) {
              setCvData(prev => {
                const current = prev?.uiTheme || 'default';
                const nextTheme = current === 'default' ? 'dark' : current === 'dark' ? 'teal_ocean' : 'default';
                if (typeof document !== 'undefined') {
                  document.documentElement.setAttribute('data-ui-theme', nextTheme);
                }
                return { ...prev, uiTheme: nextTheme };
              });
            }
          }}
          className="px-2.5 py-1.5 rounded-xl bg-[var(--color-neutral-text-primary)] border border-amber-400/40 text-amber-300 text-[11px] font-black shrink-0 flex items-center gap-1 cursor-pointer active:scale-95"
          title="Cambiar Tema de Interfaz"
        >
          <span>Tema</span>
          <Palette className="w-3.5 h-3.5 text-[var(--color-accent-base)]" />
        </button>

        <div className="w-px h-6 bg-white/20 shrink-0" />

        {styleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && isPanelOpen;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1 text-[11px] font-black shrink-0 transition cursor-pointer ${
                isActive
                  ? 'bg-[var(--color-accent-base)] text-white shadow-md'
                  : 'bg-[var(--color-neutral-text-primary)] text-[var(--color-neutral-border)]/80 hover:bg-[#3D2740]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-[#FFC93C]" />
              <span>{tab.label}</span>
            </button>
          );
        })}

        {/* Botón Sección + justo después del botón Columnas en Mobile */}
        <button
          type="button"
          onClick={() => handleTabClick(addSectionTab.id)}
          className={`px-3 py-1.5 rounded-xl font-black text-[11px] shrink-0 flex items-center gap-1 shadow cursor-pointer border ${
            activeTab === addSectionTab.id && isPanelOpen
              ? 'bg-emerald-600 border-emerald-400 text-white'
              : 'bg-[var(--color-neutral-text-primary)] border-emerald-500/60 text-emerald-400'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Sección +</span>
        </button>

        <div className="w-px h-6 bg-white/20 shrink-0" />

        {fixedPrioritySections.map((sec) => {
          const isActive = activeTab === sec.id && isPanelOpen;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => handleTabClick(sec.id)}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1 text-[11px] font-black shrink-0 transition cursor-pointer ${
                isActive
                  ? 'bg-[var(--color-secondary-base)] text-white shadow-md'
                  : 'bg-[var(--color-neutral-text-primary)] text-[var(--color-neutral-border)]/80 hover:bg-[#3D2740]'
              }`}
            >
              <DomSectionIcon iconId={sec.iconId} className="w-3.5 h-3.5" color={isActive ? '#ffffff' : '#FFC93C'} />
              <span>{sec.label}</span>
            </button>
          );
        })}

        {customSections.map((cs: any) => {
          const isActive = activeTab === cs.id && isPanelOpen;
          const iconId = cs.iconId || 'custom';
          return (
            <button
              key={cs.id}
              type="button"
              onClick={() => handleTabClick(cs.id)}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1 text-[11px] font-black shrink-0 transition cursor-pointer ${
                isActive
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-[var(--color-neutral-text-primary)] text-purple-300 hover:bg-[#3D2740]'
              }`}
            >
              <DomSectionIcon iconId={iconId} className="w-3.5 h-3.5" color={isActive ? '#ffffff' : '#A855F7'} />
              <span>{cs.titleText}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
