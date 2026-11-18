import type { PaymentDetails } from './applyPayment.js';
import { applyPayment } from './applyPayment.js';
import { supabaseAdmin } from './supabaseAdmin.js';
import { serverDal } from './serverDal.js';
import { parsePlanReference } from './paymentProviders/planReference.js';
import { env } from './config/env.js';
import { captureBackendException } from './sentryBackend.js';

/**
 * Reconciliador pagos ↔ entitlements (PR-D2).
 *
 * Red de seguridad para pagos que quedaron en estado incierto:
 *   (A) pending_grants con hold_reason = 'provider_pending' (la pasarela dijo
 *       "pending" y el webhook de aprobación nunca llegó o nunca se procesó).
 *   (B) processed_payments con entitlement_status = 'pending' (applyPayment
 *       falló a mitad de camino después de registrar el pago).
 *
 * Por cada candidato consulta el estado REAL en la pasarela (MP o PayPal) y:
 *   - approved / COMPLETED  → re-ejecuta applyPayment() (idempotente) y cierra
 *     la retención correspondiente (resolveIfPending 'reconciler_confirmed').
 *   - rejected / cancelled  → marca processed_payments como 'failed', resuelve
 *     la retención ('provider_rejected') y notifica al admin.
 *   - sigue pendiente       → lo deja como está; si superó ESCALATION_DAYS se
 *     cuenta como escalado y al final se emite UNA notificación agregada.
 *   - aprobado pero referencia inutilizable → NUNCA acredita solo: garantiza
 *     que exista la retención (idempotente, sin notificación) y lo deja para
 *     revisión manual (cuenta como pendiente; escala con la regla de 7 días).
 *
 * Nunca acredita "en la duda". Nada de esto duplica créditos: applyPayment es
 * idempotente por UNIQUE(provider, external_id) + clave de grants.
 */

export const RECONCILE_MIN_AGE_MINUTES = 15;
export const RECONCILE_ESCALATION_DAYS = 7;
export const RECONCILE_BATCH_LIMIT = 20;

export interface ReconcileSummary {
  scanned: number;
  applied: number;
  rejected: number;
  stillPending: number;
  escalated: number;
  errors: number;
}

type ProviderOutcome =
  | { status: 'approved'; details: PaymentDetails }
  | { status: 'needs_review'; email: string | null; amount: number | null; currency: string | null }
  | { status: 'rejected' }
  | { status: 'pending' }
  | { status: 'unknown' };

const DAY_MS = 24 * 60 * 60 * 1000;

function mpRejectedStatuses(): Set<string> {
  return new Set(['rejected', 'cancelled', 'refunded', 'charged_back']);
}

