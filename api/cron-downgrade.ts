import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_lib/supabaseAdmin.js';
import { errorResponse, successResponse } from './_lib/apiResponse.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return errorResponse(res, 405, 'Método no permitido');
  }

  // Verificación de token secreto para Vercel Cron
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'];
  const isVercelCron = req.headers['x-vercel-cron'] === '1';

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isVercelCron) {
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
      .select('id, email, plan, premium_vence')
      .lt('premium_vence', nowIso)
      .is('grace_period_ends_at', null)
      .in('plan', ['pro', 'enterprise']);

    if (fetchExpiringErr) {
      console.error('Error obteniendo perfiles por vencer:', fetchExpiringErr);
    }

    let newlyInGrace = 0;
    if (expiringProfiles && expiringProfiles.length > 0) {
      const tenDaysFromNow = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();

      for (const profile of expiringProfiles) {
        // 1. Marcar inicio del período de gracia de 10 días
        const { error: updateErr } = await supabaseAdmin
          .from('profiles')
          .update({ grace_period_ends_at: tenDaysFromNow })
          .eq('id', profile.id);

        if (!updateErr) {
          newlyInGrace++;

          // 2. Generar oferta automática de retención del 20% OFF por 10 días si no tiene una pendiente
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
              discount_percent: 20,
              valid_until: tenDaysFromNow,
              status: 'pendiente',
              notes: 'Oferta automática al iniciar período de gracia (20% OFF)',
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
      .in('plan', ['pro', 'enterprise'])
      .select('id, email');

    if (downgradeErr) {
      console.error('Error ejecutando downgrade a free:', downgradeErr);
    }

    const totalDowngraded = downgradedProfiles ? downgradedProfiles.length : 0;

    return successResponse(res, {
      success: true,
      timestamp: nowIso,
      summary: {
        enteredGracePeriod: newlyInGrace,
        downgradedToFree: totalDowngraded,
      },
    });
  } catch (err: any) {
    console.error('Excepción en cron-downgrade:', err);
    return errorResponse(res, 500, err?.message || 'Error procesando vencimientos');
  }
}
