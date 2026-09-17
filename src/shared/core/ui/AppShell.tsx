import React from 'react';
import { DocumentTabsBar, DocumentTabsBarProps } from './DocumentTabsBar';
import { PwaInstallBanner } from './PwaInstallBanner';
import { elevationSystem } from '../uiDesignSystem';

export interface AppShellProps {
  docType?: 'cv' | 'business_card' | 'book' | 'cover_letter';
  navbarSlot: React.ReactNode;
  dockSlot: React.ReactNode;
  panelSlot: React.ReactNode;
  mainSlot: React.ReactNode;
  tabsBarProps: DocumentTabsBarProps;
  bannerSlot?: React.ReactNode;
  isPanelOpen?: boolean;
  mobileTabState?: string;
  modalsSlot?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  docType = 'cv',
  navbarSlot,
  dockSlot,
  panelSlot,
  mainSlot,
  tabsBarProps,
  bannerSlot = null,
  isPanelOpen = true,
  mobileTabState = 'editor',
  modalsSlot = null,
}) => {
  return (
    <div className="h-screen h-[100dvh] bg-[var(--color-neutral-text-primary)] text-white flex flex-col font-sans overflow-hidden selection:bg-[var(--color-accent-base)] selection:text-white relative">
      <div className="md:pl-24">
        {bannerSlot}
        {navbarSlot}
      </div>

      <main className="flex-1 flex overflow-hidden relative min-h-0 md:pl-24">
        {dockSlot}

        <div 
          className={`bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] transition-all duration-300 ease-in-out border-r border-[var(--ui-border)] z-20 flex flex-col h-full overflow-y-auto ${
            isPanelOpen 
              ? `w-full md:w-[460px] lg:w-[500px] opacity-100 ${elevationSystem.floating}` 
              : 'w-0 opacity-0 overflow-hidden hidden md:block'
          } ${mobileTabState === 'preview' ? 'hidden md:flex' : 'flex'}`}
        >
          {panelSlot}
        </div>

        <div 
          id="preview-viewport-container"
          className={`flex-1 bg-[var(--ui-preview-bg)] h-full overflow-auto p-2 sm:p-4 justify-center items-start relative touch-pan-x touch-pan-y overscroll-contain ${
            mobileTabState === 'editor' && isPanelOpen ? 'hidden md:flex' : 'flex'
          }`}
        >
          {mainSlot}
        </div>
      </main>

      <div className="hidden md:block w-full shrink-0">
        <DocumentTabsBar {...tabsBarProps} docType={docType} />
      </div>

      {modalsSlot}

      {/* Banner de Instalación PWA con Persistencia */}
      <PwaInstallBanner />
    </div>
  );
};
