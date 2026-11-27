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
  patch: 1,
  label: 'V3.11.1',
  lastUpdated: '2026-11-27',
  lastAgent: '@antigravity',
  stage: 'fix(core): V3.11.1 — Blindaje total contra DataView en vista previa PDF (imágenes DOCX y fuentes TTF/OTF), Undo/Redo conectado en las 6 apps (PC y móvil) y confirmaciones useConfirm() en borrados destructivos.',
} as const;
