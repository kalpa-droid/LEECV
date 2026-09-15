/**
 * NÚCLEO — CAPA DE COMPATIBILIDAD DE PESTAÑAS (documentTabEngine.ts)
 *
 * Mantiene la interfaz pública legacy consumida por componentes de UI
 * mientras delega internamente a `tabStore.ts`.
 */

import * as TabStore from '../documents/tabStore';
import { getDefaultTitleForDocType } from '../capabilities/capabilityRegistry';

export interface OpenTabItem {
  cvId: string;
  title: string;
  versionLabel?: string;
  isDirty?: boolean;
  docType?: 'cv' | 'business_card' | 'book' | 'cover_letter';
}

export const TABS_CHANGED_EVENT = TabStore.TABS_CHANGED_EVENT;

export function getOpenTabs(): OpenTabItem[] {
  return TabStore.getOpenTabs().map(t => ({
    cvId: t.id,
    title: t.title,
    versionLabel: t.versionLabel,
    isDirty: t.isDirty,
    docType: t.docType
  }));
}

export function saveOpenTabs(tabs: OpenTabItem[]): void {
  // Mantiene compatibilidad con guardados directos de listas de pestañas
  tabs.forEach(t => {
    TabStore.openTab(t.cvId, t.docType || 'cv', t.title, t.versionLabel);
  });
}

export function addOpenTab(
  cvId: string,
  title: string,
  versionLabel?: string,
  docType: 'cv' | 'business_card' | 'book' | 'cover_letter' = 'cv'
): OpenTabItem[] {
  TabStore.openTab(cvId, docType, title, versionLabel);
  return getOpenTabs();
}

export function removeOpenTab(cvId: string): OpenTabItem[] {
  TabStore.closeTab(cvId);
  return getOpenTabs();
}

export function syncTabTitleFromSave(
  cvId: string,
  newTitle: string,
  docType: 'cv' | 'business_card' | 'book' | 'cover_letter' = 'cv'
): OpenTabItem[] {
  TabStore.openTab(cvId, docType, newTitle);
  return getOpenTabs();
}

export function generateDocumentId(prefix: 'cv' | 'book' | 'card' | 'cover_letter' = 'cv'): string {
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  return `${prefix}_${uuid}`;
}

export async function closeDocumentEverywhere(
  cvId: string,
  opts: {
    alsoDeleteFromStorage?: boolean;
    deleteCVById?: (id: string) => Promise<void>;
  } = {}
): Promise<OpenTabItem[]> {
  const remaining = removeOpenTab(cvId);
  if (opts.alsoDeleteFromStorage && opts.deleteCVById) {
    await opts.deleteCVById(cvId);
  }
  return remaining;
}
