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
import { elevationSystem, radius, UI_THEME_META } from '../../../shared/core/uiDesignSystem';
import { ZoomControls } from '../../../shared/core/ui/ZoomControls';
import { UndoRedoControls } from '../../../shared/core/ui/UndoRedoControls';
import { useEntitlements, getPlanLabel, PLAN_FEATURES } from '../../../shared/core/entitlements/useEntitlements';
import { navigation } from '../../../shared/core/utils/navigation';

export interface NavbarProps {
  currentCvData: any;
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
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const { plan } = useEntitlements();

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
      {/* Festive Rainbow Accent Strip */}
      <div className="ui-topbar-rainbow h-1 w-full" />
      
      {/* Contenedor Principal: Respetando padding lateral de la barra vertical */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 h-12 sm:h-14 flex items-center justify-between gap-2 relative">
        
        {/* CLUSTER IZQUIERDO: Logo LEECV */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-[${radius.control}] bg-[var(--color-accent-base)] flex items-center justify-center font-black text-xs ${elevationSystem.raised} text-[var(--color-accent-on-base)] border border-white/20`}>
              LEE
            </div>
            <h1 className="font-black text-sm sm:text-base tracking-wider text-[var(--ui-text-primary)] hidden sm:block">
              LEECV
            </h1>
          </div>
        </div>

        {/* CLUSTER CENTRO: Botón de Tema + Controles de Zoom (Visibles en PC y Móvil) */}
        <div className="flex items-center gap-1.5 justify-center flex-1 min-w-0">
          {/* Botón Selector de Tema Cromático */}
          <button
            type="button"
            onClick={cycleUITheme}
            className={`flex items-center gap-1 px-2 py-1 rounded-[${radius.card}] text-xs font-black text-[var(--ui-text-primary)] bg-[var(--ui-bg-panel)] hover:bg-[var(--ui-bg-card)] border border-[var(--ui-border)] transition ${elevationSystem.raised} cursor-pointer whitespace-nowrap active:scale-95 shrink-0`}
            title={`Tema actual: ${themeMeta.label}. Clic para alternar tema.`}
          >
            <Palette className="w-3.5 h-3.5 text-[var(--color-secondary-bright)] flex-shrink-0" />
            <span className="hidden sm:inline">{themeMeta.shortLabel}</span>
            <span className="text-xs leading-none">{themeMeta.emoji}</span>
          </button>

          <div className="w-px h-5 bg-[var(--ui-border)] mx-0.5" />

          {/* Controles de Zoom y Deshacer/Rehacer (Visibles en Escritorio y Celular) */}
          <div className="shrink-0 flex items-center gap-1.5">
            <ZoomControls
              zoomLevel={zoomLevel}
              setZoomLevel={setZoomLevel}
              triggerAutoFit={triggerAutoFit}
              isAutoFitMode={isAutoFitMode}
            />
            <UndoRedoControls />
          </div>
        </div>

        {/* CLUSTER DERECHO: Píldoras Ovaladas de Menús (Publicar 🌐 | Acciones 📁💾 | Cuenta 👤🔑) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

          {/* PÍLDORA 0: PUBLICAR EN LA WEB — acceso directo de un solo clic, sin depender de que
              el usuario encuentre el ítem dentro del menú de Acciones. Reutiliza los mismos
              tokens de color (--color-status-success-base/on-base) que el ítem del dropdown,
              así no introduce un par nuevo que check-contrast.js tenga que auditar de cero. */}
          <button
            type="button"
            onClick={onOpenCloudStatus}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full bg-[var(--color-status-success-base)] hover:opacity-90 text-[var(--color-status-success-on-base)] transition ${elevationSystem.raised} cursor-pointer active:scale-95 font-black text-xs shrink-0`}
            title="Publicar CV en la Web (Link Público)"
          >
            <Globe className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Publicar</span>
          </button>

          {/* PÍLDORA 1: MENÚ DE ACCIONES (Iconos de Abrir 📁 y Guardar 💾) */}
          <div className="relative" ref={actionMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsActionMenuOpen(!isActionMenuOpen);
                setIsAccountMenuOpen(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--ui-bg-panel)] hover:bg-[var(--ui-bg-card)] border-2 border-[var(--ui-border)] transition ${elevationSystem.raised} cursor-pointer active:scale-95 text-[var(--ui-text-primary)]`}
              title="Menú de Guardado y Exportación (Abrir / Guardar / Publicar / PDF / Portátil)"
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
                  <span>Abrir Documento Guardado...</span>
                </button>

                <div className="w-full h-px bg-[var(--ui-border)] my-0.5" />

                {/* 1. Guardar Cambios (Sobrescribir Activo) */}
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
                  <span>{isSaving ? 'Guardando...' : 'Guardar Cambios (Sobrescribir)'}</span>
                </button>

                {/* 2. Guardar una copia para... */}
                <button
                  type="button"
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    onOpenSaveAsModal();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-[${radius.card}] hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 transition cursor-pointer`}
                >
                  <CopyPlus className="w-4 h-4 text-[var(--color-secondary-bright)]" />
                  <span>Guardar una copia para...</span>
                </button>