async function checkMercadoPago(externalId: string): Promise<ProviderOutcome> {
  if (!env.MP_ACCESS_TOKEN) {
    console.error('[reconciler] MP_ACCESS_TOKEN no configurado; no se puede verificar pagos de Mercado Pago');
    return { status: 'unknown' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  let payment: any;
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(externalId))}`, {
      headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`MP /v1/payments/${externalId} → HTTP ${res.status}`);
    }
    payment = await res.json();
  } finally {
    clearTimeout(timeoutId);
  }

  const status = payment?.status;
  const externalIdStr = String(payment?.id ?? externalId);
  const email = payment?.payer?.email ?? null;
  const amount = typeof payment?.transaction_amount === 'number' ? payment.transaction_amount : null;
  const currency = payment?.currency_id || 'ARS';

  if (status !== 'approved') {
    return mpRejectedStatuses().has(status) ? { status: 'rejected' } : { status: 'pending' };
  }

  const parsedRef = await parsePlanReference(payment?.external_reference, 'mercadopago', externalIdStr);
  if (!parsedRef || (!parsedRef.exportToken && !email && !parsedRef.userId)) {
    return { status: 'needs_review', email, amount, currency };
  }

  return {
    status: 'approved',
    details: {
      exportToken: parsedRef.exportToken ?? null,
      email,
      userId: parsedRef.userId ?? null,
      plan: parsedRef.plan,
      metodoPago: 'mercadopago',
      externalId: externalIdStr,
      amount,
      currency,
      details: payment,
      providerStatus: 'approved',
    },
  };
}

function getPaypalBaseUrl(): string {
  return String(env.PAYPAL_ENV).toLowerCase() === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
}

async function getPaypalAccessToken(): Promise<string> {
  const baseUrl = getPaypalBaseUrl();
  const auth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`PayPal OAuth falló: ${data?.error_description || data?.error || res.status}`);
  }
  return data.access_token;
}

async function checkPaypal(externalId: string): Promise<ProviderOutcome> {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    console.error('[reconciler] Credenciales de PayPal no configuradas; no se pueden verificar capturas');
    return { status: 'unknown' };
  }

  const baseUrl = getPaypalBaseUrl();
  const accessToken = await getPaypalAccessToken();
  const res = await fetch(`${baseUrl}/v2/payments/captures/${encodeURIComponent(String(externalId))}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`PayPal /v2/payments/captures/${externalId} → HTTP ${res.status}`);
  }
  const capture: any = await res.json();

  const status = capture?.status;
  const externalIdStr = String(capture?.id ?? externalId);
  // custom_id viaja en la captura (mismo lugar que lee el webhook).
  const customId = capture?.custom_id || '';
  const email = capture?.payer?.email_address ?? null;
  const rawValue = capture?.amount?.value;
  const amount = rawValue !== undefined && rawValue !== null ? Number(rawValue) : null;
  const currency = capture?.amount?.currency_code || 'USD';

  if (status !== 'COMPLETED') {
    const denied = new Set(['DENIED', 'FAILED', 'VOIDED']);
    return denied.has(status) ? { status: 'rejected' } : { status: 'pending' };
  }

  const parsedRef = await parsePlanReference(customId, 'paypal', externalIdStr);
  if (!parsedRef || (!parsedRef.exportToken && !email && !parsedRef.userId)) {
    return { status: 'needs_review', email, amount, currency };
  }

  return {
    status: 'approved',
    details: {
      exportToken: parsedRef.exportToken ?? null,
      email,
      userId: parsedRef.userId ?? null,
      plan: parsedRef.plan,
      metodoPago: 'paypal',
      externalId: externalIdStr,
      amount,
      currency,
      details: capture,
      providerStatus: 'approved',
    },
  };
}

async function checkByProvider(provider: string, externalId: string): Promise<ProviderOutcome> {
  try {
    if (provider === 'mercadopago') return await checkMercadoPago(externalId);
    if (provider === 'paypal') return await checkPaypal(externalId);
    console.warn(`[reconciler] Proveedor desconocido "${provider}" para ${externalId}`);
    return { status: 'unknown' };
  } catch (err: any) {
    console.error(`[reconciler] Error consultando ${provider}:${externalId}:`, err?.message || err);
    await captureBackendException(err instanceof Error ? err : new Error(String(err)), 'payment-reconciler', {
      provider,
      externalId,
    });
    return { status: 'unknown' };
  }
}

interface Candidate {
  provider: string;
  external_id: string;
  created_at: string;
}

