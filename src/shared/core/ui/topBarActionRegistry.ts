/**
 * NÚCLEO — REGISTRO CANÓNICO DE ACCIONES DE BARRA SUPERIOR (topBarActionRegistry.ts)
 * 
 * Define la asignación estricta y única de qué acciones viven en la barra superior unificada
 * (Navbar). Previene la duplicación visual de botones.
 */

export interface TopBarAction {
  id: string;
  label: string;
  location: 'navbar' | 'action-menu' | 'account-menu';
}

export const TOP_BAR_ACTIONS: TopBarAction[] = [
  // Cluster Izquierdo (Marca + Herramientas + Tema)
  { id: 'brand-logo', label: 'LEECV', location: 'navbar' },
  { id: 'ats-check', label: 'ATS', location: 'navbar' },
  { id: 'theme-switcher', label: 'Tema', location: 'navbar' },

  // Cluster Central (Pestañas + Nuevo)
  { id: 'document-tabs', label: 'Pestañas de Documentos', location: 'navbar' },
  { id: 'new-document-tab', label: '+ Nuevo', location: 'navbar' },

  // Píldora de Menú de Acciones (Iconos 📁💾)
  { id: 'save-overwrite', label: 'Guardar Cambios (Sobrescribir Activo)', location: 'action-menu' },
  { id: 'save-as-copy', label: 'Guardar como copia para Puesto', location: 'action-menu' },
  { id: 'export-portable', label: 'Descargar Copia Portátil (.JSON / .ZIP)', location: 'action-menu' },
  { id: 'export-pdf', label: 'Exportar en PDF', location: 'action-menu' },

  // Píldora de Menú de Cuenta (Iconos 👤🔑)
  { id: 'auth-toggle', label: 'Ingresar / Cerrar Sesión', location: 'account-menu' },
  { id: 'plans-pricing', label: 'Planes', location: 'account-menu' },
  { id: 'agency-panel', label: 'Panel', location: 'account-menu' },
  { id: 'share-app', label: 'Compartir Aplicación', location: 'account-menu' }
];

export function getActionsForLocation(location: 'navbar' | 'action-menu' | 'account-menu'): TopBarAction[] {
  return TOP_BAR_ACTIONS.filter(action => action.location === location);
}
