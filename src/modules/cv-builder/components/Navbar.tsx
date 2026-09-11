import React, { useEffect, useState, useRef } from 'react';
import { 
  FolderOpen, 
  Save, 
  User, 
  Download, 
  CopyPlus, 
  FileArchive, 
  LogIn, 
  LogOut, 
  Gem, 
  Building2, 
  Share2,
  Palette,
  ShieldCheck,
  Globe,
  LayoutDashboard
} from 'lucide-react';
import { elevationSystem, radius, UI_THEME_META, buttonUnavailable } from '../../../shared/core/uiDesignSystem';
import { ThemeToggleButton } from '../../../shared/core/ui/ThemeToggleButton';
import { ZoomControls } from '../../../shared/core/ui/ZoomControls';
import { AccountMenuButton } from '../../../shared/core/ui/AccountMenuButton';
import { UndoRedoControls } from '../../../shared/core/ui/UndoRedoControls';
import { useIsMobile } from '../../../shared/core/ui/useIsMobile';
import { useEntitlements, getPlanLabel, PLAN_FEATURES } from '../../../shared/core/entitlements/useEntitlements';
import { navigation } from '../../../shared/core/utils/navigation';
import { useText } from '../../../shared/i18n/useText';
import { Logo } from '../../../shared/core/brand/Logo';

export interface NavbarProps {
  currentCvData: any;
  docType?: 'cv' | 'business_card' | 'book';
  setCvData?: React.Dispatch<React.SetStateAction<any>>;
  onOpenSavedCVsModal: () => void;
  onSaveCVClick: () => void;
  onOpenSaveAsModal: () => void;
  onOpenJsonDownloadModal: () => void;
  onPrint: () => void;
  onOpenAtsCheck?: () => void;
  onOpenPricing?: () => void;
  onOpenAgencyPanel?: () => void;
  onOpenShareAppModal: () => void;
  onOpenPrivacy?: () => void;
  onOpenCloudStatus: () => void;
  onAuthToggle?: () => void;
  isLoggedIn?: boolean;
  userRole?: string;
  isSaving?: boolean;
  zoomLevel: number;
  setZoomLevel: (action: number | ((prev: number) => number)) => void;
  triggerAutoFit: () => void;
  isAutoFitMode?: boolean;
  cycleUITheme: () => void;
}

