import React, { useMemo, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { DomSectionIcon } from '../pdf-engine/layers/icons/DomSectionIcon';
import { elevationSystem, radius, zIndex } from '../uiDesignSystem';
import { activateSection } from '../sections/sectionActivationEngine';
import { DocumentTypeId } from '../../../types/document';
import { DockTabItem, getDockTabsForDocType } from './stepSequenceRegistry';

export interface StudioDockProps {
  cvData?: any;
  setCvData?: React.Dispatch<React.SetStateAction<any>>;
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean) => void;
  onOpenAtsCheck?: () => void;
  docType?: DocumentTypeId;
  bookMode?: string;
  /** Lista explícita opcional de pasos (omite consulta al registro si se provee). */
  tabs?: DockTabItem[];
}

function getDesktopButtonClasses(sec: DockTabItem, isActive: boolean, isDisabled: boolean): string {
  const baseSize = sec.isLarge ? 'col-span-2 w-full h-10' : 'w-9 h-9';

  if (isDisabled) {
    return `${baseSize} opacity-40 hover:opacity-80 border border-dashed border-[var(--ui-dock-border)] bg-transparent`;
  }
  if (sec.variant === 'success') {
    return `${baseSize} border ${
      isActive
        ? `bg-[var(--color-status-success-base)] border-[var(--color-status-success-base)] text-[var(--color-status-success-on-base)] ${elevationSystem.raised} scale-[1.02]`
        : 'bg-[var(--ui-dock-hover)] border-[var(--color-status-success-base)]/80 text-[var(--color-status-success-bright)] hover:bg-[var(--color-status-success-muted)]'
    }`;
  }
  if (sec.variant === 'accent') {
    return `${baseSize} border ${
      isActive
        ? `bg-[var(--color-accent-base)] border-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.floating} scale-[1.02]`
        : 'bg-[var(--ui-dock-hover)] border-[var(--ui-dock-border)] text-[var(--color-secondary-bright)] hover:text-[var(--ui-dock-text)] hover:bg-[var(--ui-dock-hover)]'
    }`;
  }
  if (sec.isCustom || sec.variant === 'custom') {
    return `${baseSize} ${
      isActive
        ? `bg-[var(--color-accent-purple)] text-white ${elevationSystem.floating} scale-105`
        : 'bg-[var(--ui-dock-hover)] text-[var(--color-secondary-bright)] border border-[var(--color-secondary-base)]/40 hover:bg-[var(--color-secondary-muted)]'
    }`;
  }
  return `${baseSize} ${
    isActive
      ? `bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] ${elevationSystem.floating} scale-105`
      : 'text-[var(--ui-dock-text-muted)] hover:text-[var(--ui-dock-text)] hover:bg-[var(--ui-dock-hover)]'
  }`;
}

function getMobileButtonClasses(sec: DockTabItem, isActive: boolean, isDisabled: boolean): string {
  const baseSize = sec.isLarge ? 'row-span-2 h-full w-[42px]' : 'w-7.5 h-7.5';

  if (isDisabled) {
    return `${baseSize} opacity-40 border-dashed border-[var(--ui-border)] bg-transparent`;
  }
  if (sec.variant === 'success') {
    return `${baseSize} ${
      isActive
        ? 'bg-[var(--color-status-success-base)] border-[var(--color-status-success-base)] text-[var(--color-status-success-on-base)]'
        : 'bg-[var(--ui-bg-panel)] border-[var(--color-status-success-base)]/40 text-[var(--color-status-success-bright)]'
    }`;
  }
  if (sec.variant === 'accent') {
    return `${baseSize} ${
      isActive
        ? `bg-[var(--color-accent-base)] border-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.raised}`
        : 'bg-[var(--ui-bg-panel)] border-[var(--ui-border)] text-[var(--ui-dock-text-muted)]'
    }`;
  }
  if (sec.isCustom || sec.variant === 'custom') {
    return `${baseSize} ${
      isActive
        ? `bg-[var(--color-accent-purple)] text-white ${elevationSystem.raised}`
        : 'bg-[var(--ui-bg-panel)] text-[var(--color-accent-purple-bright)] border-[var(--color-accent-purple)]/30'
    }`;
  }
  return `${baseSize} ${
    isActive
      ? `bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] ${elevationSystem.raised}`
      : 'bg-[var(--ui-bg-panel)] text-[var(--color-secondary-bright)] border-[var(--color-secondary-base)]/30'
  }`;
}

