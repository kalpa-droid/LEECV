import React, { useState, useEffect, useRef } from 'react';
import { 
  FilePlus,
  FolderOpen,
  Save,
  Download,
  User,
  ChevronDown
} from 'lucide-react';
import { checkStorageStatus } from '../../../shared/core/lib/supabaseClient';

export default function Navbar({ 
  onPrint, 
  onStartNewCVWizard,
  onOpenSavedCVs,
  onSaveCV,
  onOpenCloudStatus,
  onOpenPricing,
  onNewCV,
  onOpenDownloadJson,
  onExportJson,
  isSaving
}) {
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const saveMenuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (saveMenuRef.current && !saveMenuRef.current.contains(e.target)) {
        setIsSaveMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownloadClick = () => {
    setIsSaveMenuOpen(false);
    if (onSaveCV) onSaveCV();
    if (onOpenDownloadJson) onOpenDownloadJson();
    else if (onExportJson) onExportJson();
  };

  const handleNewClick = () => {
    if (onSaveCV) onSaveCV();
    if (onNewCV) onNewCV();
    else if (onStartNewCVWizard) onStartNewCVWizard();
  };

  const handleOpenSavedClick = () => {
    if (onSaveCV) onSaveCV();
    if (onOpenSavedCVs) onOpenSavedCVs();
  };

  const handlePricingClick = () => {
    if (onSaveCV) onSaveCV();
    if (onOpenPricing) onOpenPricing();
  };

  return (
    <header className="sticky top-0 z-40 bg-[#2B1B2E] border-b border-[#EFE2C9]/30 text-white shadow-xl no-print select-none">
      {/* Festive Bunting Accent Strip */}
      <div className="h-1 w-full bg-gradient-to-r from-[#FF2E63] via-[#FFC93C] via-[#00A8A0] via-[#8E44FF] to-[#FF7A29]" />
      
      <div className="max-w-7xl mx-auto px-2 sm:px-4 h-12 sm:h-14 flex items-center justify-between gap-1.5">
        
        {/* Left: Brand & Logo */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#FF2E63] flex items-center justify-center font-black text-xs shadow-md text-white border border-[#FFD9E3]/20">
            LEE
          </div>
          <h1 className="font-black text-sm sm:text-base tracking-wider text-white">
            LEECV
          </h1>
        </div>

        {/* Middle: 4 Essential Single-Line Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* 1. NUEVO */}
          <button
            onClick={handleNewClick}
            className="flex items-center gap-1 px-2 sm:px-3 py-1 rounded-xl text-xs font-black text-white bg-[#FF2E63] hover:bg-[#E31555] border border-[#FFD9E3]/30 transition shadow-md shadow-[#FF2E63]/20 cursor-pointer whitespace-nowrap"
            title="Iniciar un nuevo CV"
          >
            <FilePlus className="w-3.5 h-3.5 text-[#FFD9E3] flex-shrink-0" />
            <span>Nuevo</span>
          </button>

          {/* 2. ABRIR (Abre ventana con historial de CVs y botón Cargar JSON) */}
          <button
            onClick={handleOpenSavedClick}
            className="flex items-center gap-1 px-2 sm:px-3 py-1 rounded-xl text-xs font-black text-[#CFF3F0] bg-[#00A8A0] hover:bg-[#00877F] border border-[#00A8A0]/40 transition shadow-md shadow-[#00A8A0]/20 cursor-pointer whitespace-nowrap"
            title="Abrir CVs guardados o cargar un archivo .JSON de respaldo"
          >
            <FolderOpen className="w-3.5 h-3.5 text-white flex-shrink-0" />
            <span>Abrir</span>
          </button>

          {/* 3. GUARDAR (Boton con Dropdown para Guardar Nube/Local o Descargar JSON) */}
          <div className="relative" ref={saveMenuRef}>
            <button
              onClick={() => {
                if (onSaveCV) onSaveCV();
                setIsSaveMenuOpen(!isSaveMenuOpen);
              }}
              disabled={isSaving}
              className="flex items-center gap-1 px-2 sm:px-3 py-1 rounded-xl text-xs font-black text-[#E9DBFF] bg-[#8E44FF] hover:bg-[#7126E0] border border-[#8E44FF]/40 transition disabled:opacity-50 shadow-md shadow-[#8E44FF]/20 cursor-pointer whitespace-nowrap"
              title="Guardar CV y ver opciones de exportación JSON"
            >
              <Save className="w-3.5 h-3.5 text-white flex-shrink-0" />
              <span>{isSaving ? '...' : 'Guardar'}</span>
              <ChevronDown className="w-3 h-3 text-[#E9DBFF]/80" />
            </button>

            {/* Save Options Dropdown */}
            {isSaveMenuOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-[#1C121E] border border-white/20 rounded-2xl shadow-2xl z-50 p-1.5 space-y-1 text-xs font-bold animate-fade-in">
                <button
                  onClick={() => {
                    if (onSaveCV) onSaveCV();
                    setIsSaveMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 flex items-center gap-2 transition"
                >
                  <Save className="w-4 h-4 text-purple-400" />
                  <div>
                    <p className="font-extrabold text-white">Guardar en Nube / Local</p>
                    <p className="text-[10px] text-purple-300">Almacenamiento directo seguro</p>
                  </div>
                </button>

                <button
                  onClick={handleDownloadClick}
                  className="w-full text-left px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 flex items-center gap-2 transition"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <div>
                    <p className="font-extrabold text-white">Descargar Copia (.JSON)</p>
                    <p className="text-[10px] text-slate-400">Respaldo portátil en tu equipo</p>
                  </div>
                </button>

                {onOpenCloudStatus && (
                  <button
                    onClick={() => {
                      setIsSaveMenuOpen(false);
                      onOpenCloudStatus();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl bg-teal-950/60 hover:bg-teal-900/80 text-teal-200 flex items-center gap-2 transition"
                  >
                    <Save className="w-4 h-4 text-teal-400" />
                    <div>
                      <p className="font-extrabold text-white">Google Drive / Nube</p>
                      <p className="text-[10px] text-teal-300">Estado de respaldo y cuota</p>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 4. PDF (Exportar PDF con icono de Descargar en Amarillo Sol) */}
          <button
            onClick={onPrint}
            className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1 rounded-xl bg-[#FFC93C] hover:bg-[#F0AE00] text-[#2B1B2E] font-black text-xs shadow-lg shadow-[#FFC93C]/30 transition transform active:scale-95 border border-[#F0AE00] cursor-pointer whitespace-nowrap"
            title="Descargar documento PDF listo para imprimir o enviar"
          >
            <Download className="w-3.5 h-3.5 flex-shrink-0 text-[#2B1B2E]" />
            <span>PDF</span>
          </button>
        </div>

        {/* Right: User Avatar Circle (Acceso a Cuenta / Suscripción) */}
        <button
          onClick={handlePricingClick}
          className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF7A29] to-[#FFC93C] text-[#2B1B2E] flex items-center justify-center font-black text-xs shadow-md border-2 border-white/40 hover:scale-105 transition cursor-pointer flex-shrink-0"
          title="Mi Cuenta de Usuario / Suscripción Premium"
        >
          <User className="w-4 h-4 stroke-[2.5]" />
        </button>

      </div>
    </header>
  );
}
