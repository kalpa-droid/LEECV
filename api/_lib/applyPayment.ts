import type { SupabaseClient } from '@supabase/supabase-js';
import { serverDal } from './serverDal.js';

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

  // 2. Marcar el token de exportación como pagado
  const { error: updateError } = await supabaseAdmin
    .from('pdf_export_tokens')
    .update({ 
      paid: true, 
      payment_id: externalId,
      email: email || undefined
    })
    .eq('token', exportToken);

  if (updateError) {
    throw new Error(`Error actualizando pdf_export_tokens: ${updateError.message}`);
  }

  // 3. Registro único de auditoría
  await serverDal.adminNotifications.create({
    type: 'payment_received',
    title: `Pago recibido de Invitado (${metodoPago})`,
    message: `Token: ${exportToken}${amount ? ` — ${amount} ${currency || ''}` : ''}${externalId ? ` — ref: ${externalId}` : ''}`,
    metadata: { plan, metodoPago, externalId, amount, currency, exportToken, email },
  });

  return { type: 'token_activated', exportToken };
}