function getIconStrokeColor(sec: DockTabItem, isActive: boolean, isDisabled: boolean): string {
  if (isDisabled) return 'var(--ui-dock-text-muted)';
  if (sec.variant === 'accent') {
    return isActive ? 'var(--color-accent-on-base)' : 'var(--color-secondary-bright)';
  }
  if (sec.isCustom || sec.variant === 'custom') {
    return isActive ? 'currentColor' : 'var(--color-secondary-bright)';
  }
  return isActive ? 'var(--color-secondary-on-base)' : 'var(--color-secondary-bright)';
}

function getTooltipColorClass(variant?: DockTabItem['variant']): string {
  if (variant === 'success') {
    return 'bg-[var(--ui-bg-dock)] text-[var(--color-status-success-text)] border-[var(--color-status-success-base)]/30';
  }
  return 'bg-[var(--ui-bg-dock)] text-[var(--ui-dock-text)] border-[var(--ui-dock-border)]';
}

function renderDockIcon(
  sec: DockTabItem,
  isActive: boolean,
  isDisabled: boolean,
  sizeClass: string,
) {
  if (sec.icon) {
    const IconComponent = sec.icon;
    return <IconComponent className={`${sizeClass} text-current`} />;
  }
  return (
    <DomSectionIcon
      iconId={sec.iconId || sec.id}
      className={sizeClass}
      color={getIconStrokeColor(sec, isActive, isDisabled)}
    />
  );
}