                {/* 4. Descargar Copia Portátil (.JSON / .ZIP) */}
                <button
                  type="button"
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    onOpenJsonDownloadModal();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-[${radius.card}] hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 transition cursor-pointer`}
                >
                  <FileArchive className="w-4 h-4 text-[var(--color-status-warning-bright)]" />
                  <span>Descargar Copia Portátil (.JSON/.ZIP)</span>
                </button>

                <div className="w-full h-px bg-[var(--ui-border)] my-0.5" />

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
                  <span>Exportar en PDF</span>
                </button>

                {/* 6. Publicar en la Web */}
                <button
                  type="button"
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    onOpenCloudStatus();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-[${radius.card}] bg-[var(--color-status-success-base)] hover:opacity-90 text-[var(--color-status-success-on-base)] text-xs font-black flex items-center gap-2 transition cursor-pointer`}
                >
                  <Globe className="w-4 h-4" />
                  <span>Publicar en la Web (Link Público)</span>
                </button>
              </div>
            )}
          </div>

          {/* PÍLDORA 2: MENÚ DE CUENTA (Iconos de Usuario 👤 e Ingresar 🔑/LogOut) */}
          <div className="relative" ref={accountMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsAccountMenuOpen(!isAccountMenuOpen);
                setIsActionMenuOpen(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-accent-amber)] bg-gradient-to-tr from-[var(--color-accent-orange)] to-[var(--color-accent-amber)] text-black border-2 border-[var(--ui-border)] transition ${elevationSystem.raised} cursor-pointer active:scale-95`}
              title="Cuenta de Usuario / Suscripción / Compartir / Privacidad"
            >
              <User className="w-4 h-4 stroke-[2.5]" />
              {isLoggedIn ? (
                <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
              ) : (
                <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
            </button>

            {/* Dropdown de Cuenta */}
            {isAccountMenuOpen && (
              <div className={`absolute right-0 mt-2 w-56 rounded-[${radius.modal}] bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] ${elevationSystem.floating} p-1.5 z-50 space-y-1 animate-fadeIn`}>
                
                {/* Insignia del Plan Activo */}
                <div className={`px-3 py-1.5 rounded-[${radius.card}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] flex items-center justify-between`}>
                  <span className="text-[10px] text-[var(--ui-text-secondary)] font-bold">Plan Activo:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)]">
                    {plan === 'enterprise' ? `Enterprise (${PLAN_FEATURES.enterprise.cloudStorageGB}GB)` : getPlanLabel(plan)}
                  </span>
                </div>

                <div className="w-full h-px bg-[var(--ui-border)] my-0.5" />
                {/* 1. Ingresar / Salir */}
                {onAuthToggle && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onAuthToggle();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-[${radius.card}] hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 transition cursor-pointer`}
                  >
                    {isLoggedIn ? (
                      <>
                        <LogOut className="w-4 h-4 text-[var(--color-status-danger-bright)]" />
                        <span>Cerrar Sesión</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4 text-[var(--color-status-success-bright)]" />
                        <span>Ingresar</span>
                      </>
                    )}
                  </button>
                )}

                {/* 2. Mi Panel de Gestión */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    navigation.goTo('/dashboard');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-[${radius.card}] hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 transition cursor-pointer`}
                >
                  <LayoutDashboard className="w-4 h-4 text-[var(--color-secondary-text)]" />
                  <span>Mi Panel de Gestión</span>
                </button>

                {/* 3. Planes */}
                {onOpenPricing && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onOpenPricing();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-[${radius.card}] hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 transition cursor-pointer`}
                  >
                    <Gem className="w-4 h-4 text-[var(--color-accent-amber-bright)]" />
                    <span>Planes & Suscripciones</span>
                  </button>
                )}

                {/* 3. Panel (Para usuarios Agencia / Empresa) */}
                {isAgencyUser && onOpenAgencyPanel && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onOpenAgencyPanel();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-[${radius.card}] hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 transition cursor-pointer`}
                  >
                    <Building2 className="w-4 h-4 text-[var(--color-secondary-bright)]" />
                    <span>Panel Agencia / Empresa</span>
                  </button>
                )}

                {/* 4. Compartir Aplicación */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    onOpenShareAppModal();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-[${radius.card}] hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 transition cursor-pointer`}
                >
                  <Share2 className="w-4 h-4 text-[var(--color-secondary-bright)]" />
                  <span>📲 Compartir Aplicación</span>
                </button>

                <div className="w-full h-px bg-[var(--ui-border)] my-0.5" />

                {/* 5. Política de Privacidad */}
                {onOpenPrivacy && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onOpenPrivacy();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-[${radius.card}] hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 transition cursor-pointer text-[var(--ui-text-secondary)]`}
                  >
                    <ShieldCheck className="w-4 h-4 text-[var(--color-status-success-bright)]" />
                    <span>Política de Privacidad</span>
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
}
