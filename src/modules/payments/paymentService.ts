import { supabase } from '../../shared/core/lib/supabaseClient';
import { dal } from '../../shared/core/storage/dataAccessLayer';
import { apiClient } from '../../shared/core/utils/apiClient';
import { navigation } from '../../shared/core/utils/navigation';
import { PaymentClaim, PaymentGateway } from '../../types/payments';
import { ProviderId, getPaymentProvider } from '../../shared/core/payments/paymentProviderCatalog';

/**
 * Iniciador unificado de pagos (Mercado Pago, PayPal, Lemon Squeezy).
 */
export async function iniciarPago(providerId: ProviderId, plan: 'single_pdf' | 'credits_pack_5' | 'credits_pack_10' | 'pro' | 'enterprise' = 'pro') {
  const provider = getPaymentProvider(providerId);
  if (!provider?.checkoutSupported) {
    throw new Error(`${provider?.name || providerId} no soporta inicio de pago automático todavía`);
  }

  switch (providerId) {
    case 'mercadopago': {
      const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } };
      if (!session?.user?.email) {
        throw new Error('Necesitás iniciar sesión con tu correo para pagar con Mercado Pago');
      }
      const { ok, data, error } = await apiClient.post<{ checkoutUrl?: string }>('/api/create-mp-preference', { plan });
      if (!ok || !data?.checkoutUrl) {
        throw new Error(error || 'No se pudo iniciar el pago con Mercado Pago');
      }
      navigation.goTo(data.checkoutUrl);
      return;
    }

    case 'paypal': {
      const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } };
      if (!session?.user?.email) {
        throw new Error('Necesitás iniciar sesión con tu correo para pagar con PayPal');
      }
      const { ok, data, error } = await apiClient.post<{ checkoutUrl?: string }>('/api/create-paypal-order', { plan });
      if (!ok || !data?.checkoutUrl) {
        throw new Error(error || 'No se pudo iniciar el pago con PayPal');
      }
      navigation.goTo(data.checkoutUrl);
      return;
    }

    case 'lemonsqueezy': {
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
      navigation.goTo(url.toString());
      return;
    }

    default:
      throw new Error(`Proveedor de pago no reconocido: ${providerId}`);
  }
}

export async function iniciarPagoMercadoPago(plan: 'single_pdf' | 'credits_pack_5' | 'credits_pack_10' | 'pro' | 'enterprise' = 'pro') {
  return iniciarPago('mercadopago', plan);
}

export async function iniciarPagoLemonSqueezy(plan: 'pro' | 'enterprise' = 'pro') {
  return iniciarPago('lemonsqueezy', plan);
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

  const payload: Partial<PaymentClaim> = {
    user_id: user?.id || undefined,
    email,
    plan,
    payment_method: paymentMethod,
    transaction_reference: transactionRef || undefined,
    amount: amount ? String(amount) : undefined,
    status: 'pendiente',
  };

  const claim = await dal.paymentClaims.insert(payload);
  if (!claim) throw new Error('Error al registrar el comprobante manual');

  await dal.adminNotifications.insert({
    type: 'manual_payment_claim',
    title: 'Nuevo comprobante manual de pago',
    detail: `Usuario ${email} envió comprobante (${paymentMethod}) para plan ${plan}`,
    user_id: user?.id || null,
  });

  return claim;
}
