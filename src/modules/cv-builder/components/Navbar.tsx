import React from 'react';
import { elevationSystem, radius } from '../../../shared/core/uiDesignSystem';
import { runWithSafeSave } from '../../../shared/core/storage/safeNavigationEngine';

import { 
  Save,
  Download,
  User,
  Sparkles
} from 'lucide-react';

export default function Navbar({ 
  onPrint, 
  onOpenSaveModal,
  onSaveCV,
  onOpenPricing,
  onOpenAtsCheck,
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
  const handleSaveClick = () => {
    if (onOpenSaveModal) {
      onOpenSaveModal();
    } else if (onSaveCV) {
      onSaveCV();
    }
  };

  const handlePricingClick = () => {
    runWithSafeSave(onSaveCV, onOpenPricing);
  };

  return (
    <header className={`sticky top-0 z-40 bg-[var(--ui-bg-header)] border-b border-[var(--ui-border)] text-[var(--ui-text-primary)] ${elevationSystem.overlay} no-print select-none`}>
      {/* Festive Rainbow Accent Strip (Movimiento Real) */}
      <div className="ui-topbar-rainbow h-1 w-full" />
      
      <div className="max-w-7xl mx-auto px-2 sm:px-4 h-12 sm:h-14 flex items-center justify-between gap-1.5">
        
        {/* Left: Brand & Logo */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-[${radius.control}] bg-[var(--color-accent-base)] flex items-center justify-center font-black text-xs ${elevationSystem.raised} text-[var(--color-accent-on-base)] border border-white/20`}>
            LEE
          </div>
          <h1 className="font-black text-sm sm:text-base tracking-wider text-[var(--ui-text-primary)]">
            LEECV
          </h1>
        </div>

        {/* Middle: Acciones del Documento Activo */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar max-w-full py-1">
          {/* 1. GUARDAR / GUARDAR COMO */}
          <button
            onClick={handleSaveClick}
            disabled={isSaving}
            className={`flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-[${radius.card}] text-xs font-black text-[var(--ui-text-primary)] bg-[var(--ui-bg-panel)] hover:bg-[var(--ui-bg-card)] border border-[var(--ui-border)] transition disabled:opacity-50 ${elevationSystem.raised} cursor-pointer whitespace-nowrap active:scale-95`}
            title="Guardar currículum o guardar nueva versión independiente"
          >
            <Save className="w-3.5 h-3.5 text-[var(--ui-text-secondary)] flex-shrink-0" />
            <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
          </button>

          {/* 2. ATS CHECK */}
          {onOpenAtsCheck && (
            <button
              onClick={onOpenAtsCheck}
              className={`flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-[${radius.card}] text-xs font-black text-[var(--ui-text-primary)] bg-[var(--ui-bg-panel)] hover:bg-[var(--ui-bg-card)] border border-[var(--ui-border)] transition ${elevationSystem.raised} cursor-pointer whitespace-nowrap active:scale-95`}
              title="Auditoría de lectura predictiva para ATS"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--ui-text-secondary)] flex-shrink-0" />
              <span>ATS</span>
            </button>
          )}

          {/* 3. PDF */}
          <button
            onClick={onPrint}
            className={`flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-[${radius.card}] bg-[var(--color-secondary-base)] hover:opacity-90 text-[var(--color-secondary-on-base)] font-extrabold text-xs ${elevationSystem.raised} transition active:scale-95 border border-[var(--color-secondary-hover)] cursor-pointer whitespace-nowrap`}
            title="Exportar documento PDF final listo para enviar"
          >
            <Download className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-secondary-on-base)]" />
            <span>PDF</span>
          </button>
        </div>

        {/* Right: User Avatar Circle (Acceso a Cuenta / Suscripción) */}
        <button
          onClick={handlePricingClick}
          className={`w-8 h-8 rounded-full bg-[var(--color-accent-amber)] bg-gradient-to-tr from-[var(--color-accent-orange)] to-[var(--color-accent-amber)] text-black flex items-center justify-center font-black text-xs ${elevationSystem.raised} border-2 border-[var(--ui-border)] hover:scale-105 transition cursor-pointer flex-shrink-0`}
          title="Mi Cuenta de Usuario / Suscripción Premium"
        >
          <User className="w-4 h-4 stroke-[2.5]" />
        </button>

      </div>
    </header>
  );
}
