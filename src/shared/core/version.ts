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
  minor: 3,
  patch: 0,
  label: 'V3.3.0',
  lastUpdated: '2026-11-22',
  lastAgent: '@antigravity',
  stage: 'feat(editorlee): V3.3.0 — Píldora Global de Obra y Normas en Navbar, Separación Estructura vs Bibliografía (APA 7, Vancouver, IEEE, Harvard, Chicago, MLA 9), Cascada Anti-Pisado con ManualOverrideBadge y Citas Automáticas en Línea dentro de capítulos, secciones y anexos.',
} as const;
