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
  minor: 8,
  patch: 0,
  label: 'V2.8.0',
  lastUpdated: '2026-11-11',
  lastAgent: '@desarrollo-rapido',
  stage: 'Pipeline OCR HD secuencial, fix thinkingBudget Gemini, consolidación ATS con Groq y mapeo a 20+ secciones canónicas con activación automática',
} as const;
