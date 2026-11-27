import React, { Suspense, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Cloud,
  CopyPlus,
  FileArchive,
  FolderOpen,
  Palette,
  Share2,
  ShieldCheck,
  User,
} from 'lucide-react';
import type { UniversalBackupHandlers } from '../ui/UniversalBackupModal';

const UniversalBackupModal = React.lazy(() => import('../ui/UniversalBackupModal'));
import { DomSectionIcon } from '../pdf-engine/layers/icons/DomSectionIcon';
import { UI_ICON_IDS } from '../ui/iconCatalog';
import {
  UI_THEME_CYCLE,
  UI_THEME_META,
  button,
  buttonUnavailable,
  elevationSystem,
  radius,
} from '../uiDesignSystem';
import { UndoRedoControls } from '../ui/UndoRedoControls';
import { useIsMobile } from '../ui/useIsMobile';
import { useEntitlements } from '../entitlements/useEntitlements';
import { useAuth } from '../auth/AuthContext';
import { navigation } from '../utils/navigation';
import { setGlobalUiTheme } from '../utils/globalThemePreference';
import { useText } from '../../i18n/useText';
import { Logo } from '../brand/Logo';
import { capabilitiesGate } from '../documents/documentEngine';
import {
  getDocumentTypeConfig,
  hasCapability,
  isEncryptedVaultDocumentType,
} from '../capabilities/capabilityRegistry';
import { resolveActiveFormat } from '../formats/cvFormatRegistry';
import { TOPBAR_BUDGET } from '../../contracts/appContract';
import { stripLeadingEmoji } from '../ui/topBarActionRegistry';
import { DocumentTypeId } from '../../../types/document';

export interface NavbarGlobalContextPill {
  id?: string;
  shortLabel: string;
  mobileLabel?: string;
  tooltip: string;
  ariaLabel?: string;
  icon?: React.ReactNode;
  iconId?: string;
  hasOverrides?: boolean;
  onClick: () => void;
}

export interface NavbarGlobalAction {
  id: string;
  label: string;
  mobileLabel?: string;
  tooltip: string;
  ariaLabel?: string;
  icon?: React.ReactNode;
  iconId?: string;
  active?: boolean;
  tone?: 'accent' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral';
  onClick: () => void;
}

export interface NavbarBackupHealth {
  status: 'ok' | 'warning' | 'danger';
  label: string;
  tooltip: string;
  onClick?: () => void;
}

export interface NavbarProps {
  currentCvData: any;
  /** Tema global de UI. Si se pasa, tiene prioridad sobre currentCvData.uiTheme. */
  currentUiTheme?: string;
  docType?: DocumentTypeId;
  setCvData?: React.Dispatch<React.SetStateAction<any>>;
  onOpenSavedCVsModal: () => void;
  onSaveCVClick: () => void;
  /** Etiqueta contextual opcional para la acción de guardar (ej. FacturLee). */
  saveActionLabel?: string;
  /** Semáforo de salud de respaldo local / Carpeta Segura. */
  backupHealth?: NavbarBackupHealth;
  onOpenSaveAsModal: () => void;
  onOpenJsonDownloadModal: () => void;
  onPrint: () => void;
  onOpenAtsCheck?: () => void;
  /** Score ATS en tiempo real para mostrar en la píldora (0-100). */
  atsScore?: number;
  /** Selector global de región/estándar (ej. EE.UU., Europass, LATAM). */
  onOpenRegionFormat?: () => void;
  /** Píldora única legada (compatibilidad; preferir `globalContextPills`). */
  globalContextPill?: NavbarGlobalContextPill;
  /** Píldoras declarativas de contexto global en barra superior (máx. 3). */
  globalContextPills?: NavbarGlobalContextPill[];
  /** Acciones o diagnósticos globales transversales (máx. 2, ej. Carta + ATS). */
  globalActions?: NavbarGlobalAction[];
  /** Callbacks opacos opcionales para respaldos cifrados locales (p. ej. FacturLee .leecv-fact) sin filtrar secretos ni red al módulo. */
  driveBackupHandlers?: UniversalBackupHandlers;
  onOpenPricing?: () => void;
  onOpenCreditsModal?: () => void;
  onOpenAgencyPanel?: () => void;
  onOpenShareAppModal: () => void;
  onOpenPrivacy?: () => void;

