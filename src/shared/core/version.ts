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
  minor: 26,
  patch: 0,
  label: 'V2.27.0',
  lastUpdated: '2026-11-19',
  lastAgent: '@antigravity',
  stage: 'feat(editorial): EditorLee /crear-editor — editor de libros e informes 100% local, motor @react-pdf/renderer + VectorDocViewer, 7 pasos de Dock, 5 capacidades editoriales, 3 flujos IA (Lidio: estructurar/reescribir/pulir), exportación PDF (1 crédito) y copia de seguridad .leecv-editor.',
} as const;
