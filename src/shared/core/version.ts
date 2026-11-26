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
  minor: 10,
  patch: 1,
  label: 'V3.10.1',
  lastUpdated: '2026-11-26',
  lastAgent: '@antigravity',
  stage: 'fix(platform): V3.10.1 — Arranque limpio sin salto de página en index.html/prerender, blindaje anti-pantalla blanca en análisis IA de EditorLee y VectorDocViewer virtualizado, y barra superior móvil sin botón Ver redundante ni numeración en FacturLee.',
} as const;
