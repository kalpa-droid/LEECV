import { dal } from '../storage/dataAccessLayer';
import { apiClient } from '../utils/apiClient';
import { navigation } from '../utils/navigation';
import { env } from '../config/env';
import { PaymentClaim, PaymentGateway } from '../../../types/payments';
import { ProviderId, getPaymentProvider } from './paymentProviderCatalog';
import { PlanId } from './pricingCatalog';

const STUDIO_RETURN_PATH_REGEX = /^\/crear-(cv|editor|libro|factura|agenda)$/;

function detectStudioReturnPath(): string | undefined {
  const pathname = navigation.getPathname();
  if (STUDIO_RETURN_PATH_REGEX.test(pathname)) return pathname;
  return undefined;
}

/**
 * Iniciador unificado de pagos (Mercado Pago, PayPal) para Guest Checkout.
 */
export async function iniciarPago(
  providerId: ProviderId, 
  plan: string, 
  email: string, 
  exportToken?: string,
  userId?: string
) {
  const provider = getPaymentProvider(providerId);
  if (!provider?.checkoutSupported) {
    throw new Error(`${provider?.name || providerId} no soporta inicio de pago automático todavía`);
  }

  const returnPath = detectStudioReturnPath();
  if (typeof sessionStorage !== 'undefined') {
    if (returnPath) {
      sessionStorage.setItem('leecv_checkout_return', returnPath);
    }
    try {
      if (email) localStorage.setItem('leecv_last_checkout_email', email.trim().toLowerCase());
    } catch {
      // Ignorar storage lleno o restringido
    }
  }

  const { ok, data, error } = await apiClient.post<{ checkoutUrl?: string }>('/api/create-checkout', {
    providerId,
    plan,
    email,
    exportToken,
    userId,
    ...(returnPath ? { returnPath } : {}),
  });

  if (!ok || !data?.checkoutUrl) {
    throw new Error(error || `No se pudo iniciar el pago con ${provider.name}`);
  }

  navigation.goTo(data.checkoutUrl);
}

/**
 * Función centralizada para invocar la pasarela seleccionada desde cualquier lugar de la app.
 */
export async function selectPaidPlan(
  plan: string,
  gateway: 'mercadopago' | 'paypal',
  email: string,
  exportToken?: string,
  userId?: string,
  options?: { onError?: (errorMsg: string) => void }
) {
  try {
    await iniciarPago(gateway, plan, email, exportToken, userId);
  } catch (err: any) {
    const msg = err?.message || 'Error al conectar con la pasarela de pagos';
    if (options?.onError) {
      options.onError(msg);
    } else {
      throw err;
    }
  }
}

/**
 * Llama al endpoint backend para capturar una orden de PayPal previamente aprobada.
 */
export async function capturarOrdenPayPal(orderId: string) {
  const { ok, data, error } = await apiClient.post<{ status?: string }>('/api/capture-paypal-order', { orderId });
  if (!ok) {
    throw new Error(error || 'No se pudo capturar el pago con PayPal');
  }
  return data;
}

/**
 * Escucha los parámetros de retorno del navegador tras un pago (ej. ?pago=exitoso&token=<order_id>).
 */
export async function procesarRetornoPago(): Promise<{ status: 'paypal_captured' | 'payment_success' | 'none'; orderId?: string } | null> {
  const params = navigation.getSearchParams();
  const token = params.get('token');
  const pagoStatus = params.get('pago');

  if (token && (pagoStatus === 'exitoso' || !pagoStatus)) {
    try {
      await capturarOrdenPayPal(token);
      // cleanQueryParams se hace DESPUÉS del polling en App.tsx
      return { status: 'paypal_captured', orderId: token };
    } catch (err) {
      console.error('Error al capturar orden PayPal en retorno:', err);
      throw err;
    }
  }

  if (pagoStatus === 'exitoso') {
    // cleanQueryParams se hace DESPUÉS del polling en App.tsx
    return { status: 'payment_success' };
  }

  return null;
}

export async function enviarComprobanteManual({
  email,
  plan,
  paymentMethod,
  transactionRef,
  amount,
}: {
  email: string;
  plan: PlanId;
  paymentMethod: PaymentGateway;
  transactionRef?: string;
  amount?: string | number;
}): Promise<PaymentClaim> {
  const payload: Partial<PaymentClaim> = {
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
    title: 'Nuevo comprobante manual de pago (Invitado)',
    detail: `Invitado ${email} envió comprobante (${paymentMethod}) para plan ${plan}`,
    user_id: null,
  });

  return claim;
}

/** Canjea créditos disponibles de la billetera por un Pase (Pase 30d = 5 cr, Permanente = 10 cr). */
export async function redeemCreditsForPass(
  passId: 'pass_30d' | 'pass_editorlee' | 'pass_facturlee' | 'pass_editorial_team_30d'
): Promise<{ success: boolean; pass_id: string; credits_spent?: number }> {
  const { ok, data, error } = await apiClient.post<{ success: boolean; pass_id: string; credits_spent?: number }>(
    '/api/entitlements/redeem-pass',
    { passId }
  );
  if (!ok || !data?.success) {
    throw new Error(error || 'No se pudieron canjear tus créditos');
  }
  return data;
}

/** Telemetría anónima no bloqueante de embudo comercial (sin PII). */
export function trackFunnelEvent(
  eventKey:
    | 'landing_app_selected'
    | 'studio_opened'
    | 'free_proof_used'
    | 'checkout_opened'
    | 'checkout_started'
    | 'pass_redeemed'
    | 'drive_saved'
    | 'team_created',
  docType: string = 'all'
): void {
  try {
    void apiClient.post('/api/funnel-track', { eventKey, docType });
  } catch {
    // Nunca interrumpir flujo principal por analítica de embudo
  }
}
