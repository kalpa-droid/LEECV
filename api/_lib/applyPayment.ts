import type { SupabaseClient } from '@supabase/supabase-js';
import { serverDal } from './serverDal.js';
import { getPrice } from './paymentProviders/pricingCatalog.js';
import { sendPurchaseReceipt } from './emails/sendPurchaseReceipt.js';
import { BILLING_CONFIG } from './config/limits.js';

export type PlanType = string;

export interface PaymentDetails {
  exportToken?: string | null;
  email?: string | null;
  userId?: string | null;
  plan: PlanType;
  metodoPago: 'mercadopago' | 'paypal' | 'lemonsqueezy' | 'manual';
  externalId?: string | null;
  amount?: number | null;
  currency?: string | null;
  details?: any;
}

export async function applyPayment(supabaseAdmin: SupabaseClient, payment: PaymentDetails) {
  const { exportToken, email, userId, plan, metodoPago, externalId, amount, currency } = payment;

  if (!exportToken && !email && !userId) {
    throw new Error('applyPayment requiere exportToken, userId, o email para habilitar el servicio');
  }

  const planData = getPrice(plan);

  // 1. Validar amount y currency ANTES de registrar el pago
  if (planData && amount !== undefined && amount !== null && externalId && metodoPago !== 'manual') {
    let expectedAmount = 0;
    let expectedCurrency = 'USD';
    
    if (metodoPago === 'mercadopago') {
      expectedAmount = planData.ars;
      expectedCurrency = 'ARS';
    } else {
      expectedAmount = planData.usd;
      expectedCurrency = 'USD';
    }

    if (expectedAmount > 0) {
      let isMismatch = false;
      if (currency && currency.toUpperCase() !== expectedCurrency) {
        isMismatch = true;
      } else {
        const diff = Math.abs(amount - expectedAmount) / expectedAmount;
        if (diff > BILLING_CONFIG.PAYMENT_TOLERANCE_PERCENT) {
          isMismatch = true;
        }
      }

      if (isMismatch) {
        console.warn(`[applyPayment] Monto/moneda no coincide para ${plan}. Cobrado: ${amount} ${currency}, Esperado: ${expectedAmount} ${expectedCurrency}`);
        await serverDal.adminNotifications.create({
          type: 'payment_mismatch',
          title: `Pago sospechoso: ${plan} (Revisión manual requerida)`,
          message: `Cobrado: ${amount} ${currency}, Esperado: ${expectedAmount} ${expectedCurrency}. Ref: ${externalId}`,
          metadata: { plan, metodoPago, externalId, amount, currency, expectedAmount, expectedCurrency, email, userId }
        });
        
        await serverDal.pendingGrants.create({
          email: email || undefined,
          provider: metodoPago,
          external_id: externalId,
          plan,
          amount: amount || undefined,
          currency: currency || undefined
        });

        return { type: 'held_for_review', message: 'Payment held due to mismatch' };
      }
    }
  }

  // 1.5 Intentar registrar el pago con estado inicial 'pending'
  if (externalId && metodoPago) {
    try {
      await serverDal.processedPayments.record({
        provider: metodoPago,
        external_id: externalId,
        user_email: email || undefined,
        user_id: userId || undefined,
        plan,
        amount: amount || undefined,
        currency: currency || undefined,
        entitlement_status: 'pending',
      });
    } catch (err: any) {
      if (
        err.code === '23505' || 
        String(err?.message).includes('unique constraint') || 
        String(err?.message).includes('duplicate key') ||
        String(err?.message).includes('unq_provider_external_id')
      ) {
        // Consultar si el derecho ya fue otorgado con éxito
        const existing = await serverDal.processedPayments.getByProviderAndExternalId(metodoPago, externalId);
        if (!existing || existing.entitlement_status === 'completed') {
          console.log(`[applyPayment] Transacción duplicada omitida (${metodoPago}: ${externalId})`);
          return { type: 'already_processed', message: 'Payment already recorded' };
        }
        console.warn(`[applyPayment] Reintento de pago detectado con derecho pendiente (${metodoPago}: ${externalId}). Recuperando otorgamiento...`);
      } else {
        throw err;
      }
    }
  }

  // 2. Aplicar el pago basado en el plan (Invitado vs Packs/Pro)
  if (planData && planData.id !== 'single_pdf') {
    // Es un Pack o Pro (requieren cuenta/email)
    let profileId = userId;
    
    if (!profileId && email) {
      const profile = await serverDal.profiles.getByEmail(email);
      if (profile?.id) {
        profileId = profile.id;
      }
    }

    if (!profileId) {
      console.warn(`[applyPayment] Pago recibido para ${plan} pero no hay perfil para userId=${userId} ni email=${email}`);
      if (externalId) {
        await serverDal.pendingGrants.create({
          email: email || undefined,
          provider: metodoPago,
          external_id: externalId,
          plan,
          amount: amount || undefined,
          currency: currency || undefined
        });

        await serverDal.adminNotifications.create({
          type: 'pending_grant',
          title: `Pago retenido sin perfil (${plan})`,
          message: `Email: ${email} Ref: ${externalId}. Se creó un pending_grant.`,
          metadata: { plan, metodoPago, externalId, email, userId }
        });
      }
      return { type: 'pending_grant', message: 'Profile not found, grant held' };
    } else {
      if (planData.id === 'pro') {
        // Otorgar suscripción Pro (añadir BILLING_CONFIG.PRO_PLAN_DAYS días o a partir de hoy)
        const currentProfile = await supabaseAdmin.from('profiles').select('plan_vence').eq('id', profileId).single();
        const currentVence = currentProfile.data?.plan_vence ? new Date(currentProfile.data.plan_vence) : new Date();
        const now = new Date();
        const baseDate = currentVence > now ? currentVence : now;
        
        const newVence = new Date(baseDate);
        newVence.setDate(newVence.getDate() + BILLING_CONFIG.PRO_PLAN_DAYS);

        await serverDal.profiles.updateSubscription({ id: profileId }, { plan: 'pro', plan_vence: newVence.toISOString() });
        console.log(`[applyPayment] Plan Pro otorgado a perfil ${profileId} hasta ${newVence.toISOString()}`);
      } else if (planData.id === 'credits_pack_5' || planData.id === 'credits_pack_10') {
        // Otorgar tokens de exportación
        const creditsToGrant = planData.credits || (planData.id === 'credits_pack_5' ? 5 : 10);
        const { error: grantError } = await supabaseAdmin.rpc('grant_export_tokens', {
          p_payment_id: externalId || null,
          p_user_id: profileId,
          p_amount: creditsToGrant,
          p_email: email
        });

        if (grantError) {
          throw new Error(`Error en grant_export_tokens: ${grantError.message}`);
        }
        console.log(`[applyPayment] ${creditsToGrant} tokens otorgados a perfil ${profileId}`);
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

  // 2.3 Marcar derecho como completado en el registro de pago para garantizar recuperación idempotente
  if (externalId && metodoPago) {
    await serverDal.processedPayments.updateEntitlementStatus(metodoPago, externalId, 'completed');
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
    // Fire and forget
    sendPurchaseReceipt(email, label, `${amount || 0} ${currency || ''}`, externalId || 'N/A').catch(e => {
      console.error('Error enviando recibo no bloqueante:', e);
    });
  }

  // 3. Registro único de auditoría
  await serverDal.adminNotifications.create({
    type: 'payment_received',
    title: `Pago recibido (${plan} via ${metodoPago})`,
    message: `${email ? `Email: ${email} ` : ''}${exportToken ? `Token: ${exportToken}` : ''}${amount ? ` — ${amount} ${currency || ''}` : ''}${externalId ? ` — ref: ${externalId}` : ''}`,
    metadata: { plan, metodoPago, externalId, amount, currency, exportToken, email, userId },
  });

  return { type: 'payment_applied', plan, exportToken };
}

