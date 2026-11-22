import React, { useMemo, useRef } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { DomSectionIcon } from '../pdf-engine/layers/icons/DomSectionIcon';
import { elevationSystem, radius, zIndex } from '../uiDesignSystem';
import { activateSection } from '../sections/sectionActivationEngine';
import { DocumentTypeId } from '../../../types/document';
import {
  DockButtonRole,
  DockTabItem,
  getDockTabsForDocType,
} from './stepSequenceRegistry';

function resolveDockRole(sec: DockTabItem): DockButtonRole {
  if (sec.role) return sec.role;
  if (sec.variant === 'success') return 'catalog';
  if (sec.variant === 'accent') return 'preset';
  if (sec.isCustom || sec.variant === 'custom') return 'custom_record';
  return 'record';
}

type DockVisualGroup = 'config' | 'records' | 'tools';

function resolveDockGroup(role: DockButtonRole): DockVisualGroup {
  if (role === 'catalog' || role === 'preset') return 'config';
  if (role === 'ai_utility' || role === 'handoff') return 'tools';
  return 'records';
}

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
  const role = resolveDockRole(sec);

  if (isDisabled) {
    return `${baseSize} opacity-40 hover:opacity-80 border border-dashed border-[var(--ui-dock-border)] bg-[var(--ui-bg-dock)] text-[var(--ui-dock-text-muted)]`;
  }
  if (role === 'catalog') {
    return `${baseSize} border ${
      isActive
        ? `bg-[var(--color-status-success-base)] border-[var(--color-status-success-base)] text-[var(--color-status-success-on-base)] ${elevationSystem.raised} scale-[1.02]`
        : 'bg-[var(--ui-dock-hover)] border-[var(--color-status-success-base)]/80 text-[var(--color-status-success-bright)] hover:bg-[var(--color-status-success-muted)]'
    }`;
  }
  if (role === 'preset') {
    return `${baseSize} border ${
      isActive
        ? `bg-[var(--color-accent-base)] border-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.floating} scale-[1.02]`
        : 'bg-[var(--color-accent-muted)] border-[var(--color-accent-base)]/45 text-[var(--color-accent-text)] hover:border-[var(--color-accent-base)]'
    }`;
  }
  if (role === 'custom_record') {
    return `${baseSize} border ${
      isActive
        ? `bg-[var(--color-accent-purple)] border-[var(--color-accent-purple)] text-white ${elevationSystem.floating} scale-105`
        : 'bg-[var(--color-accent-purple-light)] border-[var(--color-accent-purple)]/40 text-[var(--color-accent-purple-text)] hover:border-[var(--color-accent-purple)]'
    }`;
  }
  if (role === 'ai_utility') {
    return `${baseSize} border border-dashed ${
      isActive
        ? `bg-[var(--color-accent-purple)] border-[var(--color-accent-purple)] text-white ${elevationSystem.floating} scale-105`
        : 'bg-[var(--color-accent-purple-light)] border-[var(--color-accent-purple)]/60 text-[var(--color-accent-purple-text)] hover:border-[var(--color-accent-purple)]'
    }`;
  }
  if (role === 'handoff') {
    return `${baseSize} border ${
      isActive
        ? `bg-[var(--color-secondary-base)] border-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] ${elevationSystem.floating} scale-105`
        : 'bg-[var(--color-accent-amber-muted)] border-[var(--color-status-warning-base)]/45 text-[var(--color-status-warning-text)] hover:border-[var(--color-status-warning-base)]'
    }`;
  }
  return `${baseSize} border border-transparent ${
    isActive
      ? `bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] ${elevationSystem.floating} scale-105`
      : 'text-[var(--ui-dock-text-muted)] hover:text-[var(--ui-dock-text)] hover:bg-[var(--ui-dock-hover)]'
  }`;
}

function getMobileButtonClasses(sec: DockTabItem, isActive: boolean, isDisabled: boolean): string {
  const baseSize = sec.isLarge ? 'row-span-2 h-full w-[42px]' : 'w-7.5 h-7.5';
  const role = resolveDockRole(sec);

  if (isDisabled) {
    return `${baseSize} opacity-40 border-dashed border-[var(--ui-border)] bg-[var(--ui-bg-dock)] text-[var(--ui-dock-text-muted)]`;
  }
  if (role === 'catalog') {
    return `${baseSize} ${
      isActive
        ? 'bg-[var(--color-status-success-base)] border-[var(--color-status-success-base)] text-[var(--color-status-success-on-base)]'
        : 'bg-[var(--ui-bg-panel)] border-[var(--color-status-success-base)]/40 text-[var(--color-status-success-bright)]'
    }`;
  }
  if (role === 'preset') {
    return `${baseSize} ${
      isActive
        ? `bg-[var(--color-accent-base)] border-[var(--color-accent-base)] text-[var(--color-accent-on-base)] ${elevationSystem.raised}`
        : 'bg-[var(--color-accent-muted)] border-[var(--color-accent-base)]/45 text-[var(--color-accent-text)]'
    }`;
  }
  if (role === 'custom_record' || role === 'ai_utility') {
    return `${baseSize} ${role === 'ai_utility' ? 'border-dashed' : ''} ${
      isActive
        ? `bg-[var(--color-accent-purple)] border-[var(--color-accent-purple)] text-white ${elevationSystem.raised}`
        : 'bg-[var(--color-accent-purple-light)] border-[var(--color-accent-purple)]/45 text-[var(--color-accent-purple-text)]'
    }`;
  }
  if (role === 'handoff') {
    return `${baseSize} ${
      isActive
        ? `bg-[var(--color-secondary-base)] border-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] ${elevationSystem.raised}`
        : 'bg-[var(--color-accent-amber-muted)] border-[var(--color-status-warning-base)]/45 text-[var(--color-status-warning-text)]'
    }`;
  }
  return `${baseSize} ${
    isActive
      ? `bg-[var(--color-secondary-base)] border-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] ${elevationSystem.raised}`
      : 'bg-[var(--ui-bg-panel)] border-[var(--color-secondary-base)]/30 text-[var(--color-secondary-bright)]'
  }`;
}