  undo?: () => void;
  redo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;

  isSaving?: boolean;
  zoomLevel: number;
  setZoomLevel: (action: number | ((prev: number) => number)) => void;
  triggerAutoFit: () => void;
  isAutoFitMode?: boolean;
  cycleUITheme: () => void;
  /** Estado unificado del panel lateral (móvil: true = editor, false = vista previa). */
  isPanelOpen?: boolean;
  /** Cierra el panel editor en móvil para pasar en un toque a la vista previa. */
  onCloseMobilePanel?: () => void;
}

export type StudioNavbarProps = NavbarProps;

const ACTION_TONE_CLASSES: Record<NonNullable<NavbarGlobalAction['tone']>, string> = {
  accent:
    'border-[var(--color-accent-base)]/60 text-[var(--color-accent-text)] bg-[var(--ui-bg-panel)] hover:bg-[var(--color-accent-muted)]',
  secondary:
    'border-[var(--color-secondary-base)]/60 text-[var(--color-secondary-text)] bg-[var(--ui-bg-panel)] hover:bg-[var(--color-secondary-muted)]',
  success:
    'border-[var(--color-status-success-base)] text-[var(--color-status-success-text)] bg-[var(--ui-bg-panel)] hover:bg-[var(--color-status-success-muted)]',
  warning:
    'border-[var(--color-status-warning-base)] text-[var(--color-status-warning-text)] bg-[var(--ui-bg-panel)] hover:bg-[var(--color-status-warning-muted)]',
  danger:
    'border-[var(--color-status-danger-base)] text-[var(--color-status-danger-text)] bg-[var(--ui-bg-panel)] hover:bg-[var(--color-status-danger-muted)]',
  neutral:
    'border-[var(--ui-border)] text-[var(--ui-text-primary)] bg-[var(--ui-bg-panel)] hover:bg-[var(--ui-bg-card)]',
};

