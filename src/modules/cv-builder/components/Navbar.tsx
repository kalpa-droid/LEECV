import React, { useEffect, useState, useRef } from 'react';
import { 
  FolderOpen, 
  Save, 
  User, 
  Sparkles, 
  Plus, 
  FileText, 
  X, 
  Download, 
  CopyPlus, 
  FileArchive, 
  LogIn, 
  LogOut, 
  Gem, 
  Building2, 
  Mail 
} from 'lucide-react';
import { elevationSystem, radius } from '../../../shared/core/uiDesignSystem';
import { getOpenTabs, removeOpenTab, addOpenTab, OpenTabItem } from '../../../shared/core/storage/documentTabEngine';
import { ZoomControls } from '../../../shared/core/ui/ZoomControls';

export interface NavbarProps {
  currentCvData: any;
  onSwitchDocumentTab: (cvId: string) => Promise<void>;
  onNewCV: () => void;
  onOpenSavedCVsModal: () => void;
  onSaveCVClick: () => void;
  onOpenSaveAsModal: () => void;
  onOpenJsonDownloadModal: () => void;
  onPrint: () => void;
  onOpenAtsCheck?: () => void;
  onOpenPricing?: () => void;
  onOpenAgencyPanel?: () => void;
  onOpenEmailSaveModal: () => void;
  onAuthToggle?: () => void;
  isLoggedIn?: boolean;
  userRole?: string;
  isSaving?: boolean;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  triggerAutoFit: () => void;
  cycleUITheme: () => void;
}

