import type { SupabaseClient } from '@supabase/supabase-js';
import { serverDal } from './serverDal.js';
import { getPrice } from './paymentProviders/pricingCatalog.js';
import { sendPurchaseReceipt } from './emails/sendPurchaseReceipt.js';

export type PlanType = string;

export interface PaymentDetails {
  exportToken?: string | null;
  email?: string | null;
  plan: PlanType;
  metodoPago: 'mercadopago' | 'paypal' | 'lemonsqueezy' | 'manual';
  externalId?: string | null;
  amount?: number | null;
  currency?: string | null;
  details?: any;
}

export async function applyPayment(supabaseAdmin: SupabaseClient, payment: PaymentDetails) {
  const { exportToken, email, plan, metodoPago, externalId, amount, currency } = payment;

  if (!exportToken && !email) {
    throw new Error('applyPayment requiere exportToken o email para habilitar el servicio');
  }

  // 1. Intentar registrar el pago primero para garantizar idempotencia atómica
  if (externalId && metodoPago) {
    try {
      await serverDal.processedPayments.record({
        provider: metodoPago,
        external_id: externalId,
        user_email: email || undefined,
        plan,
        amount: amount || undefined,
        currency: currency || undefined,
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

  // 2. Aplicar el pago basado en el plan (Invitado vs Packs/Pro)
  const planData = getPrice(plan);
  if (planData && planData.id !== 'single_pdf') {
    // Es un Pack o Pro (requieren cuenta/email)
    if (!email) {
      throw new Error(`Se requiere email para procesar el plan ${plan}`);
    }

    const profile = await serverDal.profiles.getByEmail(email);
    if (!profile?.id) {
      console.warn(`[applyPayment] Pago recibido para ${plan} pero no hay perfil para ${email}`);
    } else {
      if (planData.id === 'pro') {
        // Otorgar suscripción Pro
        await serverDal.profiles.updateSubscription({ id: profile.id }, { plan: 'pro' });
        console.log(`[applyPayment] Plan Pro otorgado a ${email}`);
      } else if (planData.id === 'credits_pack_5' || planData.id === 'credits_pack_10') {
        // Otorgar tokens de exportación
        const creditsToGrant = planData.id === 'credits_pack_5' ? 5 : 10;
        const { error: grantError } = await supabaseAdmin.rpc('grant_export_tokens', {
          p_payment_id: externalId || null,
          p_user_id: profile.id,
          p_amount: creditsToGrant,
          p_email: email
        });

        if (grantError) {
          throw new Error(`Error en grant_export_tokens: ${grantError.message}`);
        }
        console.log(`[applyPayment] ${creditsToGrant} tokens otorgados a ${email}`);
      }
    }
  } else {
    // Invitado (single_pdf)
    if (!exportToken) {
      throw new Error('Se requiere exportToken para habilitar single_pdf');
    }

    const { error: updateError } = await supabaseAdmin
      .from('pdf_export_tokens')
      .update({ 
        paid: true, 
        payment_id: externalId || null,
        email: email || undefined
      })
      .eq('token', exportToken);

    if (updateError) {
      throw new Error(`Error actualizando pdf_export_tokens: ${updateError.message}`);
    }
  }

  // 2.5 Enviar recibo de compra
  if (email && planData) {
    const PLAN_LABELS: Record<string, string> = {
      'single_pdf': 'LEECV - 1 Exportación PDF',
      'credits_pack_5': 'Pack de 5 Exportaciones',
      'credits_pack_10': 'Pack de 10 Exportaciones',
      'pro': 'Plan Pro (Suscripción Mensual)'
    };
    const label = PLAN_LABELS[planData.id] || planData.id;
    // Fire and forget, we don't await this so we don't block the webhook response
    sendPurchaseReceipt(email, label, `${amount || 0} ${currency || ''}`, externalId || 'N/A').catch(e => {
      console.error('Error enviando recibo no bloqueante:', e);
    });
  }

  // 3. Registro único de auditoría
  await serverDal.adminNotifications.create({
    type: 'payment_received',
    title: `Pago recibido (${plan} via ${metodoPago})`,
    message: `${email ? `Email: ${email} ` : ''}${exportToken ? `Token: ${exportToken}` : ''}${amount ? ` — ${amount} ${currency || ''}` : ''}${externalId ? ` — ref: ${externalId}` : ''}`,
    metadata: { plan, metodoPago, externalId, amount, currency, exportToken, email },
  });

  return { type: 'payment_applied', plan, exportToken };
}
