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
  minor: 29,
  patch: 0,
  label: 'V2.29.0',
  lastUpdated: '2026-11-21',
  lastAgent: '@antigravity',
  stage: 'feat(ux): V2.29.0 — Hotfix tipografía Serif/Times-Roman + visor con zoom y foco por sección en EditorLee, Importar Respaldos .json/.leecv y Certificados con IA, Reclasificación segura de registros compatibles, Flujo CV Base -> Analizar en qué me perfilo -> Modal editable -> Postulación IA+ATS -> Carta Gratuita + Lidio, y Archivos portables tipo Word con PWA file_handlers.',
} as const;
