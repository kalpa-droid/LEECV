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
  minor: 2,
  patch: 0,
  label: 'V3.2.0',
  lastUpdated: '2026-11-22',
  lastAgent: '@antigravity',
  stage: 'feat(platform,book): V3.2.0 — Taxonomía de Botones en Dock y Paneles, Píldora Global Universal en Navbar, Motor Universal de Cascada Anti-Pisado (Nivel 1/2/3 manualOverrides), Perfiles En casa vs Imprenta con formatos grandes en Libro/Folleto y Fábrica de Apps Cero Ruido actualizada.',
} as const;
