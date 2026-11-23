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
  minor: 5,
  patch: 0,
  label: 'V3.5.0',
  lastUpdated: '2026-11-23',
  lastAgent: '@antigravity',
  stage: 'feat(book-editorial-ai): V3.5.0 — Modo Automático de armado directo (imposición), orientación IA por muestreo y lotes en Fotocopia, Paso 5 con deducción de Página 1 por IA, separadores/carátulas de capítulos en Libro Folleto y EditorLee, y recomendación IA de tipo de obra al importar.',
} as const;