function getIconStrokeColor(sec: DockTabItem, isActive: boolean, isDisabled: boolean): string {
  if (isDisabled) return 'var(--ui-dock-text-muted)';
  const role = resolveDockRole(sec);
  if (role === 'catalog') {
    return isActive ? 'var(--color-status-success-on-base)' : 'var(--color-status-success-bright)';
  }
  if (role === 'preset') {
    return isActive ? 'var(--color-accent-on-base)' : 'var(--color-accent-text)';
  }
  if (role === 'custom_record' || role === 'ai_utility') {
    return isActive ? 'currentColor' : 'var(--color-accent-purple-text)';
  }
  if (role === 'handoff') {
    return isActive ? 'var(--color-secondary-on-base)' : 'var(--color-status-warning-text)';
  }
  return isActive ? 'var(--color-secondary-on-base)' : 'var(--color-secondary-bright)';
}

function getTooltipColorClass(sec: DockTabItem): string {
  const role = resolveDockRole(sec);
  if (role === 'catalog') {
    return 'bg-[var(--ui-bg-dock)] text-[var(--color-status-success-text)] border-[var(--color-status-success-base)]/30';
  }
  if (role === 'ai_utility') {
    return 'bg-[var(--ui-bg-dock)] text-[var(--color-accent-purple-text)] border-[var(--color-accent-purple)]/30';
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

          {dockTabs.map((sec, idx) => {
            const isActive = activeTab === sec.id && isPanelOpen;
            const isDisabled = sec.isDisabled === true;
            const iconSize = sec.isLarge ? 'w-5 h-5' : 'w-4.5 h-4.5';
            const role = resolveDockRole(sec);
            const prevGroup = idx > 0 ? resolveDockGroup(resolveDockRole(dockTabs[idx - 1])) : null;
            const currentGroup = resolveDockGroup(role);
            const showGroupBreak = sec.groupBreakBefore === true || (prevGroup !== null && prevGroup !== currentGroup);

            return (
              <React.Fragment key={sec.id}>
                {showGroupBreak && (
                  <div
                    className="col-span-2 w-full h-px bg-[var(--ui-dock-separator)] my-0.5"
                    aria-hidden="true"
                  />
                )}
                <button
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
                    {role === 'handoff' && !sec.badgeLabel && sec.stepNumber === undefined && (
                      <ArrowUpRight className="w-2.5 h-2.5 absolute -top-1.5 -right-2 text-current" aria-hidden="true" />
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
                    className={`absolute left-24 text-xs font-bold px-2 py-1 ${elevationSystem.overlay} opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border ${getTooltipColorClass(sec)}`}
                  >
                    {isDisabled ? `${sec.label} (Clic para activar)` : sec.label}
                  </span>
                </button>
              </React.Fragment>
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

        {dockTabs.map((sec, idx) => {
          const isActive = activeTab === sec.id && isPanelOpen;
          const isDisabled = sec.isDisabled === true;
          const iconSize = sec.isLarge ? 'w-5 h-5' : 'w-4 h-4';
          const role = resolveDockRole(sec);
          const prevGroup = idx > 0 ? resolveDockGroup(resolveDockRole(dockTabs[idx - 1])) : null;
          const currentGroup = resolveDockGroup(role);
          const showGroupBreak = sec.groupBreakBefore === true || (prevGroup !== null && prevGroup !== currentGroup);

          return (
            <React.Fragment key={sec.id}>
              {showGroupBreak && (
                <div
                  className="row-span-2 w-px h-12 bg-[var(--ui-dock-separator)] mx-0.5 self-center shrink-0"
                  aria-hidden="true"
                />
              )}
              <button
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
                  {role === 'handoff' && !sec.badgeLabel && sec.stepNumber === undefined && (
                    <ArrowUpRight className="w-2.5 h-2.5 absolute -top-1 -right-1.5 text-current" aria-hidden="true" />
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
            </React.Fragment>
          );
        })}
      </nav>
    </>
  );
}

export default StudioDock;
