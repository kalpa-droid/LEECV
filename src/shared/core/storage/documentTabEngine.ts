/**
 * NÚCLEO — MOTOR DE PESTAÑAS MULTIDOCUMENTO (documentTabEngine.ts)
 *
 * Mantiene y gestiona la lista liviana de documentos abiertos en sesión (cv_open_tabs)
 * en localStorage. Evita duplicar estados pesados cvData en RAM y garantiza
 * que el espacio de trabajo del usuario persista entre recargas.
 */

export interface OpenTabItem {
  cvId: string;
  title: string;
  versionLabel?: string;
  isDirty?: boolean;
  docType?: 'cv' | 'business_card' | 'book';
}

const OPEN_TABS_STORAGE_KEY = 'cv_open_tabs';

export function getOpenTabs(): OpenTabItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OPEN_TABS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(t => ({ ...t, docType: t.docType || 'cv' })) : [];
  } catch (err) {
    console.warn('Error leyendo cv_open_tabs:', err);
    return [];
  }
}

export function saveOpenTabs(tabs: OpenTabItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OPEN_TABS_STORAGE_KEY, JSON.stringify(tabs));
  } catch (err) {
    console.warn('Error guardando cv_open_tabs:', err);
  }
}

export function addOpenTab(cvId: string, title: string, versionLabel?: string, docType: 'cv' | 'business_card' | 'book' = 'cv'): OpenTabItem[] {
  if (!cvId) return getOpenTabs();
  const current = getOpenTabs();
  const existingIdx = current.findIndex(t => t.cvId === cvId);
  const cleanTitle = title || (docType === 'business_card' ? 'Mi Tarjeta Personal' : docType === 'book' ? 'Mi Libro / Folleto' : 'Mi Currículum Vitae');

  if (existingIdx >= 0) {
    current[existingIdx] = {
      ...current[existingIdx],
      title: cleanTitle,
      versionLabel: versionLabel || current[existingIdx].versionLabel,
      docType: docType || current[existingIdx].docType || 'cv'
    };
  } else {
    current.push({
      cvId,
      title: cleanTitle,
      versionLabel,
      docType
    });
  }

  saveOpenTabs(current);
  return current;
}

export function removeOpenTab(cvId: string): OpenTabItem[] {
  const current = getOpenTabs();
  const filtered = current.filter(t => t.cvId !== cvId);
  saveOpenTabs(filtered);
  return filtered;
}

export function generateDocumentId(prefix: 'cv' | 'book' | 'card' = 'cv'): string {
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

