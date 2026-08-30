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
}

const OPEN_TABS_STORAGE_KEY = 'cv_open_tabs';

export function getOpenTabs(): OpenTabItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OPEN_TABS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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

export function addOpenTab(cvId: string, title: string, versionLabel?: string): OpenTabItem[] {
  if (!cvId) return getOpenTabs();
  const current = getOpenTabs();
  const existingIdx = current.findIndex(t => t.cvId === cvId);
  const cleanTitle = title || 'Mi Currículum Vitae';

  if (existingIdx >= 0) {
    current[existingIdx] = {
      ...current[existingIdx],
      title: cleanTitle,
      versionLabel: versionLabel || current[existingIdx].versionLabel
    };
  } else {
    current.push({
      cvId,
      title: cleanTitle,
      versionLabel
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
