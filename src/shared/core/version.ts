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
  minor: 14,
  patch: 3,
  label: 'V3.14.3',
  lastUpdated: '2026-11-27',
  lastAgent: '@antigravity',
  stage: 'fix(editor-lee): V3.14.3 — Auto-aplicación inmediata al importar sobre borrador vacío, modal raíz persistente y coherencia digital PDF con rescate OCR.',
} as const;
