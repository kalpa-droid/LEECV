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
  patch: 2,
  label: 'V2.21.2',
  lastUpdated: '2026-11-18',
  lastAgent: '@opencode',
  stage: 'PR-C Panel Admin performance/metricas: debounce 350ms en busqueda de clientes (debouncedSearchQuery) — el input pinta inmediato pero la consulta espera inactividad; fix de closure viejo en el polling de 45s (loadEverythingRef, deps [profile?.role]) — ya no recarga con page=0 y busqueda vacia pisandole la navegacion al admin; metrica real "CVs Publicados" (published_cvs, dal.publishedCvs.countAll head:true) reemplaza el hardcode "500 MB Capacidad Base DB Supabase"; DSN de Sentry leido desde env (env.SENTRY_DSN) en SentryReportsTab en vez de literal duplicado (dashboard URL como const de modulo); dal.publishedCvs.countAll agregado (espeja cvs.countAll, nunca rechaza); adminService.getPublishedCvsCount; bump PATCH V2.21.1 -> V2.21.2.',
} as const;
