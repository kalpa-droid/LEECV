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
  patch: 2,
  label: 'V2.24.2',
  lastUpdated: '2026-11-19',
  lastAgent: '@opencode',
  stage: 'fix(admin): Fase A (header sin (listCustomers), mensaje WhatsApp correcto, withErrorHandling en AuditAndErrorsTab) + Fase B (80 radios interpolados rounded-[${radius.X}] migrados a style={{ borderRadius }} en AdminLogin, AdminDashboard, ProcessedPayments, SentryReports, StorageDrive, AiTelemetry y TemplateManagement) + Fase C (auto-recarga de telemetría al cambiar filtros, labels de IndexedDB aclarados, optional chaining en armonía de color, búsqueda de pagos con debounce 350ms).',
} as const;