export function StudioDock({
  cvData,
  setCvData,
  activeTab,
  setActiveTab,
  isPanelOpen,
  setIsPanelOpen,
  docType = 'cv',
  bookMode,
  tabs,
}: StudioDockProps) {
  const mobileNavRef = useRef<HTMLDivElement>(null);

  const dockTabs = useMemo(
    () => tabs ?? getDockTabsForDocType(docType, { cvData, bookMode }),
    [tabs, docType, cvData, bookMode],
  );

  const handleTabClick = (tabId: string, isDisabled?: boolean) => {
    if (isDisabled && cvData && setCvData) {
      const { updatedCvData } = activateSection(cvData, tabId);
      setCvData(updatedCvData);
    }

    if (activeTab === tabId && isPanelOpen && !isDisabled) {
      setIsPanelOpen(false);
    } else {
      setActiveTab(tabId);
      setIsPanelOpen(true);
    }

    window.dispatchEvent(new CustomEvent('pdf-anchor-scroll', { detail: { tabId } }));
  };

  return (
    <>
      {/* Desktop & Tablet Vertical Left Dock (2 Columnas, Width: 96px / w-24) */}
      <aside
        onWheel={(e) => {
          e.currentTarget.scrollTop += e.deltaY;
        }}
        className="hidden md:flex flex-col items-center py-2 bg-[var(--ui-bg-dock)] border-r border-[var(--ui-dock-border)] text-[var(--ui-dock-text)] z-[100] select-none w-24 shrink-0 fixed top-0 bottom-0 left-0 h-screen overflow-y-auto no-scrollbar shadow-[var(--shadow-dock)] px-1.5"
      >
        <div className="grid grid-cols-2 gap-1.5 w-full items-center justify-items-center">
          {/* Botón Menú (col-span-2) */}
          <button
            type="button"
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            style={{ borderRadius: radius.modal }}
            className={`col-span-2 w-full h-10 flex items-center justify-center transition group relative cursor-pointer active:scale-95 ${
              isPanelOpen
                ? `bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.floating}`
                : 'bg-[var(--ui-dock-hover)] text-[var(--ui-dock-text-muted)] hover:text-[var(--ui-dock-text)] border border-[var(--ui-dock-border)]'
            }`}
            title={isPanelOpen ? 'Cerrar Panel Editor' : 'Abrir Panel Editor'}
          >
            {isPanelOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            <span
              style={{ borderRadius: radius.control }}
              className={`absolute left-24 bg-[var(--ui-bg-dock)] text-[var(--ui-dock-text)] text-xs font-bold px-2 py-1 ${elevationSystem.overlay} opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-[var(--ui-dock-border)]`}
            >
              {isPanelOpen ? 'Cerrar Panel' : 'Abrir Panel'}
            </span>
          </button>

          {dockTabs.map((sec) => {
            const isActive = activeTab === sec.id && isPanelOpen;
            const isDisabled = sec.isDisabled === true;
            const iconSize = sec.isLarge ? 'w-5 h-5' : 'w-4.5 h-4.5';

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => handleTabClick(sec.id, isDisabled)}
                style={{ borderRadius: radius.modal }}
                className={`flex items-center justify-center transition group relative cursor-pointer ${getDesktopButtonClasses(sec, isActive, isDisabled)}`}
                title={isDisabled ? `${sec.label} (Desactivada - Clic para Activar)` : sec.label}
              >
                <div className="relative flex items-center justify-center">
                  {renderDockIcon(sec, isActive, isDisabled, iconSize)}
                  {(sec.badgeLabel !== undefined || sec.stepNumber !== undefined) && (
                    <span
                      className={`absolute -top-2.5 -right-3 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center border leading-none ${
                        isActive
                          ? 'bg-[var(--color-accent-on-base)] text-[var(--color-accent-base)] border-[var(--color-accent-base)]'
                          : 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] border-[var(--ui-bg-dock)]'
                      }`}
                    >
                      {sec.badgeLabel ?? sec.stepNumber}
                    </span>
                  )}
                </div>

                {sec.hasContent && !isDisabled && (
                  <span
                    className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-[var(--color-status-success-bright)] border border-[var(--ui-bg-dock)]"
                    title="Sección con datos cargados"
                  />
                )}
                {isDisabled && (
                  <span
                    className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[var(--color-status-warning-text)] border border-[var(--ui-bg-dock)]"
                    title="Desactivada"
                  />
                )}
                <span
                  style={{ borderRadius: radius.control }}
                  className={`absolute left-24 text-xs font-bold px-2 py-1 ${elevationSystem.overlay} opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border ${getTooltipColorClass(sec.variant)}`}
                >
                  {isDisabled ? `${sec.label} (Clic para activar)` : sec.label}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Mobile Bottom Dock Bar (< 768px): 2 Filas Horizontales con Flujo Grid (Height: 76px) */}
      <nav
        ref={mobileNavRef}
        onWheel={(e) => {
          if (e.currentTarget) {
            e.currentTarget.scrollLeft += e.deltaY || e.deltaX;
          }
        }}
        className={`md:hidden fixed bottom-0 left-0 right-0 bg-[var(--ui-bg-dock)] border-t border-[var(--ui-dock-border)] p-1 grid grid-rows-2 grid-flow-col gap-1 overflow-x-auto no-scrollbar ${elevationSystem.overlay} select-none h-[76px] items-center`}
        style={{ zIndex: zIndex.dock }}
      >
        {/* Botón Menú (row-span-2) */}
        <button
          type="button"
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          style={{ borderRadius: '8px' }}
          className={`row-span-2 h-full w-[42px] flex items-center justify-center shrink-0 transition cursor-pointer active:scale-95 border ${
            isPanelOpen
              ? `bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] border-[var(--color-accent-base)] ${elevationSystem.raised}`
              : 'bg-[var(--ui-bg-panel)] text-[var(--ui-dock-text-muted)] border-[var(--ui-border)]'
          }`}
          title={isPanelOpen ? 'Cerrar Panel' : 'Abrir Panel'}
        >
          {isPanelOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {dockTabs.map((sec) => {
          const isActive = activeTab === sec.id && isPanelOpen;
          const isDisabled = sec.isDisabled === true;
          const iconSize = sec.isLarge ? 'w-5 h-5' : 'w-4 h-4';

          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => handleTabClick(sec.id, isDisabled)}
              style={{ borderRadius: sec.isLarge ? '8px' : '6px' }}
              className={`flex items-center justify-center shrink-0 transition cursor-pointer border relative ${getMobileButtonClasses(sec, isActive, isDisabled)}`}
              title={isDisabled ? `${sec.label} (Desactivada - Clic para Activar)` : sec.label}
            >
              <div className="relative flex items-center justify-center">
                {renderDockIcon(sec, isActive, isDisabled, iconSize)}
                {(sec.badgeLabel !== undefined || sec.stepNumber !== undefined) && (
                  <span
                    className={`absolute -top-2.5 -right-3 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center border leading-none ${
                      isActive
                        ? 'bg-[var(--color-accent-on-base)] text-[var(--color-accent-base)] border-[var(--color-accent-base)]'
                        : 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] border-[var(--ui-bg-dock)]'
                    }`}
                  >
                    {sec.badgeLabel ?? sec.stepNumber}
                  </span>
                )}
              </div>

              {sec.hasContent && !isDisabled && (
                <span
                  className="absolute top-0 left-0 w-1.5 h-1.5 rounded-full bg-[var(--color-status-success-bright)]"
                  title="Sección con datos cargados"
                />
              )}
              {isDisabled && (
                <span
                  className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-[var(--color-status-warning-text)]"
                  title="Desactivada"
                />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}

export default StudioDock;
