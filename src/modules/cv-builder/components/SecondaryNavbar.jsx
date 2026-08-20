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
  PanelLeftClose,
  ZoomIn,
  ZoomOut,
  Smartphone
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
  setIsPanelOpen,
  zoomLevel = 0.85,
  setZoomLevel,
  onTriggerAutoFit
}) {
  return (
    <nav className="w-full bg-[#2B1B2E] border-b border-[#EFE2C9]/20 text-white shadow-md z-30 no-print px-2.5 py-1.5 flex flex-col gap-1.5">
      
      {/* Row 1: Style & Layout Controls + Sidebar Toggle + Integrated Zoom Controls */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-white/10 pb-1">
        <div className="flex items-center gap-1.5">
          {/* Toggle Sidebar Panel Button */}
          <button
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black transition flex-shrink-0 ${
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

          <span className="text-[10px] uppercase font-black tracking-widest text-[#FFC93C] hidden sm:inline px-0.5">
            ESTILO & MAQUETACIÓN:
          </span>
        </div>

        {/* Style & Layout Tabs + Integrated Zoom Toolbar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 flex-wrap">
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
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black transition whitespace-nowrap ${
                    isActive
                      ? 'bg-[#FF2E63] text-white shadow-md shadow-[#FF2E63]/40 ring-1 ring-white/30'
                      : 'bg-[#3D2740] text-[#EFE2C9] hover:text-white hover:bg-[#4E3252]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#FFC93C]'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-white/20 hidden md:block" />

          {/* Integrated Zoom & Auto-Fit Controls (- Zoom + Encajar) */}
          <div className="flex items-center gap-0.5 bg-[#3D2740] p-0.5 rounded-xl border border-white/10 text-xs font-black">
            <button
              onClick={() => setZoomLevel && setZoomLevel(prev => Math.max(0.3, parseFloat((prev - 0.1).toFixed(2))))}
              className="p-1 rounded-lg hover:bg-[#FF2E63] text-white transition cursor-pointer"
              title="Alejar (-10%)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <span className="px-1 text-[#FFC93C] text-[11px] min-w-9 text-center font-black">
              {Math.round(zoomLevel * 100)}%
            </span>

            <button
              onClick={() => setZoomLevel && setZoomLevel(prev => Math.min(2.0, parseFloat((prev + 0.1).toFixed(2))))}
              className="p-1 rounded-lg hover:bg-[#FF2E63] text-white transition cursor-pointer"
              title="Acercar (+10%)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onTriggerAutoFit}
              className="px-2 py-0.5 rounded-lg bg-[#00A8A0] hover:bg-[#00877F] text-white text-[10px] font-black transition flex items-center gap-1 shadow-sm cursor-pointer ml-0.5"
              title="Auto-encajar el diseño A4 al tamaño de pantalla"
            >
              <Smartphone className="w-3 h-3" />
              <span>Encajar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Content Section Tabs (Horizontal Touch Scroll on Mobile) */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-full">
        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 hidden md:inline pr-1 whitespace-nowrap">
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
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition whitespace-nowrap flex-shrink-0 ${
                isActive
                  ? 'bg-[#00A8A0] text-white shadow-sm'
                  : 'text-[#EFE2C9]/90 bg-[#3D2740]/60 hover:text-white hover:bg-[#3D2740]'
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
