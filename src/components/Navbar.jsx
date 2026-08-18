import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Eye, 
  FilePlus,
  FolderOpen,
  Save,
  Cloud
} from 'lucide-react';
import { checkStorageStatus } from '../services/cvStorageService';

export default function Navbar({ 
  onPrint, 
  onLoadExampleCV, 
  onStartNewCVWizard,
  onOpenSavedCVs,
  onSaveCV,
  onOpenCloudModal,
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

  let cloudColor = 'yellow'; // default local
  let statusText = 'Guardado Local';
  if (!isOnline) {
    cloudColor = 'red';
    statusText = 'Sin Internet';
  } else if (storageStatus.isCloud) {
    cloudColor = 'green';
    statusText = 'Nube Supabase';
  }

  const handleCloudIconClick = () => {
    onSaveCV();
    if (onOpenCloudModal) onOpenCloudModal();
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-white shadow-xl no-print">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand & Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center font-black text-sm sm:text-xl shadow-lg shadow-purple-500/20">
            CV
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm sm:text-base tracking-wide text-white">
                CVPREMIUM
              </h1>
              
              {/* Interactive 3-Color Cloud Icon Button */}
              <button
                onClick={handleCloudIconClick}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black transition transform active:scale-95 cursor-pointer shadow-sm ${
                  cloudColor === 'green'
                    ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/90 shadow-emerald-500/20'
                    : cloudColor === 'yellow'
                    ? 'bg-amber-950/80 border-amber-500/60 text-amber-300 hover:bg-amber-900/90 shadow-amber-500/20'
                    : 'bg-red-950/80 border-red-500/60 text-red-300 hover:bg-red-900/90 shadow-red-500/20'
                }`}
                title="Haga clic para ver el estado de la nube y guardar cambios"
              >
                <Cloud className={`w-3.5 h-3.5 ${
                  cloudColor === 'green' ? 'text-emerald-400' : cloudColor === 'yellow' ? 'text-amber-400' : 'text-red-500 animate-bounce'
                }`} />
                <span className="hidden sm:inline">{statusText}</span>
              </button>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">Plataforma Profesional de CV A4</p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shadow-sm">
          {/* VER CV DE EJEMPLO */}
          <button
            onClick={onLoadExampleCV}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-extrabold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            title="Cargar currículum de ejemplo"
          >
            <Eye className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            <span>Ejemplo</span>
          </button>

          {/* NUEVO CV */}
          <button
            onClick={onStartNewCVWizard}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-extrabold text-white bg-purple-600/90 hover:bg-purple-600 border border-purple-500/40 transition shadow-md shadow-purple-600/20"
            title="Iniciar un nuevo CV"
          >
            <FilePlus className="w-3.5 h-3.5 text-pink-300 flex-shrink-0" />
            <span>Nuevo</span>
          </button>

          {/* ABRIR CVS GUARDADOS */}
          <button
            onClick={onOpenSavedCVs}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-extrabold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/60 transition"
            title="Abrir lista de CVs guardados"
          >
            <FolderOpen className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>Abrir</span>
          </button>

          {/* GUARDAR CV */}
          <button
            onClick={onSaveCV}
            disabled={isSaving}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-extrabold text-purple-200 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 transition disabled:opacity-50"
            title="Guardar CV optimizado en WebP"
          >
            <Save className="w-3.5 h-3.5 text-purple-300 flex-shrink-0" />
            <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
          </button>

          {/* IMPRIMIR */}
          <button
            onClick={onPrint}
            className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 transition transform active:scale-95 ml-1"
            title="Descargar PDF A4 1:1"
          >
            <Printer className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>
    </header>
  );
}
