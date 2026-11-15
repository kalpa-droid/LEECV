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
  minor: 16,
  patch: 0,
  label: 'V2.16.0',
  lastUpdated: '2026-11-15',
  lastAgent: '@opencode',
  stage: 'Asistente flotante Lidio (Parte 3 del plan integral): FAB en el editor con tips 100% locales (inactividad ~20s primer tip, ~90s los siguientes, max 3 tips por sesion, silenciable), catalogo de tips por pestana incluyendo bloque de columnas (Columna Principal vs Barra Lateral, que conviene dejar siempre en la principal, candado en Certificados/Firma), chat explicito con IA via tarea app_guide_assistant (OpenAPI 3.0, responseSchema answer+suggestedActions, targetTab validado client-side con isValidPanelTab), icono assistant en ICON_REGISTRY/UI_ICON_IDS, estado en localStorage leecv.assistant (+ sessionStorage para el limite por sesion), animacion ui-assistant-pop con respeto a prefers-reduced-motion.',
} as const;
