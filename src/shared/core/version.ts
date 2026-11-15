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
  minor: 14,
  patch: 1,
  label: 'V2.14.1',
  lastUpdated: '2026-11-15',
  lastAgent: '@opencode',
  stage: 'Bloque 1 post-V2.14.0 (botones ATS + contraste blog): mapa canonico resolveRuleTargetTab para los botones Ir a corregir/Guia ACR de los modales ATS (antes saltaban a pestanas inexistentes como experience o frase y dejaban el panel en blanco), rama edit_section del modal de pre-exportacion, blog con prosa vinculada a los tokens de tema (.prose-leecv en vez de dark:prose-invert que obedece al SO), hover AA en titulos de articulos y ThemeToggleButton en el header del blog.',
} as const;
