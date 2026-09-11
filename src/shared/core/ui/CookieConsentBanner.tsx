import React, { useState, useEffect } from 'react';
import { Shield, Check, X } from 'lucide-react';
import { setConsentStatus } from '../analytics/analyticsService';
import { button } from '../uiDesignSystem';

const CONSENT_KEY = 'leecv_cookie_consent';

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    } else if (consent === 'granted') {
      setConsentStatus(true);
    }
  }, []);

  if (!isVisible) return null;

  const handleAccept = () => {
    setConsentStatus(true);
    setIsVisible(false);
  };

  const handleDecline = () => {
    setConsentStatus(false);
    setIsVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Consentimiento de cookies"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-[var(--ui-bg-panel)] backdrop-blur-md border border-[var(--color-neutral-border)] shadow-2xl rounded-2xl p-4 text-[var(--color-neutral-text-primary)]">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] shrink-0 mt-0.5">
            <Shield className="w-5 h-5" />
          </div>

          <div className="flex-1 text-sm">
            <h4 className="font-semibold text-[var(--color-neutral-text-primary)] text-base leading-tight mb-1">
              Respetamos tu Privacidad
            </h4>
            <p className="text-[var(--color-neutral-text-secondary)] leading-relaxed text-xs">
              Usamos cookies mínimas y anónimas para optimizar tu experiencia y medir el rendimiento del generador.
              Tus datos personales y currículums son 100% privados y vectoriales.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleAccept}
                className={`${button.primary} text-xs py-1.5 px-3.5 flex items-center gap-1.5`}
              >
                <Check className="w-3.5 h-3.5" />
                Aceptar
              </button>
              <button
                type="button"
                onClick={handleDecline}
                className={`${button.ghost} text-xs py-1.5 px-3.5 flex items-center gap-1.5`}
              >
                <X className="w-3.5 h-3.5" />
                Solo esenciales
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
