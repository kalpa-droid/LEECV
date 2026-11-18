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
  minor: 22,
  patch: 0,
  label: 'V2.22.0',
  lastUpdated: '2026-11-18',
  lastAgent: '@opencode',
  stage: 'PR-D Server actions admin + anti-fraude checkout: POST /api/admin/set-plan (requireAdmin + rate-limit 20/60 + validateBody + UUID/plan∈{free,pro}/vence revalidado con Date server-side + serverDal.profiles.updateSubscription + auditoria atomica en admin_audit_logs) — adminService.setUserPlan ya no escribe profiles directo desde el browser con anon key; POST /api/admin/grant-export-tokens (mismo patron) via RPC service_role grant_export_tokens + admin_audit_logs — repara los botones +1/+5/+10 del panel UsersTab que llamaban la RPC con EXECUTE revocado para authenticated (rotos en produccion); api/create-checkout.ts blindado: ignora userId del body, resuelve identidad por Bearer JWT (401 si viene invalido) o por el token pdf_export_tokens pre-checkout (paid=false), token con user_id propio acredita SOLO a esa cuenta (403 ante session mismatch), plan validado contra el catalogo server-side y pro rechazado, email validado/normalizado, 500 generico sin err.message; serverDal suma profiles.getById y adminAuditLogs.log (best-effort); vercel.json suma los 2 rewrites; bump MINOR V2.21.2 -> V2.22.0 (toca api/ y src/).',
} as const;
