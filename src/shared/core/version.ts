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
  minor: 24,
  patch: 1,
  label: 'V2.24.1',
  lastUpdated: '2026-11-19',
  lastAgent: '@opencode',
  stage: 'fix(payments): useExportEntitlement busca tokens por email como fallback cuando user_id es null (F1); cleanQueryParams movido al final del polling post-pago en App.tsx (F3); migración SQL para agregar manual_payment_claim al CHECK de admin_notifications (F2).',
} as const;
