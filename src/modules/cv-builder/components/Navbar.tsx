import React from 'react';
import { 
  FilePlus,
  FolderOpen,
  Save,
  Download,
  User
} from 'lucide-react';

export default function Navbar({ 
  onPrint, 
  onStartNewCVWizard,
  onOpenSavedCVs,
  onSaveCV,
  onOpenSaveModal,
  onOpenPricing,
  onNewCV,
  isSaving
}: {
  onPrint?: any;
  onStartNewCVWizard?: any;
  onOpenSavedCVs?: any;
  onSaveCV?: any;
  onOpenSaveModal?: any;
  onOpenPricing?: any;
  onNewCV?: any;
  onOpenDownloadJson?: any;
  onImportJson?: any;
  onExportJson?: any;
  isSaving?: boolean;
}) {
  const handleNewClick = () => {
    if (onSaveCV) onSaveCV();
    if (onNewCV) onNewCV();
    else if (onStartNewCVWizard) onStartNewCVWizard();
  };

  const handleOpenSavedClick = () => {
    if (onSaveCV) onSaveCV();
    if (onOpenSavedCVs) onOpenSavedCVs();
  };

  const handleSaveClick = () => {
    if (onOpenSaveModal) {
      onOpenSaveModal();
    } else if (onSaveCV) {
      onSaveCV();
    }
  };

  const handlePricingClick = () => {
    if (onSaveCV) onSaveCV();
    if (onOpenPricing) onOpenPricing();
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-neutral-text-primary)] border-b border-[var(--color-neutral-border)]/30 text-white shadow-xl no-print select-none">
      {/* Festive Bunting Accent Strip */}
      <div className="h-1 w-full bg-gradient-to-r from-[var(--color-accent-base)] via-[#FFC93C] via-[var(--color-secondary-base)] via-[#8E44FF] to-[#FF7A29]" />
      
      <div className="max-w-7xl mx-auto px-2 sm:px-4 h-12 sm:h-14 flex items-center justify-between gap-1.5">
        
        {/* Left: Brand & Logo */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[var(--color-accent-base)] flex items-center justify-center font-black text-xs shadow-md text-white border border-[#FFD9E3]/20">
            LEE
          </div>
          <h1 className="font-black text-sm sm:text-base tracking-wider text-white">
            LEECV
          </h1>
        </div>

        {/* Middle: 4 Essential Single-Line Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 1. NUEVO (Abre confirmación para iniciar nuevo CV) */}
          <button
            onClick={handleNewClick}
            className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-black text-white bg-[var(--color-accent-base)] hover:bg-[#E31555] border border-[#FFD9E3]/30 transition shadow-md shadow-[var(--color-accent-base)]/20 cursor-pointer whitespace-nowrap active:scale-95"
            title="Iniciar un nuevo currículum en blanco"
          >
            <FilePlus className="w-3.5 h-3.5 text-[#FFD9E3] flex-shrink-0" />
            <span>Nuevo</span>
          </button>

          {/* 2. ABRIR (Abre ventana modal con borradores, Cargar JSON y Google Drive) */}
          <button
            onClick={handleOpenSavedClick}
            className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-black text-[var(--color-secondary-muted)] bg-[var(--color-secondary-base)] hover:bg-[var(--color-secondary-hover)] border border-[var(--color-secondary-base)]/40 transition shadow-md shadow-[var(--color-secondary-base)]/20 cursor-pointer whitespace-nowrap active:scale-95"
            title="Abrir borradores guardados, importar JSON o sincronizar nube"
          >
            <FolderOpen className="w-3.5 h-3.5 text-white flex-shrink-0" />
            <span>Abrir</span>
          </button>

          {/* 3. GUARDAR (Abre ventana modal con opciones directas de guardado local y exportación JSON) */}
          <button
            onClick={handleSaveClick}
            disabled={isSaving}
            className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-black text-[#E9DBFF] bg-[#8E44FF] hover:bg-[#7126E0] border border-[#8E44FF]/40 transition disabled:opacity-50 shadow-md shadow-[#8E44FF]/20 cursor-pointer whitespace-nowrap active:scale-95"
            title="Guardar currículum o descargar copia JSON de respaldo"
          >
            <Save className="w-3.5 h-3.5 text-white flex-shrink-0" />
            <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
          </button>

          {/* 4. PDF (Exportar PDF final) */}
          <button
            onClick={onPrint}
            className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-[#FFC93C] hover:bg-[#F0AE00] text-[var(--color-neutral-text-primary)] font-black text-xs shadow-lg shadow-[#FFC93C]/30 transition active:scale-95 border border-[#F0AE00] cursor-pointer whitespace-nowrap"
            title="Exportar documento PDF final listo para enviar"
          >
            <Download className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-neutral-text-primary)]" />
            <span>PDF</span>
          </button>
        </div>

        {/* Right: User Avatar Circle (Acceso a Cuenta / Suscripción) */}
        <button
          onClick={handlePricingClick}
          className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF7A29] to-[#FFC93C] text-[var(--color-neutral-text-primary)] flex items-center justify-center font-black text-xs shadow-md border-2 border-white/40 hover:scale-105 transition cursor-pointer flex-shrink-0"
          title="Mi Cuenta de Usuario / Suscripción Premium"
        >
          <User className="w-4 h-4 stroke-[2.5]" />
        </button>

      </div>
    </header>
  );
}
