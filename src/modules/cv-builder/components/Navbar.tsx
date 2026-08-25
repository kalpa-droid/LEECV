import React from 'react';
import { 
  FilePlus,
  FolderOpen,
  Save,
  Download,
  User,
  Sparkles
} from 'lucide-react';

export default function Navbar({ 
  onPrint, 
  onStartNewCVWizard,
  onOpenSavedCVs,
  onSaveCV,
  onOpenSaveModal,
  onOpenPricing,
  onNewCV,
  onOpenAtsCheck,
  onExportAtsPdf,
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
  onOpenAtsCheck?: () => void;
  onExportAtsPdf?: () => void;
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
    <header className="sticky top-0 z-40 bg-[var(--ui-bg-header)] border-b border-[var(--ui-border)] text-[var(--ui-text-primary)] shadow-xl no-print select-none">
      {/* Festive Bunting Accent Strip */}
      <div className="h-1 w-full bg-gradient-to-r from-[var(--color-accent-base)] via-[var(--ui-secondary)] to-[var(--ui-accent-purple)]" />
      
      <div className="max-w-7xl mx-auto px-2 sm:px-4 h-12 sm:h-14 flex items-center justify-between gap-1.5">
        
        {/* Left: Brand & Logo */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[var(--color-accent-base)] flex items-center justify-center font-black text-xs shadow-md text-white border border-white/20">
            LEE
          </div>
          <h1 className="font-black text-sm sm:text-base tracking-wider text-[var(--ui-text-primary)]">
            LEECV
          </h1>
        </div>

        {/* Middle: 5 Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 1. NUEVO */}
          <button
            onClick={handleNewClick}
            className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-black text-white bg-[var(--color-accent-base)] hover:bg-[var(--color-accent-brand-hover)] border border-white/10 transition shadow-md cursor-pointer whitespace-nowrap active:scale-95"
            title="Iniciar un nuevo currículum en blanco"
          >
            <FilePlus className="w-3.5 h-3.5 text-white flex-shrink-0" />
            <span>Nuevo</span>
          </button>

          {/* 2. ABRIR */}
          <button
            onClick={handleOpenSavedClick}
            className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-black text-[var(--ui-text-primary)] bg-[var(--ui-bg-panel)] hover:bg-[var(--ui-bg-card)] border border-[var(--ui-border)] transition shadow-sm cursor-pointer whitespace-nowrap active:scale-95"
            title="Abrir borradores guardados, importar JSON o sincronizar nube"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[var(--ui-text-secondary)] flex-shrink-0" />
            <span>Abrir</span>
          </button>

          {/* 3. GUARDAR */}
          <button
            onClick={handleSaveClick}
            disabled={isSaving}
            className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-black text-[var(--ui-text-primary)] bg-[var(--ui-bg-panel)] hover:bg-[var(--ui-bg-card)] border border-[var(--ui-border)] transition disabled:opacity-50 shadow-sm cursor-pointer whitespace-nowrap active:scale-95"
            title="Guardar currículum o descargar copia JSON de respaldo"
          >
            <Save className="w-3.5 h-3.5 text-[var(--ui-text-secondary)] flex-shrink-0" />
            <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
          </button>

          {/* 4. ATS CHECK */}
          {onOpenAtsCheck && (
            <button
              onClick={onOpenAtsCheck}
              className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-black text-[var(--ui-text-primary)] bg-[var(--ui-bg-panel)] hover:bg-[var(--ui-bg-card)] border border-[var(--ui-border)] transition shadow-sm cursor-pointer whitespace-nowrap active:scale-95"
              title="Auditoría de lectura predictiva para ATS"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--ui-text-secondary)] flex-shrink-0" />
              <span>ATS</span>
            </button>
          )}

          {/* 5. PDF */}
          <button
            onClick={onPrint}
            className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-[var(--color-secondary-base)] hover:opacity-90 text-white font-extrabold text-xs shadow-md transition active:scale-95 border border-white/10 cursor-pointer whitespace-nowrap"
            title="Exportar documento PDF final listo para enviar"
          >
            <Download className="w-3.5 h-3.5 flex-shrink-0 text-white" />
            <span>PDF</span>
          </button>
        </div>

        {/* Right: User Avatar Circle (Acceso a Cuenta / Suscripción) */}
        <button
          onClick={handlePricingClick}
          className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--color-accent-orange)] to-[var(--color-accent-amber)] text-black flex items-center justify-center font-black text-xs shadow-md border-2 border-white/40 hover:scale-105 transition cursor-pointer flex-shrink-0"
          title="Mi Cuenta de Usuario / Suscripción Premium"
        >
          <User className="w-4 h-4 stroke-[2.5]" />
        </button>

      </div>
    </header>
  );
}
