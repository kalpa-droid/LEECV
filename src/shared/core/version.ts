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
  minor: 9,
  patch: 0,
  label: 'V3.9.0',
  lastUpdated: '2026-11-24',
  lastAgent: '@antigravity',
  stage: 'feat(editor-lee): V3.9.0 — Motor Editorial Pro PR 2: 12 formatos en 3 grupos, normas APA 7/Chicago/MLA exactas (25.4 mm y 36 pt), 7 estilos bibliográficos con cursivas y tabulación IEEE/Vancouver, auditor preflight antes de exportar y controles editoriales completos en estudio.',
} as const;
