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
  minor: 28,
  patch: 0,
  label: 'V2.28.0',
  lastUpdated: '2026-11-21',
  lastAgent: '@antigravity',
  stage: 'feat(architecture): Fases 0-10 completas — Contratos v2, Local-First + Backup opt-in, StudioHost + appRegistry, Bundle Budget, Lidio 7/7 (FacturLee metadata-only), Cápsulas Verticales (0/0 AST), card-studio independiente con puerto contact-profile@1 y Fábrica de Apps (new-app + verify:app-contract).',
} as const;
