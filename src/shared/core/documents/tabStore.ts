/**
 * NÚCLEO — ALMACÉN AISLADO DE PESTAÑAS DE SESIÓN (tabStore.ts)
 *
 * Mantiene la lista liviana de pestañas abiertas en la sesión del espacio de trabajo.
 * Es un almacén puramente de UI-state sin efectos secundarios de guardado o persistencia pesada.
 */

import { getDefaultTitleForDocType } from '../capabilities/capabilityRegistry';
import { DRAFT_CV_ID, DRAFT_CARD_ID } from './documentLifecycleEngine';

export interface OpenTab {
  id: string;
  cvId?: string;
  docType: 'cv' | 'business_card' | 'book' | 'cover_letter';
  title: string;
  versionLabel?: string;
  isDirty?: boolean;
}

const STORAGE_KEY = 'cv_open_tabs';
const ACTIVE_KEY = 'workspace_active_tab';
const MAX_TABS = 6;
export const TABS_CHANGED_EVENT = 'leecv-tabs-changed';

function notifyTabsChanged(tabs: OpenTab[]): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(TABS_CHANGED_EVENT, { detail: tabs }));
  }
}

/**
 * Sanea y purga pestañas duplicadas o huérfanas acumuladas por errores de sesión.
 */
function sanitizeTabList(rawList: any[]): OpenTab[] {
  if (!Array.isArray(rawList)) return [];
  const seenIds = new Set<string>();
  const clean: OpenTab[] = [];

  for (const t of rawList) {
    const id = t.id || t.cvId;
    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);

    clean.push({
      id,
      cvId: id,
      docType: t.docType || 'cv',
      title: t.title || getDefaultTitleForDocType(t.docType || 'cv'),
      versionLabel: t.versionLabel,
      isDirty: Boolean(t.isDirty)
    });
  }

  // Si se acumuló una avalancha de pestañas en sesiones anteriores, conservar como máximo MAX_TABS
  if (clean.length > MAX_TABS) {
    const activeId = getActiveTabId();
    const activeTab = clean.find(t => t.id === activeId);
    const others = clean.filter(t => t.id !== activeId);
    const trimmed = others.slice(- (MAX_TABS - 1));
    return activeTab ? [...trimmed, activeTab] : clean.slice(-MAX_TABS);
  }

  return clean;
}

export function getOpenTabs(): OpenTab[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const sanitized = sanitizeTabList(parsed);
    // Si la lista sanitizada difiere en cantidad de la original, guardar la versión limpia
    if (parsed.length !== sanitized.length) {
      persist(sanitized);
    }
    return sanitized;
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
    // Si excede el límite máximo de pestañas, descartar la más antigua no sucia
    if (current.length >= MAX_TABS) {
      const dropIndex = current.findIndex(t => !t.isDirty && t.id !== id);
      if (dropIndex >= 0) {
        current.splice(dropIndex, 1);
      } else {
        current.shift();
      }
    }

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

export function updateTabTitle(id: string, title: string, versionLabel?: string): OpenTab[] {
  if (!id || !title) return getOpenTabs();
  const current = getOpenTabs();
  const idx = current.findIndex(t => t.id === id);
  if (idx >= 0) {
    const updated = {
      ...current[idx],
      title,
      ...(versionLabel !== undefined ? { versionLabel } : {})
    };
    if (current[idx].title !== title || current[idx].versionLabel !== versionLabel) {
      current[idx] = updated;
      persist(current);
    }
  }
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

export function generateDocumentId(prefix: 'cv' | 'book' | 'card' | 'cover_letter' = 'cv'): string {
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  return `${prefix}_${uuid}`;
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
