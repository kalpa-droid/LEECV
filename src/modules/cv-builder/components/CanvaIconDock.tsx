import React, { useRef, useState } from 'react';
import { 
  Palette, Layout, Sparkles, Menu, X, Plus, ChevronDown, Check, Eye, EyeOff
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

// 2. Secciones Prioritarias Fijas (Siempre en este orden)
const fixedPrioritySections = [
  { id: 'personales', label: 'Personal', iconId: 'personales' },
  { id: 'formacion', label: 'Formación', iconId: 'formacion' },
  { id: 'profesion', label: 'Profesión', iconId: 'profesion' },
  { id: 'experiencia', label: 'Experiencia', iconId: 'experiencia' },
  { id: 'cursos', label: 'Cursos', iconId: 'cursos' },
];

// 3. Secciones Opcionales de la App
const optionalAppSections = [
  { id: 'informatica', label: 'Informática', iconId: 'informatica' },
  { id: 'ecologia', label: 'Proyectos', iconId: 'ecologia' },
  { id: 'certificados', label: 'Certificados', iconId: 'certificados' },
  { id: 'firma', label: 'Firma', iconId: 'firma' },
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
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const visibility = cvData?.sectionVisibility || {};
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

  const toggleSectionVisibility = (secId: string) => {
    if (!setCvData) return;
    setCvData((prev: any) => {
      const currentVis = prev.sectionVisibility || {};
      const newStatus = currentVis[secId] === false ? true : false;
      return {
        ...prev,
        sectionVisibility: {
          ...currentVis,
          [secId]: newStatus
        }
      };
    });
  };

  return (
    <>
      {/* Desktop & Tablet Vertical Left Dock (Width: 68px) */}
      <aside className="hidden md:flex flex-col items-center py-3 bg-[#1C121E] border-r border-[#6B5B6E]/30 text-white z-30 select-none w-16 shrink-0 h-full overflow-y-auto no-scrollbar relative">
        {/* Toggle Drawer Button (☰ ↔ ✕) */}
        <button
          type="button"
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className={`p-2.5 rounded-2xl mb-3 transition transform active:scale-95 cursor-pointer ${
            isPanelOpen
              ? 'bg-[#FF2E63] text-white shadow-lg shadow-[#FF2E63]/30'
              : 'bg-[#2B1B2E] text-slate-300 hover:text-white hover:bg-[#3D2740]'
          }`}
          title={isPanelOpen ? 'Cerrar Panel Editor' : 'Abrir Panel Editor'}
        >
          {isPanelOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
                    ? 'bg-[#FF2E63] text-white shadow-lg shadow-[#FF2E63]/30 scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-[#2B1B2E]'
                }`}
                title={tab.label}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#FFC93C]'}`} />
                <span className="text-[9px] font-bold tracking-tighter mt-0.5">{tab.label}</span>
                
                <span className="absolute left-14 bg-[#2B1B2E] text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-white/10">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="w-8 h-px bg-white/10 mb-3" />

        {/* Content Sections Group */}
        <div className="flex flex-col items-center gap-1.5 flex-1 w-full px-1">
          {/* 1. Secciones Prioritarias Fijas */}
          {fixedPrioritySections.map((sec) => {
            const isActive = activeTab === sec.id && isPanelOpen;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => handleTabClick(sec.id)}
                className={`w-12 h-11 rounded-2xl flex flex-col items-center justify-center transition group relative cursor-pointer ${
                  isActive
                    ? 'bg-[#00A8A0] text-white shadow-lg shadow-[#00A8A0]/30 scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-[#2B1B2E]'
                }`}
                title={sec.label}
              >
                <DomSectionIcon iconId={sec.iconId} className="w-4 h-4" color={isActive ? '#ffffff' : '#FFC93C'} />
                <span className="text-[9px] font-extrabold tracking-tighter mt-0.5 leading-none">{sec.label}</span>

                <span className="absolute left-14 bg-[#2B1B2E] text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-white/10">
                  {sec.label}
                </span>
              </button>
            );
          })}

          {/* 2. Secciones Opcionales Activas */}
          {optionalAppSections
            .filter((sec) => visibility[sec.id] !== false)
            .map((sec) => {
              const isActive = activeTab === sec.id && isPanelOpen;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => handleTabClick(sec.id)}
                  className={`w-12 h-11 rounded-2xl flex flex-col items-center justify-center transition group relative cursor-pointer ${
                    isActive
                      ? 'bg-[#00A8A0] text-white shadow-lg shadow-[#00A8A0]/30 scale-105'
                      : 'text-slate-300 hover:text-white hover:bg-[#2B1B2E]'
                  }`}
                  title={sec.label}
                >
                  <DomSectionIcon iconId={sec.iconId} className="w-4 h-4" color={isActive ? '#ffffff' : '#00A8A0'} />
                  <span className="text-[9px] font-extrabold tracking-tighter mt-0.5 leading-none truncate max-w-[44px]">{sec.label}</span>

                  <span className="absolute left-14 bg-[#2B1B2E] text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-white/10">
                    {sec.label}
                  </span>
                </button>
              );
            })}

          {/* 3. Secciones Personalizadas Dinámicas (Navegación 1 a 1 direct) */}
          {customSections.map((cs: any) => {
            const isActive = activeTab === cs.id && isPanelOpen;
            return (
              <button
                key={cs.id}
                type="button"
                onClick={() => handleTabClick(cs.id)}
                className={`w-12 h-11 rounded-2xl flex flex-col items-center justify-center transition group relative cursor-pointer ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 scale-105'
                    : 'text-purple-300 hover:text-white hover:bg-[#2B1B2E]'
                }`}
                title={cs.titleText}
              >
                <DomSectionIcon iconId="custom" className="w-4 h-4" color={isActive ? '#ffffff' : '#A855F7'} />
                <span className="text-[9px] font-extrabold tracking-tighter mt-0.5 leading-none truncate max-w-[44px]">
                  {cs.titleText?.substring(0, 6) || 'Personal'}
                </span>

                <span className="absolute left-14 bg-[#2B1B2E] text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-white/10">
                  {cs.titleText}
                </span>
              </button>
            );
          })}

          {/* 4. Botón Menú Flotante "+ Secciones" */}
          <div className="relative mt-2">
            <button
              type="button"
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
              className={`w-12 h-11 rounded-2xl flex flex-col items-center justify-center transition group cursor-pointer border-2 ${
                isAddMenuOpen
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg'
                  : 'bg-[#2B1B2E] text-emerald-400 border-emerald-500/40 hover:bg-emerald-950'
              }`}
              title="Añadir / Gestionar Secciones"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[8px] font-black tracking-tighter mt-0.5 uppercase">+Sección</span>
            </button>

            {/* Menú Desplegable de Secciones */}
            {isAddMenuOpen && (
              <div className="absolute left-14 bottom-0 bg-[#1F1322] border-2 border-[#EFE2C9]/30 rounded-2xl p-2.5 shadow-2xl z-50 w-56 text-white space-y-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <span className="text-[10px] font-black uppercase text-[#FFC93C]">Gestionar Secciones</span>
                  <button 
                    type="button" 
                    onClick={() => setIsAddMenuOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  <span className="text-[9px] font-bold text-slate-400 block px-1">Secciones Opcionales:</span>
                  {optionalAppSections.map((sec) => {
                    const isVisible = visibility[sec.id] !== false;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => toggleSectionVisibility(sec.id)}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          isVisible
                            ? 'bg-teal-950 text-teal-300 border border-teal-800'
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <DomSectionIcon iconId={sec.iconId} className="w-3.5 h-3.5" />
                          <span>{sec.label}</span>
                        </div>
                        {isVisible ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Plus className="w-3.5 h-3.5 text-slate-500" />}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-white/10 pt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddMenuOpen(false);
                      handleTabClick('nueva_seccion');
                    }}
                    className="w-full py-2 bg-[#FF2E63] hover:bg-[#E02654] text-white font-black text-xs rounded-xl shadow transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Crear Sección Personalizada
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Dock Bar (< 768px) */}
      <nav 
        ref={mobileNavRef}
        onWheel={handleWheelScroll}
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1C121E]/95 backdrop-blur-md border-t border-[#6B5B6E]/40 px-2 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-2xl select-none"
      >
        <button
          type="button"
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className={`p-2.5 rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer ${
            isPanelOpen
              ? 'bg-[#FF2E63] text-white shadow-md'
              : 'bg-[#2B1B2E] text-amber-400 border border-amber-400/30'
          }`}
          title={isPanelOpen ? 'Cerrar Panel' : 'Abrir Panel'}
        >
          {isPanelOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
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
                  ? 'bg-[#FF2E63] text-white shadow-md'
                  : 'bg-[#2B1B2E] text-[#EFE2C9]/80 hover:bg-[#3D2740]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-[#FFC93C]" />
              <span>{tab.label}</span>
            </button>
          );
        })}

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
                  ? 'bg-[#00A8A0] text-white shadow-md'
                  : 'bg-[#2B1B2E] text-[#EFE2C9]/80 hover:bg-[#3D2740]'
              }`}
            >
              <DomSectionIcon iconId={sec.iconId} className="w-3.5 h-3.5" color={isActive ? '#ffffff' : '#FFC93C'} />
              <span>{sec.label}</span>
            </button>
          );
        })}

        {customSections.map((cs: any) => {
          const isActive = activeTab === cs.id && isPanelOpen;
          return (
            <button
              key={cs.id}
              type="button"
              onClick={() => handleTabClick(cs.id)}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1 text-[11px] font-black shrink-0 transition cursor-pointer ${
                isActive
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-[#2B1B2E] text-purple-300 hover:bg-[#3D2740]'
              }`}
            >
              <DomSectionIcon iconId="custom" className="w-3.5 h-3.5" color={isActive ? '#ffffff' : '#A855F7'} />
              <span>{cs.titleText}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => handleTabClick('nueva_seccion')}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-black shrink-0 flex items-center gap-1 shadow cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Nueva</span>
        </button>
      </nav>
    </>
  );
}