export default function Navbar({ 
  currentCvData,
  onSwitchDocumentTab,
  onNewCV,
  onOpenSavedCVsModal,
  onSaveCVClick,
  onOpenSaveAsModal,
  onOpenJsonDownloadModal,
  onPrint,
  onOpenAtsCheck,
  onOpenPricing,
  onOpenAgencyPanel,
  onOpenEmailSaveModal,
  onAuthToggle,
  isLoggedIn = false,
  userRole = 'candidate',
  isSaving = false,
  zoomLevel,
  setZoomLevel,
  triggerAutoFit,
  cycleUITheme
}: NavbarProps) {
  const [tabs, setTabs] = useState<OpenTabItem[]>([]);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const actionMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const activeCvId = currentCvData?.id || '';

  // Synchronize open tabs list
  useEffect(() => {
    if (activeCvId) {
      const updated = addOpenTab(
        activeCvId,
        currentCvData?.title || 'Mi Currículum Vitae',
        currentCvData?.version_label
      );
      setTabs(updated);
    } else {
      setTabs(getOpenTabs());
    }
  }, [activeCvId, currentCvData?.title, currentCvData?.version_label]);

  // Click outside listener for dropdown menus
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

  const handleCloseTab = async (e: React.MouseEvent, cvId: string) => {
    e.stopPropagation();
    const remaining = removeOpenTab(cvId);
    setTabs(remaining);

    if (cvId === activeCvId) {
      if (remaining.length > 0) {
        const lastTab = remaining[remaining.length - 1];
        await onSwitchDocumentTab(lastTab.cvId);
      } else {
        onNewCV();
      }
    }
  };

  const isAgencyUser = userRole === 'agency' || userRole === 'enterprise' || userRole === 'admin';

  return (
    <header className={`sticky top-0 z-40 bg-[var(--ui-bg-header)] border-b border-[var(--ui-border)] text-[var(--ui-text-primary)] ${elevationSystem.overlay} no-print select-none`}>
      {/* Festive Rainbow Accent Strip */}
      <div className="ui-topbar-rainbow h-1 w-full" />
      
      <div className="max-w-7xl mx-auto px-2 sm:px-4 h-12 sm:h-14 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        
        {/* CLUSTER IZQUIERDO: LEECV | ATS | Zoom (100% Encajar) | Tema */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Logo Brand */}
          <div className="flex items-center gap-1.5">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-[${radius.control}] bg-[var(--color-accent-base)] flex items-center justify-center font-black text-xs ${elevationSystem.raised} text-[var(--color-accent-on-base)] border border-white/20`}>
              LEE
            </div>
            <h1 className="font-black text-sm sm:text-base tracking-wider text-[var(--ui-text-primary)] hidden sm:block">
              LEECV
            </h1>
          </div>

          <div className="w-px h-5 bg-[var(--ui-border)] mx-0.5" />

          {/* Botón ATS */}
          {onOpenAtsCheck && (
            <button
              type="button"
              onClick={onOpenAtsCheck}
              className={`flex items-center gap-1 px-2 py-1 rounded-[${radius.card}] text-xs font-black text-[var(--ui-text-primary)] bg-[var(--ui-bg-panel)] hover:bg-[var(--ui-bg-card)] border border-[var(--ui-border)] transition ${elevationSystem.raised} cursor-pointer whitespace-nowrap active:scale-95`}
              title="Auditoría de lectura predictiva para ATS"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent-amber-bright)] flex-shrink-0" />
              <span>ATS</span>
            </button>
          )}

          {/* Controles de Zoom + Tema Integrados */}
          <ZoomControls
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            triggerAutoFit={triggerAutoFit}
            currentUiTheme={currentCvData?.uiTheme || 'default'}
            onCycleTheme={cycleUITheme}
          />
        </div>

        {/* CLUSTER CENTRAL: Pestañas de CVs Abiertos + Botón "+" (Nuevo) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0 flex-1 justify-center px-1">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full py-0.5">
            {tabs.map((tab) => {
              const isActive = tab.cvId === activeCvId;
              return (
                <div
                  key={tab.cvId}
                  onClick={() => {
                    if (!isActive) onSwitchDocumentTab(tab.cvId);
                  }}
                  className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-[${radius.card}] text-xs font-bold transition cursor-pointer shrink-0 border ${
                    isActive
                      ? `bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] border-[var(--color-accent-base)] ${elevationSystem.raised}`
                      : 'bg-[var(--ui-bg-panel)] text-[var(--ui-dock-text-muted)] border-[var(--ui-border)] hover:bg-[var(--ui-bg-card)] hover:text-[var(--ui-dock-text)]'
                  }`}
                  title={tab.title}
                >
                  <FileText className={`w-3.5 h-3.5 ${isActive ? 'text-[var(--color-accent-on-base)]' : 'text-[var(--color-secondary-bright)]'}`} />
                  <span className="truncate max-w-[110px] sm:max-w-[150px] leading-none">
                    {tab.title}
                  </span>

                  {tab.versionLabel && (
                    <span className={`text-[9px] px-1 py-0.5 rounded font-black uppercase tracking-tighter ${
                      isActive
                        ? 'bg-[var(--color-accent-on-base)] text-[var(--color-accent-base)]'
                        : 'bg-[var(--ui-bg-card)] text-[var(--color-secondary-bright)] border border-[var(--ui-border)]'
                    }`}>
                      {tab.versionLabel}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(e, tab.cvId)}
                    className={`p-0.5 rounded transition cursor-pointer opacity-80 hover:opacity-100`}
                    title="Cerrar Pestaña"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Botón "+" (Agregar Pestaña / Nuevo Documento) */}
          <button
            type="button"
            onClick={onNewCV}
            className={`p-1.5 rounded-full bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-card)] text-[var(--color-status-success-bright)] transition cursor-pointer active:scale-95 shrink-0 ${elevationSystem.raised}`}
            title="Crear Nuevo Documento (+)"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* CLUSTER DERECHO: Píldoras Ovaladas de Menús (Acciones 📁💾 | Cuenta 👤🔑) */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          
          {/* PÍLDORA 1: MENÚ DE ACCIONES (Iconos de Abrir 📁 y Guardar 💾) */}
          <div className="relative" ref={actionMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsActionMenuOpen(!isActionMenuOpen);
                setIsAccountMenuOpen(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--ui-bg-panel)] hover:bg-[var(--ui-bg-card)] border-2 border-[var(--ui-border)] transition ${elevationSystem.raised} cursor-pointer active:scale-95 text-[var(--ui-text-primary)]`}
              title="Menú de Guardado y Exportación (Abrir / Guardar / PDF / Portátil)"
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

                {/* 2. Guardar como copia para Puesto */}
                <button
                  type="button"
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    onOpenSaveAsModal();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-[${radius.card}] hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 transition cursor-pointer`}
                >
                  <CopyPlus className="w-4 h-4 text-[var(--color-secondary-bright)]" />
                  <span>Guardar como copia para Puesto</span>
                </button>

                {/* 3. Descargar Copia Portátil (.JSON / .ZIP) */}
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

                {/* 4. Exportar en PDF */}
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
              title="Cuenta de Usuario / Suscripción / Opciones"
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

                {/* 2. Planes */}
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

                {/* 4. Guardar en mi Correo */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    onOpenEmailSaveModal();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-[${radius.card}] hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 transition cursor-pointer`}
                >
                  <Mail className="w-4 h-4 text-[var(--color-secondary-bright)]" />
                  <span>Guardar en mi Correo</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
}
