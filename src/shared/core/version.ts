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
  minor: 11,
  patch: 1,
  label: 'V2.11.1',
  lastUpdated: '2026-11-14',
  lastAgent: '@opencode',
  stage: 'Correcciones de auditoria post-V2.11.0: candado visible en secciones no asignables (certificados/firma), scroll al ancla del PDF forzado post-render, contratos IA OpenAPI 3.0 validos para Gemini (suggest_records, explain_ats, ats_analysis aclarados), normalizacion de registros IA con alias canonicos, plantilla conserva columna manual en los 3 modos y persiste columnAssignments, certificados fuera de la distribucion por columnas, preset no enciende opcionales no universales vacias, Datos Personales con contacto y datos-personales independientes (formato ATS)',
} as const;
