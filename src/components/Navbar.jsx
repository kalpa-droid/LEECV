import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Eye, 
  FilePlus,
  FolderOpen,
  Save,
  Cloud,
  Download,
  Upload
} from 'lucide-react';
import { checkStorageStatus } from '../services/cvStorageService';

export default function Navbar({ 
  onPrint, 
  onLoadExampleCV, 
  onStartNewCVWizard,
  onOpenSavedCVs,
  onSaveCV,
  onOpenCloudModal,
  onExportJson,
  onImportJson,
  isSaving
}) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const storageStatus = checkStorageStatus();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  let cloudColor = 'green';
  let statusTitle = '🟢 Sincronizado en la Nube Supabase';
  if (!isOnline) {
    cloudColor = 'red';
    statusTitle = '🔴 Sin Conexión a Internet (Modo Offline IndexedDB)';
  } else if (!storageStatus.isCloud) {
    cloudColor = 'yellow';
    statusTitle = '🟡 Guardado Localmente en IndexedDB';
  }

  const handleCloudIconClick = () => {
    onSaveCV();
    if (onOpenCloudModal) onOpenCloudModal();
  };

  return (
    <header className="sticky top-0 z-40 bg-[#2B1B2E] border-b border-[#EFE2C9]/30 text-white shadow-xl no-print">
      {/* Festive Bunting Accent Strip */}
      <div className="h-1 w-full bg-gradient-to-r from-[#FF2E63] via-[#FFC93C] via-[#00A8A0] via-[#8E44FF] to-[#FF7A29]" />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand & Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#FF2E63] flex items-center justify-center font-black text-xs sm:text-base shadow-lg shadow-[#FF2E63]/30 text-white border border-[#FFD9E3]/20">
            LEE
          </div>
          <div className="flex items-center gap-2">
            <h1 className="font-black text-base sm:text-lg tracking-wider text-white">
              LEECV
            </h1>
            
            {/* Interactive 3-State Cloud Indicator */}
            <button
              onClick={handleCloudIconClick}
              className={`p-1.5 sm:p-2 rounded-xl border transition transform active:scale-95 cursor-pointer shadow-md flex items-center justify-center ${
                cloudColor === 'green'
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400 hover:bg-emerald-900/90 shadow-emerald-500/20'
                  : cloudColor === 'yellow'
                  ? 'bg-amber-950/80 border-amber-500/60 text-amber-400 hover:bg-amber-900/90 shadow-amber-500/20'
                  : 'bg-red-950/80 border-red-500/60 text-red-400 hover:bg-red-900/90 shadow-red-500/20'
              }`}
              title={statusTitle}
            >
              <Cloud className={`w-4 h-4 sm:w-5 sm:h-5 ${
                cloudColor === 'green'
                  ? 'text-emerald-400'
                  : cloudColor === 'yellow'
                  ? 'text-amber-400'
                  : 'text-red-500 animate-pulse'
              }`} />
            </button>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shadow-sm">
          {/* VER CV DE EJEMPLO */}
          <button
            onClick={onLoadExampleCV}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-extrabold text-[#FFE0C7] bg-[#FF7A29]/20 hover:bg-[#FF7A29]/30 border border-[#FF7A29]/40 transition"
            title="Cargar currículum de ejemplo"
          >
            <Eye className="w-3.5 h-3.5 text-[#FF7A29] flex-shrink-0" />
            <span>Ejemplo</span>
          </button>

          {/* NUEVO CV */}
          <button
            onClick={onStartNewCVWizard}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-extrabold text-white bg-[#FF2E63] hover:bg-[#E31555] border border-[#FFD9E3]/30 transition shadow-md shadow-[#FF2E63]/20"
            title="Iniciar un nuevo CV"
          >
            <FilePlus className="w-3.5 h-3.5 text-[#FFD9E3] flex-shrink-0" />
            <span>Nuevo</span>
          </button>

          {/* ABRIR CVS GUARDADOS */}
          <button
            onClick={onOpenSavedCVs}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-extrabold text-[#CFF3F0] bg-[#00A8A0] hover:bg-[#00877F] border border-[#00A8A0]/40 transition shadow-md shadow-[#00A8A0]/20"
            title="Abrir lista de CVs guardados"
          >
            <FolderOpen className="w-3.5 h-3.5 text-white flex-shrink-0" />
            <span>Abrir</span>
          </button>

          {/* GUARDAR CV */}
          <button
            onClick={onSaveCV}
            disabled={isSaving}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-extrabold text-[#E9DBFF] bg-[#8E44FF] hover:bg-[#7126E0] border border-[#8E44FF]/40 transition disabled:opacity-50 shadow-md shadow-[#8E44FF]/20"
            title="Guardar CV optimizado en IndexedDB"
          >
            <Save className="w-3.5 h-3.5 text-white flex-shrink-0" />
            <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
          </button>

          {/* EXPORTAR JSON v2 */}
          {onExportJson && (
            <button
              onClick={onExportJson}
              className="flex items-center gap-1 px-2.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-extrabold text-white bg-slate-700 hover:bg-slate-800 border border-slate-600 transition shadow-sm"
              title="Exportar archivo JSON portátil (v2)"
            >
              <Download className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="hidden md:inline">JSON</span>
            </button>
          )}

          {/* IMPRIMIR / DESCARGAR PDF */}
          <button
            onClick={onPrint}
            className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-[#FFC93C] hover:bg-[#F0AE00] text-[#2B1B2E] font-black text-xs shadow-lg shadow-[#FFC93C]/30 transition transform active:scale-95 ml-1 border border-[#F0AE00]"
            title="Descargar PDF A4 Ultra HD"
          >
            <Printer className="w-3.5 h-3.5 flex-shrink-0 text-[#2B1B2E]" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>
    </header>
  );
}
