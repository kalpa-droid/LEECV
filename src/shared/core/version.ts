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
  minor: 6,
  patch: 0,
  label: 'V3.6.0',
  lastUpdated: '2026-11-23',
  lastAgent: '@antigravity',
  stage: 'feat(platform-facturlee-editorlee): V3.6.0 — Rediseño operativo de FacturLee + fix solapamiento PDF, depuración de exportaciones en Libro-Folleto, modal canónico de importación IA, pipeline Zero-Loss .docx + columnas/imágenes/tablas/fuentes APA en EditorLee, y resiliencia de respaldo ante actualizaciones.',
} as const;
