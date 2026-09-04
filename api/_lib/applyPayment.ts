import type { SupabaseClient } from '@supabase/supabase-js';
import { serverDal } from './serverDal.js';

export interface PaymentDetails {
  userId?: string | null;
  email?: string | null;
  plan: 'single_pdf' | 'credits_pack_5' | 'credits_pack_10' | 'pro' | 'enterprise';
  metodoPago: 'mercadopago' | 'paypal' | 'lemonsqueezy' | 'manual';
  externalId?: string | null;
  amount?: number | null;
  currency?: string | null;
}

export async function applyPayment(_supabaseAdmin: SupabaseClient, payment: PaymentDetails) {
  const { userId, email, plan, metodoPago, externalId, amount, currency } = payment;

  if (!userId && !email) {
    throw new Error('applyPayment requiere userId o email para identificar al usuario');
  }

  // 1. Intentar registrar el pago primero para garantizar idempotencia atómica vía UNIQUE constraint
  if (externalId && metodoPago) {
    try {
      await serverDal.processedPayments.record({
        provider: metodoPago,
        external_id: externalId,
        user_id: userId || undefined,
        plan,
        amount: amount || undefined
      });
    } catch (err: any) {
      if (
        err.code === '23505' || 
        String(err?.message).includes('unique constraint') || 
        String(err?.message).includes('duplicate key') ||
        String(err?.message).includes('unq_provider_external_id')
      ) {
        console.log(`[applyPayment] Transacción duplicada omitida (${metodoPago}: ${externalId})`);
        return { type: 'already_processed', message: 'Payment already recorded' };
      }
      throw err;
    }
  }

  const CREDIT_PACKS: Record<string, number> = {
    single_pdf: 1,
    credits_pack_5: 5,
    credits_pack_10: 10,
  };

  let result;

  if (CREDIT_PACKS[plan]) {
    const res = await serverDal.pdfExportCredits.grantCredits(userId || '', CREDIT_PACKS[plan]);
    result = { type: 'credits', credits: res.credits };
  } else if (plan === 'pro' || plan === 'enterprise') {
    result = await activateSubscription({ userId: userId || undefined, email: email || undefined, plan, metodoPago });
  } else {
    throw new Error(`Plan desconocido en applyPayment: ${plan}`);
  }

  // Registro único de auditoría + fuente para el panel de admin ("avisos de pago").
  await serverDal.adminNotifications.create({
    type: 'payment_received',
    title: `Pago recibido (${metodoPago})`,
    message: `Plan/paquete: ${plan}${amount ? ` — ${amount} ${currency || ''}` : ''}${externalId ? ` — ref: ${externalId}` : ''}`,
    metadata: { plan, metodoPago, externalId, amount, currency, user_id: userId || null, user_email: email || null },
  });

  return result;
}

async function activateSubscription(
  { userId, email, plan, metodoPago }: { userId?: string; email?: string; plan: string; metodoPago: string }
) {
  const vence = new Date();
  vence.setMonth(vence.getMonth() + 1);

  const patch = {
    plan,
    plan_vence: vence.toISOString(),
    premium_activo: true,
    premium_vence: vence.toISOString(),
    metodo_pago: metodoPago,
  };

  const matchBy = userId ? { id: userId } : { email: email! };
  const updated = await serverDal.profiles.updateSubscription(matchBy, patch);

  // Usar el id devuelto por la actualización, no el userId original: en pagos
  // que sólo traen email (ej. Lemon Squeezy sin custom_data.user_id), userId
  // llega undefined y esto es lo único que identifica al perfil real.
  const targetUserId = updated?.id || null;

  if (plan === 'enterprise' && targetUserId) {
    const existingOrg = await serverDal.organizations.getByOwnerId(targetUserId);
    if (!existingOrg) {
      await serverDal.organizations.create({
        name: email ? `Organización de ${email}` : 'Mi organización',
        owner_id: targetUserId,
      });
    }
  }

  return { type: 'subscription', plan, vence: vence.toISOString() };
}
