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
  minor: 7,
  patch: 0,
  label: 'V3.7.0',
  lastUpdated: '2026-11-24',
  lastAgent: '@antigravity',
  stage: 'feat(book-studio): V3.7.0 — Paso 5 Separadores con paridad en vivo, selector de color y cuentagotas, perillas Hoja detrás/delante, hoja aparte guillotina en casa, paso 7 adaptado Casa vs Imprenta y portal global de modales.',
} as const;
