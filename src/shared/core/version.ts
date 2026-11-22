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
  minor: 0,
  patch: 0,
  label: 'V3.0.0',
  lastUpdated: '2026-11-22',
  lastAgent: '@antigravity',
  stage: 'feat(ui): V3.0.0 — Rediseño Cero Ruido + Globo ? de Lidio y taxonomía clara (Ayuda contextual solo para redacción), Geometría móvil sin tapar Dock ni Lidio, Píldora global de Región en barra superior y jerarquía anti-pisado, 3 botones de Diseño en Dock sin banner cruzado, Perillas/Ojos sin pérdida de datos, Carpeta Segura explícita en disco y Fábrica new-app actualizada.',
} as const;
