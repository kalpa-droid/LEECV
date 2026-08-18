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
  FolderOpen,
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
  { id: 'diseno', label: 'Diseño & Colores', icon: Palette }
];

export default function SecondaryNavbar({ 
  activeTab, 
  setActiveTab, 
  isPanelOpen, 
  setIsPanelOpen 
}) {
  return (
    <nav className="w-full bg-slate-800 border-b border-slate-700/80 text-white shadow-md z-30 no-print px-3 py-1.5 flex flex-wrap items-center justify-between gap-1.5">
      {/* Toggle Sidebar Panel Button */}
      <button
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black transition flex-shrink-0 ${
          isPanelOpen
            ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
        }`}
        title={isPanelOpen ? 'Ocultar panel lateral' : 'Mostrar panel lateral'}
      >
        {isPanelOpen ? (
          <>
            <PanelLeftClose className="w-3.5 h-3.5 text-purple-400" />
            <span>Panel</span>
          </>
        ) : (
          <>
            <PanelLeftOpen className="w-3.5 h-3.5 text-purple-400" />
            <span>Abrir Panel</span>
          </>
        )}
      </button>

      <div className="h-4 w-px bg-slate-700 hidden sm:block" />

      {/* 10 Section Tabs Row - Fully Visible Wrap */}
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
                  ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-md shadow-purple-600/20 ring-1 ring-purple-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/70'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-purple-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