export default function Navbar({ 
  currentCvData,
  docType = 'cv',
  setCvData: _setCvData,
  onOpenSavedCVsModal,
  onSaveCVClick,
  onOpenSaveAsModal,
  onOpenJsonDownloadModal,
  onPrint,
  onOpenAtsCheck: _onOpenAtsCheck,
  onOpenPricing,
  onOpenAgencyPanel,
  onOpenShareAppModal,
  onOpenPrivacy,
  onOpenCloudStatus,
  onAuthToggle,
  isLoggedIn = false,
  userRole = 'candidate',
  isSaving = false,
  zoomLevel,
  setZoomLevel,
  triggerAutoFit,
  isAutoFitMode = true,
  cycleUITheme
}: NavbarProps) {
  const isMobile = useIsMobile();
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const { plan } = useEntitlements();
  const t = useText();

  const actionMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const currentThemeId = currentCvData?.uiTheme || 'day';
  const themeMeta = UI_THEME_META[currentThemeId] || UI_THEME_META.default;

  // Cierre de desplegables al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setIsActionMenuOpen(false);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAgencyUser = userRole === 'agency' || userRole === 'enterprise' || userRole === 'admin';

  return (
    <header className={`sticky top-0 z-40 bg-[var(--ui-bg-header)] border-b border-[var(--ui-border)] text-[var(--ui-text-primary)] ${elevationSystem.overlay} no-print select-none`}>
      {/* Contenedor Principal: Respetando padding lateral de la barra vertical */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 h-12 sm:h-14 flex items-center justify-between gap-2 relative">
        
        {/* CLUSTER IZQUIERDO: Logo LEECV (Isotipo compacto en celular, Horizontal completo en desktop) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer" onClick={() => navigation.goTo('/')} title="Ir al inicio">
          <Logo
            layout={isMobile ? 'isotipo' : 'horizontal'}
            currentUiTheme={currentThemeId}
            animatedRainbow={true}
            className={isMobile ? 'h-7 w-7' : 'h-7 sm:h-8'}
          />
        </div>

        {/* CLUSTER CENTRO: Botón de Tema + Controles de Zoom (Visibles en PC y Móvil) */}
        <div className="flex items-center gap-1.5 justify-center flex-1 min-w-0">
          {/* Botón Selector de Tema Cromático */}
          <ThemeToggleButton currentThemeId={currentThemeId} onToggle={cycleUITheme} size="sm" />

          <div className="w-px h-5 bg-[var(--ui-border)] mx-0.5" />

          {/* Controles de Zoom y Deshacer/Rehacer (Visibles en Escritorio y Celular) */}
          <div className="flex items-center gap-1.5 min-w-0">
            <ZoomControls
              zoomLevel={zoomLevel}
              setZoomLevel={setZoomLevel}
              triggerAutoFit={triggerAutoFit}
              isAutoFitMode={isAutoFitMode}
              isMobile={isMobile}
            />
            <UndoRedoControls isMobile={isMobile} />
          </div>
        </div>

        {/* CLUSTER DERECHO: Píldoras Ovaladas de Menús (Publicar 🌐 | Acciones 📁💾 | Cuenta 👤🔑) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

          {/* PÍLDORA 0: PUBLICAR EN LA WEB — visible siempre (misma píldora en los 3
              productos, para que el usuario aprenda un solo lugar), deshabilitada con
              tooltip cuando el producto activo no publica documentos como link web. */}
          {docType === 'cv' ? (
            <button
              type="button"
              onClick={onOpenCloudStatus}
              className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full bg-[var(--color-status-success-base)] hover:opacity-90 text-[var(--color-status-success-on-base)] transition ${elevationSystem.raised} cursor-pointer active:scale-95 font-black text-xs shrink-0`}
              title={t.navbar.publishTitle}
            >
              <Globe className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">{t.navbar.publishButton}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              title={docType === 'business_card' ? 'Publicar en la Web es para CVs — las tarjetas se descargan listas para imprimir' : 'Publicar en la Web es para CVs — los libros se descargan listos para imprimir'}
              className={`${buttonUnavailable} flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-xs shrink-0`}
            >
              <Globe className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">{t.navbar.publishButton}</span>
            </button>
          )}

          {/* PÍLDORA 1: MENÚ DE ACCIONES */}
          <div className="relative" ref={actionMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsActionMenuOpen(!isActionMenuOpen);
                setIsAccountMenuOpen(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--ui-bg-panel)] hover:bg-[var(--ui-bg-card)] border-2 border-[var(--ui-border)] transition ${elevationSystem.raised} cursor-pointer active:scale-95 text-[var(--ui-text-primary)]`}
              title={t.navbar.actionMenuTitle}
            >
              <FolderOpen className="w-4 h-4 text-[var(--color-secondary-bright)]" />
              <Save className="w-4 h-4 text-[var(--color-accent-purple-bright)]" />
            </button>

            {/* Dropdown de Acciones */}
            {isActionMenuOpen && (
              <div className={`absolute right-0 mt-2 w-64 rounded-[${radius.modal}] bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] ${elevationSystem.floating} p-1.5 z-50 space-y-1 animate-fadeIn`}>
                
                {/* 0. Abrir Documentos Guardados */}
                <button
                  type="button"
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    onOpenSavedCVsModal();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-[${radius.card}] hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 transition cursor-pointer`}
                >
                  <FolderOpen className="w-4 h-4 text-[var(--color-secondary-bright)]" />
                  <span>{t.navbar.openSavedDocument}</span>
                </button>

                <div className="w-full h-px bg-[var(--ui-border)] my-0.5" />

                {/* 1. Guardar Cambios, Copias y Backup JSON — visibles siempre, deshabilitadas
                    con tooltip cuando el producto activo no es un CV (Tarjeta/Libro son
                    herramientas de una sola pasada: se exportan, no se guardan como
                    documento propio). Mismo patron buttonUnavailable que el resto de la
                    app, no una excepcion nueva de "ocultar sin explicar". */}
                {docType === 'cv' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsActionMenuOpen(false);
                        onSaveCVClick();
                      }}
                      disabled={isSaving}
                      className={`w-full text-left px-3 py-2 rounded-[${radius.card}] hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 transition cursor-pointer disabled:opacity-50`}
                    >
                      <Save className="w-4 h-4 text-[var(--color-accent-purple-bright)]" />
                      <span>{isSaving ? t.navbar.saveChangesSaving : t.navbar.saveChangesOverwrite}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsActionMenuOpen(false);
                        onOpenSaveAsModal();
                      }}
                      className={`w-full text-left px-3 py-2 rounded-[${radius.card}] hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 transition cursor-pointer`}
                    >
                      <CopyPlus className="w-4 h-4 text-[var(--color-secondary-bright)]" />
                      <span>{t.navbar.saveCopyAs}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsActionMenuOpen(false);
                        onOpenJsonDownloadModal();
                      }}
                      className={`w-full text-left px-3 py-2 rounded-[${radius.card}] hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 transition cursor-pointer`}
                    >
                      <FileArchive className="w-4 h-4 text-[var(--color-status-warning-bright)]" />
                      <span>{t.navbar.downloadPortableCopy}</span>
                    </button>

                    <div className="w-full h-px bg-[var(--ui-border)] my-0.5" />
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled
                      title={docType === 'business_card' ? 'Las tarjetas se exportan en PDF, no se guardan como documento aparte' : 'Los libros se exportan en PDF, no se guardan como documento aparte'}
                      className={`${buttonUnavailable} w-full text-left px-3 py-2 text-xs flex items-center gap-2`}
                    >
                      <Save className="w-4 h-4" />
                      <span>{t.navbar.saveChangesOverwrite}</span>
                    </button>

                    <button
                      type="button"
                      disabled
                      title={docType === 'business_card' ? 'Las tarjetas se exportan en PDF, no se guardan como documento aparte' : 'Los libros se exportan en PDF, no se guardan como documento aparte'}
                      className={`${buttonUnavailable} w-full text-left px-3 py-2 text-xs flex items-center gap-2`}
                    >
                      <CopyPlus className="w-4 h-4" />
                      <span>{t.navbar.saveCopyAs}</span>
                    </button>

                    <button
                      type="button"
                      disabled
                      title={docType === 'business_card' ? 'Las tarjetas se exportan en PDF, no se guardan como documento aparte' : 'Los libros se exportan en PDF, no se guardan como documento aparte'}
                      className={`${buttonUnavailable} w-full text-left px-3 py-2 text-xs flex items-center gap-2`}
                    >
                      <FileArchive className="w-4 h-4" />
                      <span>{t.navbar.downloadPortableCopy}</span>
                    </button>

                    <div className="w-full h-px bg-[var(--ui-border)] my-0.5" />
                  </>
                )}

                {/* 5. Exportar en PDF */}
                <button
                  type="button"
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    onPrint();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-[${radius.card}] bg-[var(--color-secondary-base)] hover:opacity-90 text-[var(--color-secondary-on-base)] text-xs font-black flex items-center gap-2 transition cursor-pointer`}
                >
                  <Download className="w-4 h-4" />
                  <span>{t.navbar.exportPdf}</span>
                </button>

                {/* 6. Publicar en la Web — visible siempre, deshabilitado con tooltip para
                    Tarjeta/Libro (mismo motivo y mismo patron que el bloque de guardado
                    de arriba: no es que "no exista", es que no aplica a este producto). */}
                {docType === 'cv' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      onOpenCloudStatus();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-[${radius.card}] bg-[var(--color-status-success-base)] hover:opacity-90 text-[var(--color-status-success-on-base)] text-xs font-black flex items-center gap-2 transition cursor-pointer`}
                  >
                    <Globe className="w-4 h-4" />
                    <span>{t.navbar.publishWebPublicLink}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    title={docType === 'business_card' ? 'Publicar en la Web es para CVs — las tarjetas se descargan listas para imprimir' : 'Publicar en la Web es para CVs — los libros se descargan listos para imprimir'}
                    className={`${buttonUnavailable} w-full text-left px-3 py-2 text-xs flex items-center gap-2`}
                  >
                    <Globe className="w-4 h-4" />
                    <span>{t.navbar.publishWebPublicLink}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* PÍLDORA 2: MENÚ DE CUENTA */}
          <AccountMenuButton
            isLoggedIn={isLoggedIn}
            currentProfile={{ plan }}
            onLogin={onAuthToggle}
            onLogout={onAuthToggle}
            onOpenPricing={onOpenPricing}
            onOpenSavedDocs={onOpenSavedCVsModal}
          />
        </div>
      </div>
    </header>
  );
}
