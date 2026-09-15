/**
 * NÚCLEO — ALMACÉN AISLADO DE PESTAÑAS DE SESIÓN (tabStore.ts)
 *
 * Mantiene la lista liviana de pestañas abiertas en la sesión del espacio de trabajo.
 * Es un almacén puramente de UI-state sin efectos secundarios de guardado o persistencia pesada.
 */

import { getDefaultTitleForDocType } from '../capabilities/capabilityRegistry';

export interface OpenTab {
  id: string;
  docType: 'cv' | 'business_card' | 'book' | 'cover_letter';
  title: string;
  versionLabel?: string;
  isDirty?: boolean;
}

const STORAGE_KEY = 'cv_open_tabs';
const ACTIVE_KEY = 'workspace_active_tab';
export const TABS_CHANGED_EVENT = 'leecv-tabs-changed';

function notifyTabsChanged(tabs: OpenTab[]): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(TABS_CHANGED_EVENT, { detail: tabs }));
  }
}

export function getOpenTabs(): OpenTab[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((t: any) => ({
      id: t.id || t.cvId,
      docType: t.docType || 'cv',
      title: t.title || getDefaultTitleForDocType(t.docType || 'cv'),
      versionLabel: t.versionLabel,
      isDirty: Boolean(t.isDirty)
    }));
  } catch (err) {
    console.warn('Error leyendo cv_open_tabs:', err);
    return [];
  }
}

function persist(tabs: OpenTab[]): void {
  if (typeof window === 'undefined') return;
  try {
    const toSave = tabs.map(t => ({ ...t, cvId: t.id }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.warn('Error guardando cv_open_tabs:', err);
  }
  notifyTabsChanged(tabs);
}

export function openTab(
  id: string,
  docType: OpenTab['docType'] = 'cv',
  title?: string,
  versionLabel?: string
): OpenTab[] {
  if (!id) return getOpenTabs();
  const current = getOpenTabs();
  const existingIdx = current.findIndex(t => t.id === id);
  const cleanTitle = title || getDefaultTitleForDocType(docType);

  if (existingIdx >= 0) {
    current[existingIdx] = {
      ...current[existingIdx],
      docType: docType || current[existingIdx].docType || 'cv',
      title: cleanTitle || current[existingIdx].title,
      versionLabel: versionLabel !== undefined ? versionLabel : current[existingIdx].versionLabel
    };
  } else {
    current.push({
      id,
      docType: docType || 'cv',
      title: cleanTitle,
      versionLabel,
      isDirty: false
    });
  }

  persist(current);
  return current;
}

export function closeTab(id: string): OpenTab[] {
  if (!id) return getOpenTabs();
  const remaining = getOpenTabs().filter(t => t.id !== id);
  persist(remaining);
  return remaining;
}

export function setTabDirty(id: string, isDirty: boolean): OpenTab[] {
  const current = getOpenTabs();
  const idx = current.findIndex(t => t.id === id);
  if (idx >= 0) {
    current[idx] = { ...current[idx], isDirty };
    persist(current);
  }
  return current;
}

export function getActiveTabId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_KEY) || null;
}

export function setActiveTabId(id: string | null): void {
  if (typeof window === 'undefined') return;
  if (id) {
    localStorage.setItem(ACTIVE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

export function onTabsChanged(listener: (tabs: OpenTab[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => listener(getOpenTabs());
  window.addEventListener(TABS_CHANGED_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(TABS_CHANGED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
