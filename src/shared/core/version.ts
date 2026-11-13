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
  patch: 7,
  label: 'V2.8.7',
  lastUpdated: '2026-11-13',
  lastAgent: '@antigravity',
  stage: 'Pipeline OCR completo: Groq con modelos vigentes (GPT-OSS 120B / Qwen 3.8 Visión), reintento selectivo que conserva páginas fallidas, telemetría con modelo real',
} as const;
