import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone, Sparkles, CheckCircle2 } from 'lucide-react';
import { elevationSystem, radius } from '../uiDesignSystem';
import { useToast } from './Toast';
import { t } from '../../i18n/useText';

const STORAGE_KEY_INSTALLED = 'leecv_pwa_installed';
const STORAGE_KEY_DISMISSED = 'leecv_pwa_dismissed';

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { showInfo } = useToast();

  useEffect(() => {
    // 1. Si la aplicación ya se ejecuta en modo PWA nativo (standalone), no mostrar
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // 2. Si el usuario ya la instaló o eligió "No volver a preguntar", no mostrar
    const isInstalled = localStorage.getItem(STORAGE_KEY_INSTALLED) === 'true';
    const isDismissed = localStorage.getItem(STORAGE_KEY_DISMISSED) === 'true';

    if (isInstalled || isDismissed) {
      return;
    }

    // 3. Escuchar el evento oficial del navegador para la instalación PWA
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      localStorage.setItem(STORAGE_KEY_INSTALLED, 'true');
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback para navegadores que no soportan prompt programático (ej. iOS Safari)
      showInfo(t.banners.pwaInstall.iosInstruction);
      localStorage.setItem(STORAGE_KEY_INSTALLED, 'true');
      setIsVisible(false);
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      localStorage.setItem(STORAGE_KEY_INSTALLED, 'true');
    } else {
      // Si el usuario rechazó el prompt nativo, recordamos la decisión para no abrumarlo
      localStorage.setItem(STORAGE_KEY_DISMISSED, 'true');
    }

    setIsVisible(false);
    setDeferredPrompt(null);
  };

  const handleDismissClick = () => {
    localStorage.setItem(STORAGE_KEY_DISMISSED, 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside 
      aria-label={t.banners.pwaInstall.ariaLabel}
      className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-[var(--ui-bg-panel)] border-2 border-[var(--color-accent-purple-bright)]/40 text-[var(--ui-text-primary)] p-4 rounded-[${radius.modal}] ${elevationSystem.floating} backdrop-blur-xl animate-fadeIn`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-[${radius.card}] bg-[var(--color-primary-base)] flex items-center justify-center text-[var(--color-primary-on-base)] shrink-0 ${elevationSystem.raised}`}>
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-black tracking-tight text-[var(--ui-text-primary)]">
                {t.banners.pwaInstall.title}
              </h3>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)]">
                {t.banners.pwaInstall.badge}
              </span>
            </div>
            <p className="text-[10px] text-[var(--ui-text-secondary)] font-medium leading-tight">
              {t.banners.pwaInstall.sub}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismissClick}
          className="p-1 text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] rounded-full hover:bg-[var(--ui-bg-card)] transition cursor-pointer"
          title={t.banners.pwaInstall.dontAskTitle}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <ul className="text-[10px] text-[var(--ui-text-secondary)] space-y-1 mb-3 ml-1">
        <li className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-status-success-bright)] shrink-0" />
          <span>{t.banners.pwaInstall.feature1}</span>
        </li>
        <li className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-status-success-bright)] shrink-0" />
          <span>{t.banners.pwaInstall.feature2}</span>
        </li>
      </ul>

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--ui-border)]">
        <button
          type="button"
          onClick={handleDismissClick}
          className="px-3 py-1.5 text-[11px] font-bold text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] rounded-full hover:bg-[var(--ui-bg-card)] transition cursor-pointer"
        >
          {t.banners.pwaInstall.dismissBtn}
        </button>

        <button
          type="button"
          onClick={handleInstallClick}
          className={`px-4 py-1.5 bg-[var(--color-secondary-base)] hover:opacity-90 text-[var(--color-secondary-on-base)] font-black text-xs rounded-full transition cursor-pointer flex items-center gap-1.5 ${elevationSystem.raised} active:scale-95`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>{t.banners.pwaInstall.installBtn}</span>
        </button>
      </div>
    </aside>
  );
}
