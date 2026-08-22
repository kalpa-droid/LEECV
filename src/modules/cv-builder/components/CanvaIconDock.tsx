import React, { useRef } from 'react';
import { 
  User, 
  GraduationCap, 
  Briefcase, 
  BookOpen, 
  Award, 
  Laptop, 
  Leaf, 
  FileText, 
  PenTool, 
  Palette,
  Layout,
  Columns3,
  BookMarked,
  X,
  Menu,
  Users
} from 'lucide-react';

export const styleTabs = [
  { id: 'diseno', label: 'Diseño', icon: Layout },
  { id: 'paneles', label: 'Paneles', icon: Columns3 },
  { id: 'color', label: 'Color', icon: Palette },
  { id: 'candidatos', label: 'Candidatos', icon: Users }
];

export const contentTabs = [
  { id: 'personales', label: 'Personales', icon: User },
  { id: 'formacion', label: 'Formación', icon: GraduationCap },
  { id: 'profesion', label: 'Profesión', icon: Briefcase },
  { id: 'experiencia', label: 'Experiencia', icon: FileText },
  { id: 'cursos', label: 'Cursos', icon: BookOpen },
  { id: 'informatica', label: 'Informática', icon: Laptop },
  { id: 'ecologia', label: 'Proyectos', icon: Leaf },
  { id: 'firma', label: 'Firma', icon: PenTool },
  { id: 'certificados', label: 'Certificados', icon: Award }
];

export default function CanvaIconDock({ 
  activeTab, 
  setActiveTab, 
  isPanelOpen, 
  setIsPanelOpen 
}) {
  const mobileNavRef = useRef(null);

  const handleTabClick = (tabId) => {
    if (activeTab === tabId && isPanelOpen) {
      setIsPanelOpen(false);
    } else {
      setActiveTab(tabId);
      setIsPanelOpen(true);
    }
  };

  // Converts vertical mouse wheel scroll into smooth horizontal scrolling for mobile tab bar
  const handleWheelScroll = (e) => {
    if (mobileNavRef.current) {
      mobileNavRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <>
      {/* Desktop & Tablet Vertical Left Dock (Width: 68px) */}
      <aside className="hidden md:flex flex-col items-center py-3 bg-[#1C121E] border-r border-[#6B5B6E]/30 text-white z-30 select-none w-16 shrink-0 h-full overflow-y-auto no-scrollbar">
        {/* Toggle Drawer Button (☰ ↔ ✕) */}
        <button
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
                
                {/* Tooltip on Hover */}
                <span className="absolute left-14 bg-[#2B1B2E] text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-white/10">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="w-8 h-px bg-white/10 mb-3" />

        {/* Content Sections Group */}
        <div className="flex flex-col items-center gap-1.5 flex-1">
          {contentTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id && isPanelOpen;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`w-12 h-11 rounded-2xl flex flex-col items-center justify-center transition group relative cursor-pointer ${
                  isActive
                    ? 'bg-[#00A8A0] text-white shadow-lg shadow-[#00A8A0]/30 scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-[#2B1B2E]'
                }`}
                title={tab.label}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#FFC93C]'}`} />
                <span className="text-[9px] font-extrabold tracking-tighter mt-0.5 leading-none">{tab.label}</span>

                {/* Tooltip on Hover */}
                <span className="absolute left-14 bg-[#2B1B2E] text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-white/10">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Mobile Bottom Dock Bar (< 768px) with Mouse Wheel Translation */}
      <nav 
        ref={mobileNavRef}
        onWheel={handleWheelScroll}
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1C121E]/95 backdrop-blur-md border-t border-[#6B5B6E]/40 px-2 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-2xl select-none"
      >
        {/* Main Universal Toggle Button (☰ ↔ ✕) */}
        <button
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

        {contentTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && isPanelOpen;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1 text-[11px] font-black shrink-0 transition cursor-pointer ${
                isActive
                  ? 'bg-[#00A8A0] text-white shadow-md'
                  : 'bg-[#2B1B2E] text-[#EFE2C9]/80 hover:bg-[#3D2740]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-[#FFC93C]" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