export async function reconcilePendingPayments(): Promise<ReconcileSummary> {
  const summary: ReconcileSummary = {
    scanned: 0,
    applied: 0,
    rejected: 0,
    stillPending: 0,
    escalated: 0,
    errors: 0,
  };

  const minAge = new Date(Date.now() - RECONCILE_MIN_AGE_MINUTES * 60 * 1000).toISOString();
  const escalationCutoff = new Date(Date.now() - RECONCILE_ESCALATION_DAYS * DAY_MS);
  const handled = new Set<string>();

  // (A) Retenidos por la pasarela
  const grants = await serverDal.pendingGrants.listProviderPending(minAge, RECONCILE_BATCH_LIMIT);
  // (B) Registrados pero nunca acreditados
  const stuck = await serverDal.processedPayments.listPending(minAge, RECONCILE_BATCH_LIMIT);

  const candidates: Candidate[] = [
    ...grants.map((g: any) => ({ provider: g.provider, external_id: g.external_id, created_at: g.created_at })),
    ...stuck.map((p: any) => ({ provider: p.provider, external_id: p.external_id, created_at: p.created_at })),
  ].filter((c) => c.external_id && String(c.external_id).trim() !== '');

  for (const candidate of candidates) {
    const key = `${candidate.provider}:${candidate.external_id}`;
    if (handled.has(key)) continue; // ya procesado vía la otra fuente en esta corrida
    handled.add(key);
    summary.scanned++;

    const outcome = await checkByProvider(candidate.provider, candidate.external_id);
    const isOld = new Date(candidate.created_at) < escalationCutoff;

    if (outcome.status === 'unknown') {
      summary.errors++;
      continue;
    }

    if (outcome.status === 'pending') {
      summary.stillPending++;
      if (isOld) summary.escalated++;
      continue;
    }

    if (outcome.status === 'needs_review') {
      // Dinero cobrado sin referencia utilizable: NUNCA acreditar solo.
      // Garantizar que exista la retención (idempotente) y dejarla para el panel.
      try {
        await serverDal.pendingGrants.create({
          email: outcome.email || undefined,
          provider: candidate.provider as 'mercadopago' | 'paypal',
          external_id: candidate.external_id,
          plan: 'unknown',
          amount: outcome.amount || undefined,
          currency: outcome.currency || undefined,
          hold_reason: 'provider_pending',
        });
      } catch (err: any) {
        console.error(`[reconciler] No se pudo garantizar la retención para ${key}:`, err?.message || err);
        summary.errors++;
        continue;
      }
      summary.stillPending++;
      summary.escalated++; // siempre requiere revisión humana
      continue;
    }

    if (outcome.status === 'rejected') {
      try {
        await serverDal.processedPayments.updateEntitlementStatus(candidate.provider, candidate.external_id, 'failed');
      } catch (err: any) {
        // La fila puede no existir (retención previa al registro): no es fatal.
        console.warn(`[reconciler] No se pudo marcar failed ${key}:`, err?.message || err);
      }
      try {
        await serverDal.pendingGrants.resolveIfPending(candidate.provider, candidate.external_id, 'provider_rejected');
      } catch (err: any) {
        console.error(`[reconciler] No se pudo resolver la retención ${key}:`, err?.message || err);
        summary.errors++;
        continue;
      }
      await serverDal.adminNotifications.create({
        type: 'payment_pending_review',
        title: `Pago rechazado por la pasarela (${candidate.provider})`,
        message: `La pasarela informa que el pago ${candidate.external_id} fue rechazado/cancelado. Se marcó como fallido y se cerró la retención sin acreditar. Ref: ${candidate.external_id}`,
        metadata: { provider: candidate.provider, externalId: candidate.external_id },
      });
      summary.rejected++;
      continue;
    }

    // approved: aplicar de forma idempotente
    try {
      await applyPayment(supabaseAdmin, outcome.details);
      await serverDal.pendingGrants.resolveIfPending(candidate.provider, candidate.external_id, 'reconciler_confirmed');
      summary.applied++;
    } catch (err: any) {
      console.error(`[reconciler] Error aplicando pago ${key}:`, err?.message || err);
      await captureBackendException(err instanceof Error ? err : new Error(String(err)), 'payment-reconciler-apply', {
        provider: candidate.provider,
        externalId: candidate.external_id,
      });
      summary.errors++;
    }
  }

  if (summary.escalated > 0) {
    await serverDal.adminNotifications.create({
      type: 'payment_pending_review',
      title: `${summary.escalated} pago(s) pendiente(s) requieren revisión manual`,
      message: `${summary.escalated} pago(s) superaron ${RECONCILE_ESCALATION_DAYS} días en estado pendiente (o fueron cobrados sin referencia utilizable). Revisalos en el panel de Pagos → Pagos retenidos. Refs: ver "Pagos retenidos".`,
      metadata: { escalated: summary.escalated, days: RECONCILE_ESCALATION_DAYS },
    });
  }

  return summary;
}
