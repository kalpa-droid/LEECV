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
  minor: 12,
  patch: 0,
  label: 'V3.12.0',
  lastUpdated: '2026-11-27',
  lastAgent: '@antigravity',
  stage: 'feat(editorial): V3.12.0 — Motor AST Lossless con Asset Vault y biyección 1:1, EditorLee en 7 pasos sin ruido, cascada global-sección real y lienzo limpio con corrector multilingüe.',
} as const;
