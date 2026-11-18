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
  minor: 20,
  patch: 0,
  label: 'V2.20.0',
  lastUpdated: '2026-11-17',
  lastAgent: '@opencode',
  stage: 'Blindaje de pagos automaticos MP/PayPal (Fase 1, PR-A): applyPayment cierra unclaimed_email_credits como completed con details.unclaimed (el webhook reintento ya no duplica avisos/WA y el historial del admin no queda pendiente para siempre), insert verificado con { error } (Supabase JS v2 no lanza: fallo real ya no responde 200 OK en silencio), guard credits enteros (pro sin perfil nunca guarda unlimited), recibo con nota de reclamo automatico al entrar con el mismo email; paypal-order capture con rate-limit propio + acreditacion inmediata via applyPayment con el MISMO capture.id del webhook (idempotente, el usuario vuelve con creditos aunque el webhook tarde o no llegue) + manejo ORDER_ALREADY_CAPTURED sin re-acreditar; custom_id/external_reference compacto plan|token|uid (<127 chars de PayPal) con retrocompat JSON en parsePlanReference (formatPlanReference); PdfCheckoutModal ata el token al user_id si hay sesion; App.tsx al volver del pago espera hidratacion de sesion + polling claim/refresh 3x2s; webhook MP: encodeURIComponent del payment id y soporte IPN legacy topic=payment&id; tests nuevos planReference/applyPaymentUnclaimed/paypalOrderCapture (19) y bump MINOR por funcionalidad nueva.',
} as const;
