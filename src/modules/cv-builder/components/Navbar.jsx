import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  LogIn, 
  FilePlus,
  FolderOpen,
  Save,
  Cloud,
  Download,
  Upload
} from 'lucide-react';
import { checkStorageStatus } from '../../../shared/core/lib/supabaseClient';

export default function Navbar({ 
  onPrint, 
  onLoadExampleCV, 
  onStartNewCVWizard,
  onOpenSavedCVs,
  onSaveCV,
  onOpenCloudModal,
  onOpenCloudStatus,
  onOpenPricing,
  onNewCV,
  onOpenDownloadJson,
  onExportJson,
  onImportJson,
  isSaving
}) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const storageStatus = checkStorageStatus();
  const fileInputRef = useRef(null);

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
    if (onSaveCV) onSaveCV();
    if (onOpenCloudStatus) onOpenCloudStatus();
    else if (onOpenCloudModal) onOpenCloudModal();
  };

  const handleDownloadClick = () => {
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
    else if (onOpenCloudStatus) onOpenCloudStatus();
    else if (onOpenCloudModal) onOpenCloudModal();
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
        <div className="flex items-center gap-1 sm:gap-2 shadow-sm flex-wrap sm:flex-nowrap">
          {/* ENTRAR (LOGIN / ACCESO DE USUARIOS / SUSCRIPCION) */}
          <button
            onClick={handlePricingClick}
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold text-[#FFE0C7] bg-[#FF7A29]/20 hover:bg-[#FF7A29]/30 border border-[#FF7A29]/40 transition cursor-pointer"
            title="Ingresar a tu cuenta de usuario o suscripción Premium"
          >
            <LogIn className="w-3.5 h-3.5 text-[#FF7A29] flex-shrink-0" />
            <span className="hidden sm:inline">Entrar</span>
          </button>

          {/* NUEVO CV */}
          <button
            onClick={handleNewClick}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold text-white bg-[#FF2E63] hover:bg-[#E31555] border border-[#FFD9E3]/30 transition shadow-md shadow-[#FF2E63]/20 cursor-pointer"
            title="Iniciar un nuevo CV"
          >
            <FilePlus className="w-3.5 h-3.5 text-[#FFD9E3] flex-shrink-0" />
            <span>Nuevo</span>
          </button>

          {/* ABRIR CVS GUARDADOS */}
          <button
            onClick={handleOpenSavedClick}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold text-[#CFF3F0] bg-[#00A8A0] hover:bg-[#00877F] border border-[#00A8A0]/40 transition shadow-md shadow-[#00A8A0]/20 cursor-pointer"
            title="Abrir lista de CVs guardados"
          >
            <FolderOpen className="w-3.5 h-3.5 text-white flex-shrink-0" />
            <span>Abrir</span>
          </button>

          {/* GUARDAR CV */}
          <button
            onClick={onSaveCV}
            disabled={isSaving}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold text-[#E9DBFF] bg-[#8E44FF] hover:bg-[#7126E0] border border-[#8E44FF]/40 transition disabled:opacity-50 shadow-md shadow-[#8E44FF]/20 cursor-pointer"
            title="Guardar CV optimizado en IndexedDB"
          >
            <Save className="w-3.5 h-3.5 text-white flex-shrink-0" />
            <span>{isSaving ? '...' : 'Guardar'}</span>
          </button>

          {/* DESCARGAR ARCHIVO DE RESPALDO JSON */}
          <button
            onClick={handleDownloadClick}
            className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-extrabold text-white bg-slate-700 hover:bg-slate-800 border border-slate-600 transition shadow-sm cursor-pointer"
            title="Descargar copia de respaldo en tu equipo"
          >
            <Download className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>Descargar</span>
          </button>

          {/* CARGAR ARCHIVO .JSON */}
          {onImportJson && (
            <>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={onImportJson} 
                accept=".json" 
                className="hidden" 
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="hidden xl:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-extrabold text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 transition shadow-sm cursor-pointer"
                title="Cargar un archivo .JSON de respaldo"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>Cargar .JSON</span>
              </button>
            </>
          )}

          {/* EXPORTAR PDF */}
          <button
            onClick={onPrint}
            className="flex items-center gap-1 px-3 sm:px-4 py-1.5 rounded-xl bg-[#FFC93C] hover:bg-[#F0AE00] text-[#2B1B2E] font-black text-xs shadow-lg shadow-[#FFC93C]/30 transition transform active:scale-95 border border-[#F0AE00] cursor-pointer"
            title="Generar y descargar documento PDF listo para imprimir o enviar"
          >
            <Printer className="w-3.5 h-3.5 flex-shrink-0 text-[#2B1B2E]" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>
    </header>
  );
}
