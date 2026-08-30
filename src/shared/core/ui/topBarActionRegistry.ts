/**
 * NÚCLEO — REGISTRO CANÓNICO DE ACCIONES DE BARRA SUPERIOR (topBarActionRegistry.ts)
 * 
 * Define la asignación estricta y única de qué acciones viven en qué componente
 * de la interfaz (DocumentTabBar vs Navbar). Previene la duplicación visual de botones.
 */

export interface TopBarAction {
  id: string;
  label: string;
  location: 'tabbar' | 'navbar';
}

export const TOP_BAR_ACTIONS: TopBarAction[] = [
  { id: 'new-document', label: 'Nuevo', location: 'tabbar' },
  { id: 'open-saved', label: 'Abrir', location: 'tabbar' },
  { id: 'save-document', label: 'Guardar', location: 'navbar' },
  { id: 'save-as-version', label: 'Guardar como...', location: 'navbar' },
  { id: 'export-pdf', label: 'Descargar PDF', location: 'navbar' },
  { id: 'ats-check', label: 'Analizador ATS', location: 'navbar' },
];

export function getActionsForLocation(location: 'tabbar' | 'navbar'): TopBarAction[] {
  return TOP_BAR_ACTIONS.filter(action => action.location === location);
}
