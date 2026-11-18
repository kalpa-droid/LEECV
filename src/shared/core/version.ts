/**
 * CANONICAL VERSION TRACKER — LEECV Master Plan
 * Regla de gobernanza para todos los agentes (AGENTS.md / Regla 8+):
 *
 * - Pequeños cambios (fixes, ajustes UI mínimos): incrementa PATCH (V2.1 → V2.2)
 * - Cambios medianos (nueva funcionalidad, componente, integración backend): incrementa MINOR (V2.2 → V2.3)
 * - Grandes cambios (cambio de arquitectura, nuevo esquema DB principal, nuevo eje del plan): incrementa MAJOR (V2.x → V3.0)
 *
 * El archivo debe ser actualizado ANTES del commit que aplica el cambio.
 */

export const LEECV_VERSION = {
  major: 2,
  minor: 21,
  patch: 1,
  label: 'V2.21.1',
  lastUpdated: '2026-11-18',
  lastAgent: '@opencode',
  stage: 'Fix pantalla en blanco en /admin (rama fix/admin-white-screen): getCurrentProfile() ya no rechaza ante sesion invalida/red/lock de Supabase (try/catch -> null); checkSession() con timeout de 15s y pantalla de error con boton Reintentar; pantalla Verificando sesion visible en vez de return null; verificacion de sesion una sola vez al montar y carga paginada separada ([profile?.role, page, searchQuery]); tokens de contraste corregidos a var(--ui-preview-bg)/var(--ui-bg-panel) en Suspense fallback (main.tsx), aviso de permisos (AdminDashboard), fondo de AppShell y pastillas de sub-pestanas (TemplateManagementTab); fix PRESET_LIST Proxy (Symbol.iterator estricto y bound iterator sobre snapshot) que devolvia Array.prototype.values para prop=0 y rompia TemplateManagementTab en el primer render; guard de lista vacia en TemplateManagementTab; tests nuevos (presetRegistry + AdminDashboard); bump PATCH V2.21.0 -> V2.21.1.',
} as const;
