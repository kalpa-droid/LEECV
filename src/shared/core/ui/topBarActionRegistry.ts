/**
 * NÚCLEO — REGISTRO CANÓNICO DE ACCIONES DE BARRA SUPERIOR E INFERIOR (topBarActionRegistry.ts)
 *
 * Define la asignación estricta y única de qué acciones viven en la barra superior unificada
 * (StudioNavbar), en el menú Archivo, en el menú Cuenta & Preferencias (incluyendo Tema) y
 * en la barra inferior (DocumentTabsBar). Previene la duplicación visual de botones y colisiones en móvil.
 */

import { TOPBAR_BUDGET } from '../../contracts/appContract';

export type TopBarActionLocation = 'navbar' | 'action-menu' | 'account-menu' | 'bottom-bar';

export interface TopBarAction {
  id: string;
  label: string;
  location: TopBarActionLocation;
}

export const TOPBAR_LIMITS = TOPBAR_BUDGET;

const LEADING_EMOJI_RE = /^(?:\p{Extended_Pictographic}|\uFE0F|\u200D)+\s*/u;

/**
 * Elimina emojis iniciales cuando un botón/píldora ya renderiza un ícono vectorial,
 * evitando duplicaciones visuales como `[CasaSVG] 🏠 En casa`.
 */
export function stripLeadingEmoji(label: string): string {
  return String(label || '').replace(LEADING_EMOJI_RE, '').trim();
}

export function hasLeadingEmoji(label: string): boolean {
  return LEADING_EMOJI_RE.test(String(label || '').trim());
}

export const TOP_BAR_ACTIONS: TopBarAction[] = [
  // Zona 1: Identidad + Historial
  { id: 'brand-logo', label: 'LEECV', location: 'navbar' },
  { id: 'undo-redo', label: 'Deshacer / Rehacer', location: 'navbar' },

  // Zona 2: Contextos Globales Declarativos (máx. 3 píldoras, 1 eje por píldora)
  { id: 'region-format', label: 'Contexto Global (Región / Impresión / Obra / Norma / Citas)', location: 'navbar' },

  // Zona 3: Acciones y Diagnósticos Globales (máx. 2, ej. Carta de Presentación + ATS)
  { id: 'cover-letter-handoff', label: 'Carta de Presentación', location: 'navbar' },
  { id: 'ats-check', label: 'Diagnóstico ATS', location: 'navbar' },

  // Zona 4 Móvil: Botón único de Vista Previa (nunca "Editar" redundante en barra superior)
  { id: 'mobile-preview-toggle', label: 'Ver', location: 'navbar' },

  // Píldora de Menú Archivo & Exportar (Iconos 📁💾)
  { id: 'open-saved', label: 'Abrir Documento Guardado...', location: 'action-menu' },
  { id: 'save-overwrite', label: 'Guardar Cambios (Sobrescribir Activo)', location: 'action-menu' },
  { id: 'save-as-copy', label: 'Guardar una copia para...', location: 'action-menu' },
  { id: 'export-portable', label: 'Descargar Copia Portátil (.JSON / .ZIP)', location: 'action-menu' },
  { id: 'export-pdf', label: 'Exportar en PDF', location: 'action-menu' },

  // Píldora de Menú Cuenta & Preferencias (Icono 👤 — visible en desktop y móvil)
  { id: 'credits-status', label: 'Mi Cuenta & Créditos', location: 'account-menu' },
  { id: 'theme-switcher', label: 'Tema visual (Día / Noche / Océano / Ink)', location: 'account-menu' },
  { id: 'auth-toggle', label: 'Ingresar / Cerrar Sesión', location: 'account-menu' },
  { id: 'plans-pricing', label: 'Planes', location: 'account-menu' },
  { id: 'share-app', label: 'Compartir Aplicación', location: 'account-menu' },
  { id: 'privacy-policy', label: 'Política de Privacidad', location: 'account-menu' },

  // Barra Inferior (DocumentTabsBar)
  { id: 'document-tabs', label: 'Pestañas de Documentos', location: 'bottom-bar' },
  { id: 'new-document-tab', label: '+ Nuevo', location: 'bottom-bar' },
];

export function getActionsForLocation(location: TopBarActionLocation): TopBarAction[] {
  return TOP_BAR_ACTIONS.filter((action) => action.location === location);
}
