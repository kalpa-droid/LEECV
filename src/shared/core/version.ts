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
  minor: 11,
  patch: 0,
  label: 'V3.11.0',
  lastUpdated: '2026-11-26',
  lastAgent: '@antigravity',
  stage: 'feat(editor-lee): V3.11.0 — Motor integral simple/doble faz con inicio de capítulos en página impar e índice sincronizado, presets completos de Informe y Proyecto, encabezados/pies configurables con márgenes automáticos, 3 píldoras globales y exportación Word (.docx).',
} as const;
