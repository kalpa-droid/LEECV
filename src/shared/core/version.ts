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
  major: 3,
  minor: 4,
  patch: 0,
  label: 'V3.4.0',
  lastUpdated: '2026-11-22',
  lastAgent: '@antigravity',
  stage: 'feat(topbar-dock-globals): V3.4.0 — TopBar de 4 zonas, Tema en Cuenta & Preferencias, Dock CV/EditorLee compacto de 2 columnas, 3 píldoras globales en EditorLee, 2 píldoras globales + 3 canales Cero Ruido en Libro/Folleto y gobernanza en create/verify app.',
} as const;
