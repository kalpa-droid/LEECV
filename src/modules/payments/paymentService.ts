import { supabase } from '../../shared/core/lib/supabaseClient';
import { PaymentClaim, PaymentGateway } from '../../types/payments';

/**
 * Registra o solicita un pago con Mercado Pago, Lemon Squeezy o comprobante manual.
 */
export async function iniciarPagoMercadoPago(plan: 'single_pdf' | 'credits_pack_5' | 'credits_pack_10' | 'pro' | 'enterprise' = 'pro') {
  const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } };
  if (!session?.user?.email) {
    throw new Error('Necesitás iniciar sesión con tu correo para pagar con Mercado Pago');
  }

  const res = await fetch('/api/create-mp-preference', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ plan }),
  });
  const data = await res.json();
  if (!res.ok || !data.checkoutUrl) {
    throw new Error(data.error || 'No se pudo iniciar el pago con Mercado Pago');
  }

  if (typeof window !== 'undefined') {
    window.location.href = data.checkoutUrl;
  }
}

export async function iniciarPagoLemonSqueezy(plan: 'pro' | 'enterprise' = 'pro') {
  const base = import.meta.env.VITE_LEMONSQUEEZY_CHECKOUT_URL;
  if (!base) {
    throw new Error('No está configurada VITE_LEMONSQUEEZY_CHECKOUT_URL');
  }
  const { data: { user } } = await supabase?.auth.getUser() || { data: { user: null } };
  const url = new URL(base);
  if (user) {
    url.searchParams.set('checkout[custom][user_id]', user.id);
  }
  url.searchParams.set('checkout[custom][plan]', plan);
  if (typeof window !== 'undefined') {
    window.location.href = url.toString();
  }
}

export async function enviarComprobanteManual({
  email,
  plan,
  paymentMethod,
  transactionRef,
  amount,
}: {
  email: string;
  plan: 'pro' | 'enterprise';
  paymentMethod: PaymentGateway;
  transactionRef?: string;
  amount?: string | number;
}): Promise<PaymentClaim> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data: { user } } = await supabase.auth.getUser();

  const payload = {
    user_id: user?.id || null,
    email,
    plan,
    payment_method: paymentMethod,
    transaction_reference: transactionRef || null,
    amount: amount ? String(amount) : null,
    status: 'pendiente',
  };

  const { data, error } = await supabase
    .from('payment_claims')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  await supabase.from('admin_notifications').insert({
    type: 'manual_payment_claim',
    title: 'Nuevo comprobante manual de pago',
    detail: `Usuario ${email} envió comprobante (${paymentMethod}) para plan ${plan}`,
    user_id: user?.id || null,
  });

  return data as PaymentClaim;
}
