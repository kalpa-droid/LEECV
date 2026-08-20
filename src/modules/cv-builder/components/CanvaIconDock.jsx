import React from 'react';
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
  X,
  Eye,
  EyeOff
} from 'lucide-react';

export const styleTabs = [
  { id: 'diseno', label: 'Diseño', icon: Layout },
  { id: 'paneles', label: 'Paneles', icon: Columns3 },
  { id: 'color', label: 'Color', icon: Palette }
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
  const handleTabClick = (tabId) => {
    if (activeTab === tabId && isPanelOpen) {
      setIsPanelOpen(false);
    } else {
      setActiveTab(tabId);
      setIsPanelOpen(true);
    }
  };

  return (
    <>
      {/* Desktop & Tablet Vertical Left Dock (Width: 68px) */}
      <aside className="hidden md:flex flex-col items-center py-3 bg-[#1C121E] border-r border-[#6B5B6E]/30 text-white z-30 select-none w-16 shrink-0 h-full overflow-y-auto no-scrollbar">
        {/* Toggle Drawer Button */}
        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className={`p-2.5 rounded-2xl mb-3 transition transform active:scale-95 ${
            isPanelOpen
              ? 'bg-[#FF2E63] text-white shadow-lg shadow-[#FF2E63]/30'
              : 'bg-[#2B1B2E] text-slate-400 hover:text-white hover:bg-[#3D2740]'
          }`}
          title={isPanelOpen ? 'Cerrar Panel Editor' : 'Abrir Panel Editor'}
        >
          {isPanelOpen ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition group relative ${
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
                className={`w-12 h-11 rounded-2xl flex flex-col items-center justify-center transition group relative ${
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

      {/* Mobile Bottom Dock Bar (< 768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1C121E]/95 backdrop-blur-md border-t border-[#6B5B6E]/40 px-2 py-1.5 flex items-center justify-between overflow-x-auto no-scrollbar shadow-2xl">
        <div className="flex items-center gap-1.5 min-w-max mx-auto">
          {/* Main Toggle */}
          <button
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className={`p-2 rounded-xl transition flex items-center gap-1 ${
              isPanelOpen
                ? 'bg-[#FF2E63] text-white shadow-md'
                : 'bg-[#2B1B2E] text-amber-400 border border-amber-400/30'
            }`}
          >
            {isPanelOpen ? <X className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="text-[10px] font-black">{isPanelOpen ? 'Cerrar' : 'Ver Form'}</span>
          </button>

          <div className="w-px h-6 bg-white/20" />

          {styleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id && isPanelOpen;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1 text-[11px] font-black transition ${
                  isActive
                    ? 'bg-[#FF2E63] text-white shadow-md'
                    : 'bg-[#2B1B2E] text-[#EFE2C9]/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-[#FFC93C]" />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <div className="w-px h-6 bg-white/20" />

          {contentTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id && isPanelOpen;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1 text-[11px] font-black transition ${
                  isActive
                    ? 'bg-[#00A8A0] text-white shadow-md'
                    : 'bg-[#2B1B2E] text-[#EFE2C9]/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-[#FFC93C]" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
