import { applyUiTheme, getNextUiTheme } from '../uiDesignSystem';

const KEY = 'leecv_ui_theme_global';
const LEGACY_KEY = 'cv_ui_theme_preference';

const listeners = new Set<(theme: string) => void>();

let storageListenerInitialized = false;

function initStorageListener() {
  if (storageListenerInitialized || typeof window === 'undefined') return;
  storageListenerInitialized = true;

  window.addEventListener('storage', (e) => {
    if (e.key === KEY || e.key === LEGACY_KEY) {
      const theme = getGlobalUiTheme();
      applyUiTheme(theme);
      listeners.forEach((fn) => fn(theme));
    }
  });
}

export function getGlobalUiTheme(): string {
  if (typeof window === 'undefined') return 'day';
  const val = localStorage.getItem(KEY);
  if (val) return val;
  const legacyVal = localStorage.getItem(LEGACY_KEY);
  if (legacyVal) {
    localStorage.setItem(KEY, legacyVal);
    return legacyVal;
  }
  return 'day';
}

export function setGlobalUiTheme(themeId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(KEY, themeId);
    localStorage.setItem(LEGACY_KEY, themeId);
  }
  applyUiTheme(themeId);
  listeners.forEach((fn) => fn(themeId));
}

export function initGlobalUiTheme(): string {
  initStorageListener();
  const current = getGlobalUiTheme();
  applyUiTheme(current);
  return current;
}

export function cycleGlobalUiTheme(): string {
  const current = getGlobalUiTheme();
  const next = getNextUiTheme(current);
  setGlobalUiTheme(next);
  return next;
}

export function subscribeToGlobalUiTheme(listener: (theme: string) => void): () => void {
  initStorageListener();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

