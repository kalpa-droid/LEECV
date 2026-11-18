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
  minor: 23,
  patch: 0,
  label: 'V2.23.0',
  lastUpdated: '2026-11-18',
  lastAgent: '@opencode',
  stage: 'PR-D2 Reconciliador de pagos + retención de créditos sin cuenta (Opción B): api/_lib/paymentReconciler.ts re-consulta MP (/v1/payments/{id}) y PayPal (OAuth + /v2/payments/captures/{id}) para filas processed_payments con entitlement_status=pending y pending_grants con hold_reason=provider_pending (ventana minima 15 min, batch 20, oldest-first) — approved re-ejecuta applyPayment idempotente + resolveIfPending reconciler_confirmed, rejected marca failed + provider_rejected + aviso admin, >7d o aprobado sin referencia utilizable = revision manual (nunca acredita en la duda), UNA notificacion agregada por corrida si hay escalados; retencion unclaimed_email_credits: recordatorio unico ~dia 7 (reminder_sent_at, claim atomico + revert si falla el envio) y expiracion ~dia 365 (expired_at + email anonimizado conservando metadatos financieros) + migracion SQL idempotente (columnas + claim_credits_on_auth reemplazo que ignora expirados + CHECK admin_notifications unclaimed_credits_expired — APLICAR EN PROD POST-MERGE); anti-fraude tambien en paypal-order.ts:create via checkoutIdentity.ts compartido (mismo criterio que create-checkout: JWT Bearer identidad o token pdf_export_tokens, 401 ante JWT invalido, plan vs catalogo, 500 generico); cron-downgrade ejecuta el mantenimiento como PASO C aislado en try/catch (falla nunca aborta el downgrade); panel admin: 3 server actions nuevas (reconcile-payments, list-unclaimed-credits, resend-unclaimed-reminder) con rate-limit + auditoria; boton Reintentar reconciliacion en Pagos retenidos + tab "Creditos sin reclamar" con reenvio de recordatorio; bump MINOR V2.22.0 -> V2.23.0 (toca api/ y src/).',
} as const;
