import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { errorResponse, successResponse } from './_lib/apiResponse.js';
import { captureBackendException } from './_lib/sentryBackend.js';
import { BILLING_CONFIG } from './_lib/config/limits.js';
import { reconcilePendingPayments } from './_lib/paymentReconciler.js';
import { runUnclaimedCreditsMaintenance } from './_lib/unclaimedCreditsMaintenance.js';
import { sendCalmExpiryNoticeEmail } from './_lib/emails/lifecycleEmails.js';


export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return errorResponse(res, 405, 'Método no permitido');
  }

  // Verificación de token secreto para Vercel Cron.
  // Nota: x-vercel-cron / x-vercel-cron-schedule NO son headers verificados por
  // Vercel a nivel de plataforma — son headers HTTP normales que cualquier
  // caller externo puede setear en su propio request. Según la documentación
  // oficial de Vercel, son solo "corroboración"; el único límite de seguridad
  // real es el Authorization: Bearer {CRON_SECRET} que Vercel agrega server-side.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'];

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return errorResponse(res, 401, 'No autorizado para ejecutar cron');
  }

  try {
    const now = new Date();
    const nowIso = now.toISOString();

    // ----------------------------------------------------
    // PASO A: Usuarios cuyo plan venció HOY y aún no entran en gracia
    // ----------------------------------------------------
    const { data: expiringProfiles, error: fetchExpiringErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, plan, plan_vence')
      .lt('plan_vence', nowIso)
      .is('grace_period_ends_at', null)
      .in('plan', ['pro']);

    if (fetchExpiringErr) {
      console.error('Error obteniendo perfiles por vencer:', fetchExpiringErr);
    }

    let newlyInGrace = 0;
    if (expiringProfiles && expiringProfiles.length > 0) {
      const tenDaysFromNow = new Date(now.getTime() + BILLING_CONFIG.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();

      for (const profile of expiringProfiles) {
        // 1. Marcar inicio del período de gracia de 10 días
        const { error: updateErr } = await supabaseAdmin
          .from('profiles')
          .update({ grace_period_ends_at: tenDaysFromNow })
          .eq('id', profile.id);

        if (!updateErr) {
          newlyInGrace++;

          // 2. Generar oferta automática de retención
          const { data: existingOffer } = await supabaseAdmin
            .from('retention_offers')
            .select('id')
            .eq('user_id', profile.id)
            .eq('status', 'pendiente')
            .gt('valid_until', nowIso)
            .maybeSingle();

          if (!existingOffer) {
            const { error: offerErr } = await supabaseAdmin.from('retention_offers').insert({
              user_id: profile.id,
              plan_at_offer: profile.plan,
              discount_percent: BILLING_CONFIG.RETENTION_DISCOUNT_PERCENT,
              valid_until: tenDaysFromNow,
              status: 'pendiente',
              notes: `Oferta automática al iniciar período de gracia (${BILLING_CONFIG.RETENTION_DISCOUNT_PERCENT}% OFF)`,
            });
            if (offerErr) {
              console.error(`Error creando oferta de retención para ${profile.id}:`, offerErr);
            }
          }
        }
      }
    }

    // ----------------------------------------------------
    // PASO B: Usuarios cuyo período de gracia YA terminó -> Downgrade definitivo a FREE
    // ----------------------------------------------------
    const { data: downgradedProfiles, error: downgradeErr } = await supabaseAdmin
      .from('profiles')
      .update({
        plan: 'free',
        grace_period_ends_at: null,
      })
      .lt('grace_period_ends_at', nowIso)
      .in('plan', ['pro'])
      .select('id, email');

    if (downgradeErr) {
      console.error('Error ejecutando downgrade a free:', downgradeErr);
    }

    const totalDowngraded = downgradedProfiles ? downgradedProfiles.length : 0;

    // ----------------------------------------------------
    // PASO C: Reconciliación de pagos + retención de créditos sin cuenta
    // (PR-D2). Cada sub-tarea corre en su propio try/catch: una falla acá
    // NUNCA aborta el downgrade de planes (lo crítico de este cron).
    // ----------------------------------------------------
    let reconcile: Awaited<ReturnType<typeof reconcilePendingPayments>> | null = null;
    let unclaimed: Awaited<ReturnType<typeof runUnclaimedCreditsMaintenance>> | null = null;

    try {
      reconcile = await reconcilePendingPayments();
    } catch (reconcileErr: any) {
      console.error('Error en reconciliación de pagos (cron):', reconcileErr);
      await captureBackendException(reconcileErr instanceof Error ? reconcileErr : new Error(String(reconcileErr)), 'cron-downgrade:reconcile');
    }

    try {
      unclaimed = await runUnclaimedCreditsMaintenance();
    } catch (unclaimedErr: any) {
      console.error('Error en mantenimiento de créditos sin reclamar (cron):', unclaimedErr);
      await captureBackendException(unclaimedErr instanceof Error ? unclaimedErr : new Error(String(unclaimedErr)), 'cron-downgrade:unclaimed');
    }

    // ----------------------------------------------------
    // PASO D: Vencimiento de pass_30d + avisos tranquilos (5 días antes, sin cobro automático)
    // ----------------------------------------------------
    const passesMaintenance = {
      expiredPass30d: 0,
      calmNoticesSent: 0,
    };

    try {
      const { data: expiredPasses30d } = await supabaseAdmin
        .from('profiles')
        .update({
          plan: 'free',
          plan_vence: null,
          premium_activo: false,
        })
        .eq('plan', 'pass_30d')
        .lt('plan_vence', nowIso)
        .select('id');

      passesMaintenance.expiredPass30d = Array.isArray(expiredPasses30d) ? expiredPasses30d.length : 0;

      const fourDaysAhead = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();
      const fiveDaysAhead = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();

      const { data: upcomingProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, email, plan, plan_vence')
        .in('plan', ['pro', 'pass_30d'])
        .gte('plan_vence', fourDaysAhead)
        .lte('plan_vence', fiveDaysAhead);

      if (Array.isArray(upcomingProfiles)) {
        for (const p of upcomingProfiles) {
          if (!p?.email || !p?.plan_vence) continue;
          const label = p.plan === 'pass_30d' ? 'Pase Total 30 Días' : 'Plan Pro';
          const ok = await sendCalmExpiryNoticeEmail(p.email, label, 5, p.plan_vence);
          if (ok) passesMaintenance.calmNoticesSent++;
        }
      }

      const { data: upcomingTeamPasses } = await supabaseAdmin
        .from('user_app_passes')
        .select('user_id, pass_id, expires_at')
        .eq('is_permanent', false)
        .is('revoked_at', null)
        .gte('expires_at', fourDaysAhead)
        .lte('expires_at', fiveDaysAhead);

      if (Array.isArray(upcomingTeamPasses) && upcomingTeamPasses.length > 0) {
        const userIds = Array.from(new Set(upcomingTeamPasses.map((u: any) => u.user_id).filter(Boolean)));
        const { data: passProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        const emailById = new Map<string, string>(
          (passProfiles || []).map((r: any) => [String(r.id), String(r.email || '')])
        );

        for (const row of upcomingTeamPasses as any[]) {
          const email = emailById.get(String(row.user_id));
          if (!email || !row.expires_at) continue;
          const ok = await sendCalmExpiryNoticeEmail(email, 'Sala de Equipo EditorLee (30 días)', 5, row.expires_at);
          if (ok) passesMaintenance.calmNoticesSent++;
        }
      }
    } catch (passesErr: any) {
      console.error('Error en mantenimiento de pases y avisos (cron):', passesErr);
      await captureBackendException(passesErr instanceof Error ? passesErr : new Error(String(passesErr)), 'cron-downgrade:passes');
    }

    return successResponse(res, {
      success: true,
      timestamp: nowIso,
      summary: {
        enteredGracePeriod: newlyInGrace,
        downgradedToFree: totalDowngraded,
        reconcile,
        unclaimed,
        passesMaintenance,
      },
    });
  } catch (err: any) {
    console.error('Excepción en cron-downgrade:', err);
    await captureBackendException(err, 'cron-downgrade');
    return errorResponse(res, 500, err?.message || 'Error procesando vencimientos');
  }
}
