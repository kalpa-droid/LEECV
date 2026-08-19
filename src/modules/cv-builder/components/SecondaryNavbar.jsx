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
  PanelLeftOpen,
  PanelLeftClose
} from 'lucide-react';

export const mainStyleTabs = [
  { id: 'diseno', label: '1. Diseño & Portada', icon: Layout },
  { id: 'paneles', label: '2. Paneles & Columnas', icon: Columns3 },
  { id: 'color', label: '3. Color & Tipografía', icon: Palette }
];

export const contentTabs = [
  { id: 'personales', label: 'Personales', icon: User },
  { id: 'formacion', label: 'Formación', icon: GraduationCap },
  { id: 'profesion', label: 'Profesión', icon: Briefcase },
  { id: 'experiencia', label: 'Experiencia', icon: FileText },
  { id: 'cursos', label: 'Cursos', icon: BookOpen },
  { id: 'informatica', label: 'Informática', icon: Laptop },
  { id: 'ecologia', label: 'Proyectos & Comunidad', icon: Leaf },
  { id: 'firma', label: 'Firma', icon: PenTool },
  { id: 'certificados', label: 'Certificados Anexados', icon: Award }
];

export default function SecondaryNavbar({ 
  activeTab, 
  setActiveTab, 
  isPanelOpen, 
  setIsPanelOpen 
}) {
  return (
    <nav className="w-full bg-[#2B1B2E] border-b border-[#EFE2C9]/20 text-white shadow-md z-30 no-print px-3 py-2 flex flex-col gap-2">
      
      {/* Row 1: Style & Layout Controls + Sidebar Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-1.5">
        <div className="flex items-center gap-2">
          {/* Toggle Sidebar Panel Button */}
          <button
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition flex-shrink-0 ${
              isPanelOpen
                ? 'bg-[#00A8A0] text-white shadow-sm'
                : 'bg-[#3D2740] hover:bg-[#4E3252] text-[#EFE2C9]'
            }`}
            title={isPanelOpen ? 'Ocultar panel lateral' : 'Mostrar panel lateral'}
          >
            {isPanelOpen ? (
              <>
                <PanelLeftClose className="w-3.5 h-3.5 text-white" />
                <span>Ocultar Editor</span>
              </>
            ) : (
              <>
                <PanelLeftOpen className="w-3.5 h-3.5 text-white" />
                <span>Abrir Editor</span>
              </>
            )}
          </button>

          <span className="text-[10px] uppercase font-black tracking-widest text-[#FFC93C] hidden sm:inline px-1">
            ESTILO & MAQUETACIÓN:
          </span>
        </div>

        {/* Style & Layout Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {mainStyleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id && isPanelOpen;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (!isPanelOpen) setIsPanelOpen(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black transition ${
                  isActive
                    ? 'bg-[#FF2E63] text-white shadow-md shadow-[#FF2E63]/40 ring-2 ring-white/30'
                    : 'bg-[#3D2740] text-[#EFE2C9] hover:text-white hover:bg-[#4E3252]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#FFC93C]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 2: Content Section Tabs */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 hidden md:inline pr-1">
          CONTENIDO:
        </span>
        {contentTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && isPanelOpen;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (!isPanelOpen) setIsPanelOpen(true);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold transition ${
                isActive
                  ? 'bg-[#00A8A0] text-white shadow-sm'
                  : 'text-[#EFE2C9]/80 hover:text-white hover:bg-[#3D2740]'
              }`}
            >
              <Icon className={`w-3 h-3 ${isActive ? 'text-white' : 'text-[#FFC93C]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

    </nav>
  );
}
