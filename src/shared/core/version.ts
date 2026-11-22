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
  minor: 1,
  patch: 0,
  label: 'V3.1.0',
  lastUpdated: '2026-11-22',
  lastAgent: '@antigravity',
  stage: 'feat(editorlee): V3.1.0 — Presets escolares/terciarios/APA7/Vancouver IMRyD, Bibliografía formal APA 7 y Vancouver, Dock dinámico con distintivos (i, ii, 1, 2, A), Portadas diseñadas adaptadas, Importación universal (Word/ODT/RTF/PDF digital+OCR/Fotos) con Chunker de textos largos e IA y UI Cero Ruido modular.',
} as const;
