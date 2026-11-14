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
  patch: 0,
  label: 'V2.11.0',
  lastUpdated: '2026-11-14',
  lastAgent: '@opencode',
  stage: 'Modelo de plantillas y secciones: full-template respeta columnas elegidas a mano, preset no enciende slots personalizada vacíos, candado visible certificado/firma, scroll+aviso al reordenar, Datos Personales nunca desaparece en silencio, IA en secciones huérfanas (habilidades y registro genérico), botón Sugerir Logros ACR reparado, explicación ATS con IA',
} as const;