export function StudioNavbar({
  currentCvData,
  currentUiTheme,
  docType = 'cv',
  setCvData: _setCvData,
  onOpenSavedCVsModal,
  onSaveCVClick,
  saveActionLabel,
  backupHealth,
  onOpenSaveAsModal,
  onOpenJsonDownloadModal,
  onPrint,
  onOpenAtsCheck,
  atsScore,
  onOpenRegionFormat,
  globalContextPill,
  globalContextPills,
  globalActions,
  driveBackupHandlers,
  onOpenCreditsModal,
  onOpenShareAppModal,
  onOpenPrivacy,
  undo,
  redo,
  canUndo = false,
  canRedo = false,
  isSaving = false,
  isPanelOpen = true,
  onCloseMobilePanel,
}: NavbarProps) {
  const isMobile = useIsMobile();
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isUniversalBackupOpen, setIsUniversalBackupOpen] = useState(false);
  const { pdfTokens, isPro } = useEntitlements();
  const { user } = useAuth();
  const t = useText();

  const actionMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const currentThemeId = currentUiTheme || currentCvData?.uiTheme || 'day';
  const normalizedThemeId =
    currentThemeId === 'day' ? 'default' : currentThemeId === 'night' ? 'dark' : currentThemeId;
  const activeThemeMeta = UI_THEME_META[normalizedThemeId] || UI_THEME_META.default;

  const supportsAtsBar = hasCapability(docType, 'experience');
  const supportsRegionFormat = hasCapability(docType, 'region_format');
  const activeRegionFormat = supportsRegionFormat ? resolveActiveFormat(currentCvData) : null;
  const isEncryptedVault = isEncryptedVaultDocumentType(docType);
  const exportOnlyTooltip = `${getDocumentTypeConfig(docType).name}: se exporta en PDF, no se guarda como documento aparte`;

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

  const resolvedContextPills: NavbarGlobalContextPill[] = (() => {
    const base: NavbarGlobalContextPill[] =
      globalContextPills && globalContextPills.length > 0
        ? [...globalContextPills]
        : globalContextPill
          ? [globalContextPill]
          : supportsRegionFormat && activeRegionFormat && typeof onOpenRegionFormat === 'function'
            ? [
                {
                  id: 'region_format',
                  shortLabel: activeRegionFormat.shortBadge,
                  tooltip: `Estándar activo: ${activeRegionFormat.name}`,
                  ariaLabel: `Región o estándar del CV: ${activeRegionFormat.shortBadge}`,
                  iconId: UI_ICON_IDS.region,
                  onClick: onOpenRegionFormat,
                },
              ]
            : [];

    if (
      supportsAtsBar &&
      typeof onOpenAtsCheck === 'function' &&
      atsScore !== undefined &&
      !base.some((p) => p.id === 'ats_check') &&
      base.length < TOPBAR_BUDGET.maxGlobalContextPills
    ) {
      base.push({
        id: 'ats_check',
        shortLabel: `ATS ${atsScore}%`,
        mobileLabel: `${atsScore}%`,
        tooltip: 'Diagnóstico ATS del CV',
        ariaLabel: `Diagnóstico ATS del CV: ${atsScore}%`,
        iconId: UI_ICON_IDS.ats,
        icon:
          atsScore >= 85 ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[var(--color-status-success-text)]" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[var(--color-status-warning-text)]" />
          ),
        onClick: onOpenAtsCheck,
      });
    }

    return base.slice(0, TOPBAR_BUDGET.maxGlobalContextPills);
  })();

  const resolvedActions: NavbarGlobalAction[] = (globalActions || []).slice(
    0,
    TOPBAR_BUDGET.maxGlobalActions,
  );

  return (
    <>
      <header
        className={`sticky top-0 z-40 bg-[var(--ui-bg-header)] border-b border-[var(--ui-border)] text-[var(--ui-text-primary)] ${elevationSystem.overlay} no-print select-none`}
      >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 h-12 sm:h-14 flex items-center justify-between gap-1.5 sm:gap-2 relative">
        {/* ZONA 1: Logo + Deshacer/Rehacer */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigation.goTo('/')}
            title="Ir al inicio"
            aria-label="Ir al inicio"
            className="flex items-center cursor-pointer shrink-0"
          >
            <Logo
              layout={isMobile ? 'isotipo' : 'horizontal'}
              currentUiTheme={currentThemeId}
              animatedRainbow={true}
              className={isMobile ? 'h-7 w-auto' : 'h-7 sm:h-8 w-auto'}
            />
          </button>

          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 pl-1 border-l border-[var(--ui-border)]">
            <UndoRedoControls
              isMobile={isMobile}
              undo={undo}
              redo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
            />
          </div>
        </div>

        {/* ZONA 2 + ZONA 3: Contextos Globales (<=3) y Acciones Globales (<=2) */}
        <div
          data-topbar-center="true"
          className="flex-1 min-w-0 flex items-center justify-start sm:justify-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar px-0.5"
        >
          {resolvedContextPills.map((pill, idx) => {
            const desktopText = stripLeadingEmoji(pill.shortLabel);
            const mobileText = stripLeadingEmoji(pill.mobileLabel || pill.shortLabel);
            return (
              <button
                key={pill.id || `ctx-${idx}`}
                type="button"
                title={pill.tooltip}
                aria-label={pill.ariaLabel || pill.tooltip}
                onClick={pill.onClick}
                className="relative flex items-center justify-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full font-black text-[11px] sm:text-xs shrink-0 whitespace-nowrap transition active:scale-95 cursor-pointer border bg-[var(--ui-bg-panel)] border-[var(--color-accent-base)]/60 text-[var(--color-accent-text)] hover:bg-[var(--color-accent-muted)]"
              >
                {pill.icon || (
                  <DomSectionIcon
                    iconId={pill.iconId || UI_ICON_IDS.region}
                    className="w-3.5 h-3.5 shrink-0"
                  />
                )}
                <span className="sm:hidden">{mobileText}</span>
                <span className="hidden sm:inline">{desktopText}</span>
                {pill.hasOverrides && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[var(--color-secondary-base)] shrink-0"
                    title="Con ajustes finos manuales"
                  />
                )}
              </button>
            );
          })}

          {resolvedActions.map((act) => {
            const toneClass = ACTION_TONE_CLASSES[act.tone || 'neutral'];
            const activeRing = act.active
              ? 'ring-2 ring-[var(--color-accent-base)] bg-[var(--color-accent-muted)]'
              : '';
            const desktopText = stripLeadingEmoji(act.label);
            const mobileText = stripLeadingEmoji(act.mobileLabel || act.label);
            return (
              <button
                key={act.id}
                type="button"
                title={act.tooltip}
                aria-label={act.ariaLabel || act.tooltip}
                aria-pressed={act.active}
                onClick={act.onClick}
                className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full font-black text-[11px] sm:text-xs shrink-0 whitespace-nowrap transition active:scale-95 cursor-pointer border ${toneClass} ${activeRing}`}
              >
                {act.icon || (
                  <DomSectionIcon
                    iconId={act.iconId || UI_ICON_IDS.ats}
                    className="w-3.5 h-3.5 shrink-0"
                  />
                )}
                <span className="sm:hidden">{mobileText}</span>
                <span className="hidden sm:inline">{desktopText}</span>
              </button>
            );
          })}
        </div>

        {/* ZONA 4: Archivo 📁💾 + Cuenta & Tema 👤 (el cierre de paneles vive en StudioDock) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {false && isPanelOpen && typeof onCloseMobilePanel === 'function' && (
            <button type="button" onClick={onCloseMobilePanel} className="hidden" />
          )}

          {/* MENÚ DE ARCHIVO Y EXPORTACIÓN */}
          <div className="relative" ref={actionMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsActionMenuOpen((prev) => !prev);
                setIsAccountMenuOpen(false);
              }}
              className={`relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full bg-[var(--ui-bg-panel)] hover:bg-[var(--ui-bg-card)] border border-[var(--ui-border)] transition ${elevationSystem.raised} cursor-pointer active:scale-95 text-[var(--ui-text-primary)]`}
              title={backupHealth ? `${t.navbar.actionMenuTitle} · ${backupHealth.tooltip}` : t.navbar.actionMenuTitle}
              aria-label="Archivo y exportación"
            >
              <FolderOpen className="w-4 h-4 text-[var(--color-secondary-bright)] shrink-0" />
              <span className="hidden sm:inline-flex shrink-0">
                <DomSectionIcon
                  iconId={UI_ICON_IDS.guardar}
                  className="w-4 h-4 text-[var(--color-accent-purple-bright)] shrink-0"
                />
              </span>
              {backupHealth && (
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    backupHealth.status === 'ok'
                      ? 'bg-[var(--color-status-success-base)]'
                      : backupHealth.status === 'warning'
                        ? 'bg-[var(--color-status-warning-base)]'
                        : 'bg-[var(--color-status-danger-base)]'
                  }`}
                  aria-label={backupHealth.label}
                />
              )}
            </button>

            {isActionMenuOpen && (
              <div
                className={`absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-64 max-h-[calc(100dvh-4.5rem)] overflow-y-auto rounded-[16px] bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] ${elevationSystem.floating} p-1.5 z-50 space-y-1 animate-fadeIn`}
              >
                {backupHealth && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      backupHealth.onClick?.();
                    }}
                    title={backupHealth.tooltip}
                    className={`w-full text-left px-3 py-2 rounded-[12px] border text-[11px] font-bold flex items-center gap-2 transition cursor-pointer ${
                      backupHealth.status === 'ok'
                        ? 'bg-[var(--color-status-success-muted)] border-[var(--color-status-success-base)]/40 text-[var(--color-status-success-text)]'
                        : backupHealth.status === 'warning'
                          ? 'bg-[var(--color-status-warning-muted)] border-[var(--color-status-warning-base)]/40 text-[var(--color-status-warning-text)]'
                          : 'bg-[var(--color-status-danger-muted)] border-[var(--color-status-danger-base)]/40 text-[var(--color-status-danger-text)]'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        backupHealth.status === 'ok'
                          ? 'bg-[var(--color-status-success-base)]'
                          : backupHealth.status === 'warning'
                            ? 'bg-[var(--color-status-warning-base)]'
                            : 'bg-[var(--color-status-danger-base)]'
                      }`}
                    />
                    <span className="truncate">{backupHealth.label}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    onOpenSavedCVsModal();
                  }}
                  className="w-full text-left px-3 py-2 rounded-[12px] hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4 text-[var(--color-secondary-bright)]" />
                  <span>{t.navbar.openSavedDocument}</span>
                </button>

                <div className="w-full h-px bg-[var(--ui-border)] my-0.5" />

                {isEncryptedVault ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsActionMenuOpen(false);
                        onSaveCVClick();
                      }}
                      disabled={isSaving}
                      className="w-full text-left px-3 py-2 rounded-[12px] hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                    >
                      <DomSectionIcon
                        iconId={UI_ICON_IDS.guardar}
                        className="w-4 h-4 text-[var(--color-accent-purple-bright)]"
                      />
                      <span>{saveActionLabel || (isSaving ? t.navbar.saveChangesSaving : t.navbar.saveChangesOverwrite)}</span>
                    </button>
                    <div className="w-full h-px bg-[var(--ui-border)] my-0.5" />
                  </>
                ) : capabilitiesGate.canSaveLocal(docType) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsActionMenuOpen(false);
                        onSaveCVClick();
                      }}
                      disabled={isSaving}
                      className="w-full text-left px-3 py-2 rounded-[12px] hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                    >
                      <DomSectionIcon
                        iconId={UI_ICON_IDS.guardar}
                        className="w-4 h-4 text-[var(--color-accent-purple-bright)]"
                      />
                      <span>{saveActionLabel || (isSaving ? t.navbar.saveChangesSaving : t.navbar.saveChangesOverwrite)}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsActionMenuOpen(false);
                        onOpenSaveAsModal();
                      }}
                      className="w-full text-left px-3 py-2 rounded-[12px] hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 transition cursor-pointer"
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
                      className="w-full text-left px-3 py-2 rounded-[12px] hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 transition cursor-pointer"
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
                      title={exportOnlyTooltip}
                      className={`${buttonUnavailable} w-full text-left px-3 py-2 text-xs flex items-center gap-2`}
                    >
                      <DomSectionIcon iconId={UI_ICON_IDS.guardar} className="w-4 h-4" />
                      <span>{t.navbar.saveChangesOverwrite}</span>
                    </button>
                    <button
                      type="button"
                      disabled
                      title={exportOnlyTooltip}
                      className={`${buttonUnavailable} w-full text-left px-3 py-2 text-xs flex items-center gap-2`}
                    >
                      <CopyPlus className="w-4 h-4" />
                      <span>{t.navbar.saveCopyAs}</span>
                    </button>
                    <button
                      type="button"
                      disabled
                      title={exportOnlyTooltip}
                      className={`${buttonUnavailable} w-full text-left px-3 py-2 text-xs flex items-center gap-2`}
                    >
                      <FileArchive className="w-4 h-4" />
                      <span>{t.navbar.downloadPortableCopy}</span>
                    </button>
                    <div className="w-full h-px bg-[var(--ui-border)] my-0.5" />
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    setIsUniversalBackupOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-[12px] hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                >
                  <Cloud className="w-4 h-4 text-[var(--color-accent-bright)]" />
                  <span>Abrir / Guardar (PC y Google Drive)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    onPrint();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-[12px] text-xs font-black flex items-center gap-2 transition cursor-pointer ${button.primary}`}
                >
                  <DomSectionIcon iconId={UI_ICON_IDS.exportar} className="w-4 h-4" />
                  <span>{t.navbar.exportPdf}</span>
                </button>
              </div>
            )}
          </div>

          {/* MENÚ UNIFICADO DE CUENTA Y PREFERENCIAS (Créditos + Tema Visual + Compartir + Privacidad) */}
          <div className="relative" ref={accountMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsAccountMenuOpen((prev) => !prev);
                setIsActionMenuOpen(false);
              }}
              className="flex items-center justify-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full border bg-[var(--ui-bg-panel)] border-[var(--color-secondary-base)]/50 text-[var(--ui-text-primary)] hover:bg-[var(--ui-bg-card)] font-black text-xs shrink-0 transition active:scale-95 cursor-pointer"
              title={`Cuenta, créditos y tema (${activeThemeMeta.shortLabel})`}
              aria-label="Cuenta y preferencias"
            >
              <User className="w-4 h-4 shrink-0 text-[var(--color-secondary-bright)]" />
              <span className="hidden sm:inline">
                {user ? (isPro ? 'Ilimitado' : `${pdfTokens} Cr.`) : 'Cuenta'}
              </span>
            </button>

            {isAccountMenuOpen && (
              <div
                className={`absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-64 max-h-[calc(100dvh-4.5rem)] overflow-y-auto rounded-[16px] bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] ${elevationSystem.floating} p-2 z-50 space-y-2 animate-fadeIn`}
              >
                {/* Estado de cuenta / créditos */}
                {typeof onOpenCreditsModal === 'function' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onOpenCreditsModal();
                    }}
                    className="w-full text-left px-3 py-2 rounded-[12px] bg-[var(--ui-bg-card)] hover:bg-[var(--color-accent-muted)] border border-[var(--ui-border)] text-xs font-bold flex items-center justify-between gap-2 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <User className="w-4 h-4 text-[var(--color-secondary-bright)] shrink-0" />
                      <span className="truncate">
                        {user ? (isPro ? 'Plan Ilimitado' : `${pdfTokens} Créditos`) : 'Invitado · Entrar'}
                      </span>
                    </span>
                    <span className="text-[10px] font-black text-[var(--color-accent-text)] shrink-0">
                      Abrir
                    </span>
                  </button>
                ) : (
                  <div
                    className="px-3 py-2 rounded-[12px] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] text-xs font-bold flex items-center gap-2"
                  >
                    <User className="w-4 h-4 text-[var(--color-secondary-bright)] shrink-0" />
                    <span>{user ? (isPro ? 'Plan Ilimitado' : `${pdfTokens} Créditos`) : 'Modo Invitado'}</span>
                  </div>
                )}

                {/* Selector Global de Tema Visual (4 modos fuera de la barra superior) */}
                <div className="space-y-1.5 pt-1 border-t border-[var(--ui-border)]">
                  <div className="px-1 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--ui-text-secondary)]">
                    <Palette className="w-3.5 h-3.5 text-[var(--color-secondary-bright)]" />
                    <span>Tema de la página</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {UI_THEME_CYCLE.map((themeKey) => {
                      const meta = UI_THEME_META[themeKey];
                      const ThemeIcon = meta.icon;
                      const isSelected = normalizedThemeId === themeKey;
                      return (
                        <button
                          key={themeKey}
                          type="button"
                          onClick={() => setGlobalUiTheme(themeKey)}
                          aria-pressed={isSelected}
                          className={`px-2.5 py-1.5 rounded-[10px] border text-xs font-bold flex items-center justify-between gap-1.5 transition cursor-pointer ${
                            isSelected
                              ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]'
                              : 'border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] hover:border-[var(--color-accent-base)]/60'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            <ThemeIcon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{meta.shortLabel}</span>
                          </span>
                          {isSelected && <Check className="w-3 h-3 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="w-full h-px bg-[var(--ui-border)]" />

                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    onOpenShareAppModal();
                  }}
                  className="w-full text-left px-3 py-2 rounded-[12px] hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-[var(--color-secondary-bright)]" />
                  <span>Compartir aplicación</span>
                </button>

                {typeof onOpenPrivacy === 'function' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onOpenPrivacy();
                    }}
                    className="w-full text-left px-3 py-2 rounded-[12px] hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-[var(--color-accent-text)]" />
                    <span>{t.navbar.privacyPolicy}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
    {isUniversalBackupOpen && (
      <Suspense fallback={null}>
        <UniversalBackupModal
          isOpen={isUniversalBackupOpen}
          onClose={() => setIsUniversalBackupOpen(false)}
          docType={docType}
          currentData={currentCvData}
          backupHandlers={driveBackupHandlers}
        />
      </Suspense>
    )}
    </>
  );
}

export default StudioNavbar;
