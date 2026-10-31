import type { SupabaseClient } from '@supabase/supabase-js';
import { serverDal } from './serverDal.js';
import { getPrice } from './paymentProviders/pricingCatalog.js';
import { sendPurchaseReceipt } from './emails/sendPurchaseReceipt.js';
import { BILLING_CONFIG } from './config/limits.js';
import { dispatchWaAlert } from './whatsappAlert.js';

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
  adminApprovedAmountMismatch?: boolean;
  /**
   * Estado informado por la pasarela. Si es 'pending', el pago queda retenido
   * para revisión y no se acredita ningún beneficio hasta que llegue el evento
   * de aprobación. Ausente = comportamiento histórico (se trata como aprobado).
   */
  providerStatus?: 'approved' | 'pending';
}

export async function applyPayment(supabaseAdmin: SupabaseClient, payment: PaymentDetails) {
  const { exportToken, email, userId, plan, metodoPago, externalId, amount, currency } = payment;

  if (!exportToken && !email && !userId) {
    throw new Error('applyPayment requiere exportToken, userId, o email para habilitar el servicio');
  }

  const planData = getPrice(plan);

  // 0. La pasarela avisó que el pago todavía está pendiente / en revisión.
  // No se acredita nada: se guarda en la bandeja de retenidos y el webhook de
  // aprobación posterior se encarga de otorgar el beneficio y resolver la fila.
  if (payment.providerStatus === 'pending') {
    if (externalId && metodoPago) {
      // Si el evento de aprobación llegó antes, no se reabre un pago ya acreditado.
      const existing = await serverDal.processedPayments.getByProviderAndExternalId(metodoPago, externalId);
      if (existing?.entitlement_status === 'completed') {
        return { type: 'already_processed', message: 'Payment already completed' };
      }

      await serverDal.pendingGrants.create({
        email: email || undefined,
        provider: metodoPago,
        external_id: externalId,
        plan,
        amount: amount || undefined,
        currency: currency || undefined,
        hold_reason: 'provider_pending',
        export_token: exportToken || undefined,
      });

      await serverDal.adminNotifications.create({
        type: 'payment_pending_review',
        title: `Pago pendiente en la pasarela (${plan})`,
        message: `${email ? `Email: ${email} ` : ''}${externalId ? `Ref: ${externalId}` : ''} — ${metodoPago}. Se reintentará automáticamente cuando la pasarela confirme el cobro.`,
        metadata: { plan, metodoPago, externalId, amount, currency, exportToken, email, userId },
      });

      // Alerta WhatsApp al admin ante pago retenido — despacho no bloqueante.
      dispatchWaAlert(
        `⚠️ Pago RETENIDO: ${plan} via ${metodoPago} — ${email ?? 'sin email'} ref:${externalId ?? 'N/A'}`,
        { plan, metodoPago, externalId, amount, currency, email, userId }
      );
    }

    return { type: 'held_for_review', message: 'Payment pending at provider' };
  }

  // 1. Validar amount y currency ANTES de registrar el pago
  if (
    planData &&
    amount !== undefined &&
    amount !== null &&
    externalId &&
    metodoPago !== 'manual' &&
    !payment.adminApprovedAmountMismatch
  ) {
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
          type: 'payment_pending_review',
          title: `Pago sospechoso: ${plan} (Revisión manual requerida)`,
          message: `Cobrado: ${amount} ${currency}, Esperado: ${expectedAmount} ${expectedCurrency}. Ref: ${externalId}`,
          metadata: { plan, metodoPago, externalId, amount, currency, expectedAmount, expectedCurrency, email, userId }
        });

        // Alerta WhatsApp al admin ante discrepancies de monto — despacho no bloqueante.
        dispatchWaAlert(
          `🔍 MONTO NO COINCIDE: ${plan} via ${metodoPago} — cobrado ${amount} ${currency}, esperado ${expectedAmount} ${expectedCurrency} ref:${externalId}`,
          { plan, metodoPago, externalId, amount, currency, expectedAmount, expectedCurrency, email, userId }
        );
        
        await serverDal.pendingGrants.create({
          email: email || undefined,
          provider: metodoPago,
          external_id: externalId,
          plan,
          amount: amount || undefined,
          currency: currency || undefined,
          hold_reason: 'amount_mismatch',
          export_token: exportToken || undefined
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
        if (!existing) {
          throw new Error(`[applyPayment] Violación de clave única 23505 pero no se pudo leer el registro existente (${metodoPago}: ${externalId})`);
        }
        if (existing.entitlement_status === 'completed') {
          console.log(`[applyPayment] Transacción duplicada omitida (${metodoPago}: ${externalId})`);
          return { type: 'already_processed', message: 'Payment already recorded' };
        }
        console.warn(`[applyPayment] Reintento de pago detectado con derecho pendiente (${metodoPago}: ${externalId}). Recuperando otorgamiento...`);
      } else {
        throw err;
      }
    }
  }

  // Clave canónica de grant para evitar colisiones entre distintos proveedores
  const grantPaymentId = externalId ? (metodoPago ? `${metodoPago}:${externalId}` : externalId) : null;

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

      // 🔑 ETAPA 2: escribir en unclaimed_email_credits (bolsillo de invitado)
      // en lugar de pending_grants, para evitar bloqueos. La tabla acepta inserts
      // de service_role sin política de INSERT definida (migración 20261030).
      if (email) {
        try {
          await supabaseAdmin.from('unclaimed_email_credits').insert({
            email,
            credits: planData.credits ?? 0,
            payment_id: grantPaymentId,
            provider: metodoPago,
            plan,
            amount: amount || null,
            currency: currency || null,
            claim_payment_id: grantPaymentId,
            created_at: new Date().toISOString(),
          });
        } catch (unclaimedErr: any) {
          // Idempotente: si ya existe fila con este payment_id, no es error.
          if (
            unclaimedErr?.code !== '23505' &&
            !String(unclaimedErr?.message || '').includes('unique constraint') &&
            !String(unclaimedErr?.message || '').includes('duplicate key')
          ) {
            throw unclaimedErr;
          }
        }
      }

      await serverDal.adminNotifications.create({
        type: 'payment_pending_review',
        title: `Pago retenido sin perfil (${plan})`,
        message: `Email: ${email} Ref: ${externalId}. Crédito guardado en unclaimed_email_credits (invitado).`,
        metadata: { plan, metodoPago, externalId, email, userId }
      });

      // Alerta WhatsApp al admin ante pago de invitado retenido — despacho no bloqueante.
      dispatchWaAlert(
        `👤 PAGO INVITADO SIN PERFIL: ${plan} via ${metodoPago} — ${email ?? 'sin email'} ref:${externalId ?? 'N/A'}`,
        { plan, metodoPago, externalId, email, userId, credits: planData?.credits }
      );

      return { type: 'payment_applied', plan, exportToken, unclaimed: true };
    } else {
      if (planData.id === 'pro') {
        // Otorgar suscripción Pro de forma atómica e idempotente vía RPC
        const { error: proGrantError } = await supabaseAdmin.rpc('grant_pro_subscription', {
          p_payment_id: grantPaymentId,
          p_user_id: profileId,
          p_days: BILLING_CONFIG.PRO_PLAN_DAYS
        });

        if (proGrantError) {
          throw new Error(`Error en grant_pro_subscription: ${proGrantError.message}`);
        }
        console.log(`[applyPayment] Plan Pro otorgado a perfil ${profileId} de forma idempotente`);
      } else if (planData.id === 'credits_pack_5' || planData.id === 'credits_pack_10') {
        // Otorgar tokens de exportación
        const creditsToGrant = planData.credits || (planData.id === 'credits_pack_5' ? 5 : 10);
        const { error: grantError } = await supabaseAdmin.rpc('grant_export_tokens', {
          p_payment_id: grantPaymentId,
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

    const { data: updatedRows, error: updateError } = await supabaseAdmin
      .from('pdf_export_tokens')
      .update({ 
        paid: true, 
        payment_id: grantPaymentId,
        email: email || undefined
      })
      .eq('token', exportToken)
      .select('token, paid, payment_id');

    if (updateError) {
      throw new Error(`Error actualizando pdf_export_tokens: ${updateError.message}`);
    }

    if (!updatedRows || updatedRows.length === 0) {
      // Verificar si el token ya había sido marcado como paid con este payment_id (reintento idempotente)
      const { data: existingToken } = await supabaseAdmin
        .from('pdf_export_tokens')
        .select('token, paid, payment_id')
        .eq('token', exportToken)
        .maybeSingle();

      const matchesPayment = existingToken?.paid && (
        existingToken.payment_id === grantPaymentId || 
        existingToken.payment_id === externalId
      );

      if (matchesPayment) {
        console.log(`[applyPayment] Token ${exportToken} ya pagado previamente para pago ${grantPaymentId} (idempotente)`);
      } else {
        throw new Error(`[applyPayment] No se encontró el token de exportación especificado: ${exportToken}`);
      }
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
