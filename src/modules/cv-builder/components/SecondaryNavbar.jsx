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
  PanelLeftOpen,
  PanelLeftClose
} from 'lucide-react';

export const editorTabs = [
  { id: 'personales', label: 'Personales', icon: User },
  { id: 'formacion', label: 'Formación', icon: GraduationCap },
  { id: 'profesion', label: 'Profesión', icon: Briefcase },
  { id: 'experiencia', label: 'Experiencia', icon: FileText },
  { id: 'cursos', label: 'Cursos', icon: BookOpen },
  { id: 'informatica', label: 'Informática', icon: Laptop },
  { id: 'ecologia', label: 'Proyectos & Comunidad', icon: Leaf },
  { id: 'firma', label: 'Firma', icon: PenTool },
  { id: 'certificados', label: 'Certificados Anexados', icon: Award },
  { id: 'diseno', label: 'Diseño & Portada', icon: Layout },
  { id: 'color', label: 'Color & Tipografía', icon: Palette }
];

export default function SecondaryNavbar({ 
  activeTab, 
  setActiveTab, 
  isPanelOpen, 
  setIsPanelOpen 
}) {
  return (
    <nav className="w-full bg-[#2B1B2E] border-b border-[#EFE2C9]/20 text-white shadow-md z-30 no-print px-3 py-1.5 flex flex-wrap items-center justify-between gap-1.5">
      {/* Toggle Sidebar Panel Button */}
      <button
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black transition flex-shrink-0 ${
          isPanelOpen
            ? 'bg-[#00A8A0]/30 text-[#CFF3F0] border border-[#00A8A0]/50'
            : 'bg-[#3D2740] hover:bg-[#4E3252] text-[#EFE2C9]'
        }`}
        title={isPanelOpen ? 'Ocultar panel lateral' : 'Mostrar panel lateral'}
      >
        {isPanelOpen ? (
          <>
            <PanelLeftClose className="w-3.5 h-3.5 text-[#00A8A0]" />
            <span>Panel</span>
          </>
        ) : (
          <>
            <PanelLeftOpen className="w-3.5 h-3.5 text-[#00A8A0]" />
            <span>Abrir Panel</span>
          </>
        )}
      </button>

      <div className="h-4 w-px bg-[#EFE2C9]/20 hidden sm:block" />

      {/* Section Tabs Row */}
      <div className="flex flex-wrap items-center gap-1 flex-1">
        {editorTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && isPanelOpen;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (!isPanelOpen) setIsPanelOpen(true);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition ${
                isActive
                  ? 'bg-[#FF2E63] text-white shadow-md shadow-[#FF2E63]/30 border border-[#FFD9E3]/30'
                  : 'text-[#EFE2C9]/80 hover:text-white hover:bg-[#3D2740]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#FFC93C]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
