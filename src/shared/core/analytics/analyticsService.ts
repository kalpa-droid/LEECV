import { env } from '../config/env';

/**
 * Servicio de Analítica Ligero para LEECV
 * Soporta Google Analytics 4 (GA4) y PostHog.
 * Se activa ÚNICAMENTE si existe consentimiento explícito del usuario ('leecv_cookie_consent' === 'granted').
 */

export interface AnalyticsEventParams {
  category?: string;
  label?: string;
  value?: number;
  [key: string]: any;
}

const CONSENT_KEY = 'leecv_cookie_consent';

export function isConsentGranted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(CONSENT_KEY) === 'granted';
}

export function setConsentStatus(granted: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONSENT_KEY, granted ? 'granted' : 'denied');
  if (granted) {
    initAnalytics();
  }
}

export function initAnalytics(): void {
  if (typeof window === 'undefined' || !isConsentGranted()) return;

  const gaId = env.GA_MEASUREMENT_ID;
  if (gaId && !document.getElementById('ga-gtag-script')) {
    const script = document.createElement('script');
    script.id = 'ga-gtag-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);

    const inlineScript = document.createElement('script');
    inlineScript.id = 'ga-gtag-init';
    inlineScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}', { send_page_view: false });
    `;
    document.head.appendChild(inlineScript);
  }

  const posthogKey = env.POSTHOG_KEY;
  const posthogHost = env.POSTHOG_HOST;
  if (posthogKey && !document.getElementById('posthog-js-script')) {
    const phScript = document.createElement('script');
    phScript.id = 'posthog-js-script';
    phScript.async = true;
    phScript.src = `${posthogHost}/static/array.js`;
    document.head.appendChild(phScript);
    (window as any).posthog = (window as any).posthog || [];
    (window as any).posthog.init && (window as any).posthog.init(posthogKey, { api_host: posthogHost, capture_pageview: false });
  }
}

export function trackPageView(path: string, title?: string): void {
  if (!isConsentGranted() || typeof window === 'undefined') return;

  const gaId = env.GA_MEASUREMENT_ID;
  if (gaId && typeof (window as any).gtag === 'function') {
    (window as any).gtag('event', 'page_view', {
      page_path: path,
      page_title: title || document.title,
    });
  }

  if (typeof (window as any).posthog?.capture === 'function') {
    (window as any).posthog.capture('$pageview', {
      $current_url: window.location.href,
      $pathname: path,
      title: title || document.title,
    });
  }
}

export function trackEvent(eventName: string, params: AnalyticsEventParams = {}): void {
  if (!isConsentGranted() || typeof window === 'undefined') return;

  const gaId = env.GA_MEASUREMENT_ID;
  if (gaId && typeof (window as any).gtag === 'function') {
    (window as any).gtag('event', eventName, params);
  }

  if (typeof (window as any).posthog?.capture === 'function') {
    (window as any).posthog.capture(eventName, params);
  }
}
