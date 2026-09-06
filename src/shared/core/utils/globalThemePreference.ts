import { applyUiTheme, getNextUiTheme } from '../uiDesignSystem';

const KEY = 'leecv_ui_theme_global';

export function getGlobalUiTheme(): string {
  if (typeof window === 'undefined') return 'day';
  return localStorage.getItem(KEY) || 'day';
}

export function setGlobalUiTheme(themeId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(KEY, themeId);
  }
  applyUiTheme(themeId);
}

export function initGlobalUiTheme(): string {
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
