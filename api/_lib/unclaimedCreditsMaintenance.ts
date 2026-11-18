import { supabaseAdmin } from './supabaseAdmin.js';
import { serverDal } from './serverDal.js';
import { sendUnclaimedCreditsReminder } from './emails/sendUnclaimedCreditsReminder.js';
import { captureBackendException } from './sentryBackend.js';

/**
 * Mantenimiento del ciclo de vida de `unclaimed_email_credits`
 * (retención Opción B):
 *   - ~día 7 sin reclamar: 1 único email recordatorio.
 *   - ~día 365 sin reclamar: expiración + anonimización del email.
 *
 * Invocado por api/cron-downgrade.ts (diario) y por la acción admin
 * `resend-unclaimed-reminder` (reenvío manual bajo demanda).
 */

export const UNCLAIMED_REMINDER_DAYS = 7;
export const UNCLAIMED_EXPIRE_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReminderSummary {
  candidates: number;
  sent: number;
  failed: number;
}

/**
 * Envía el recordatorio a filas pendientes con más de UNCLAIMED_REMINDER_DAYS.
 * Reclama cada fila atómicamente (`reminder_sent_at` de NULL a now) ANTES de
 * enviar: al que gana la carrera le toca el envío; el perdedor no duplica.
 * Si el envío falla, revierte el sello para reintentar en la próxima corrida.
 */
export async function sendUnclaimedReminders(limit = 50): Promise<ReminderSummary> {
  const cutoff = new Date(Date.now() - UNCLAIMED_REMINDER_DAYS * DAY_MS).toISOString();
  const { data: rows, error } = await supabaseAdmin
    .from('unclaimed_email_credits')
    .select('id, email, credits')
    .is('claimed_at', null)
    .is('reminder_sent_at', null)
    .is('expired_at', null)
    .lt('created_at', cutoff)
    .limit(limit);

  if (error) {
    console.error('[unclaimed] Error listando candidatos a recordatorio:', error.message);
    throw new Error(`[unclaimed] Error listando candidatos a recordatorio: ${error.message}`);
  }

  let sent = 0;
  let failed = 0;
  for (const row of rows ?? []) {
    // Claim atómico de la fila: sólo el ganador envía.
    const { data: claimed } = await supabaseAdmin
      .from('unclaimed_email_credits')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('claimed_at', null)
      .is('reminder_sent_at', null)
      .is('expired_at', null)
      .select('id')
      .maybeSingle();

    if (!claimed) continue; // otro proceso la tomó o la reclamaron mientras tanto

    const ok = await sendUnclaimedCreditsReminder(row.email, row.credits);
    if (ok) {
      sent++;
      continue;
    }

    // El envío falló: se revierte el sello para reintentar la próxima corrida.
    failed++;
    console.error(`[unclaimed] Recordatorio NO enviado (id=${row.id}); se reintentará en la próxima corrida`);
    await supabaseAdmin
      .from('unclaimed_email_credits')
      .update({ reminder_sent_at: null })
      .eq('id', row.id);
  }

  return { candidates: rows?.length ?? 0, sent, failed };
}

export interface ExpireSummary {
  expired: number;
}

/**
 * Marca como expiradas las filas con más de UNCLAIMED_EXPIRE_DAYS sin reclamar
 * y anonimiza el email conservando los metadatos financieros (payment_id,
 * credits, amount, currency, provider, plan) para contabilidad.
 */
export async function expireUnclaimedCredits(limit = 500): Promise<ExpireSummary> {
  const cutoff = new Date(Date.now() - UNCLAIMED_EXPIRE_DAYS * DAY_MS).toISOString();
  const { data: rows, error } = await supabaseAdmin
    .from('unclaimed_email_credits')
    .select('id')
    .is('claimed_at', null)
    .is('expired_at', null)
    .lt('created_at', cutoff)
    .limit(limit);

  if (error) {
    console.error('[unclaimed] Error listando candidatos a expiración:', error.message);
    throw new Error(`[unclaimed] Error listando candidatos a expiración: ${error.message}`);
  }

  let expired = 0;
  for (const row of rows ?? []) {
    const { error: updErr, data: updated } = await supabaseAdmin
      .from('unclaimed_email_credits')
      .update({
        expired_at: new Date().toISOString(),
        email: `anonymized+${row.id}@expired.invalid`,
      })
      .eq('id', row.id)
      .is('expired_at', null)
      .select('id')
      .maybeSingle();

    if (updErr || !updated) continue;
    expired++;
  }

  if (expired > 0) {
    await serverDal.adminNotifications.create({
      type: 'unclaimed_credits_expired',
      title: `${expired} crédito(s) de invitado expiraron sin reclamar`,
      message: `${expired} fila(s) de unclaimed_email_credits superaron ${UNCLAIMED_EXPIRE_DAYS} días sin reclamo. Los emails fueron anonimizados; los importes se conservan para contabilidad.`,
      metadata: { expired, days: UNCLAIMED_EXPIRE_DAYS },
    });
  }

  return { expired };
}

/** Corrida completa del mantenimiento (cron diario). Nunca lanza: lo hacen los callers. */
export async function runUnclaimedCreditsMaintenance(): Promise<{
  reminder: ReminderSummary;
  expire: ExpireSummary;
}> {
  const reminder = await sendUnclaimedReminders();
  const expire = await expireUnclaimedCredits();

  if (reminder.failed > 0) {
    await captureBackendException(
      new Error(`unclaimed reminders: ${reminder.failed} envíos fallidos`),
      'unclaimed-maintenance',
      { reminder }
    );
  }

  return { reminder, expire };
}
