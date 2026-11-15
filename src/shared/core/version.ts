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
  minor: 13,
  patch: 0,
  label: 'V2.13.0',
  lastUpdated: '2026-11-14',
  lastAgent: '@opencode',
  stage: 'Bloque 1 (jerarquia tipografica y densidad): correccion del bug de unidades recordScaleRatios (pt confundidos con ratios) en presetCompositionInstances y typographyHarmonyEngine, cuerpo minimo 8.0 pt, quote-text en rol body con factor de extracto, motor de densidad central (compact/normal/relaxed) aplicado a banners y tarjetas, panel Ajustar tamanos y espacio en la hoja en Diseno.',
} as const;
