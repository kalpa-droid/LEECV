import { mercadoPagoProvider } from './mercadopago.js';
import { paypalProvider } from './paypal.js';
import { lemonSqueezyProvider } from './lemonsqueezy.js';
import type { PaymentProvider, ProviderStatus } from './types.js';
import type { ProviderId } from '../../../src/shared/core/payments/paymentProviderCatalog.ts';

export const PROVIDER_REGISTRY: Record<ProviderId, PaymentProvider> = {
  mercadopago: mercadoPagoProvider,
  paypal: paypalProvider,
  lemonsqueezy: lemonSqueezyProvider,
};

export async function diagnoseAllProviders(forcePing: boolean): Promise<Record<ProviderId, ProviderStatus>> {
  const entries = Object.values(PROVIDER_REGISTRY);
  const results = await Promise.allSettled(entries.map((p) => p.diagnose(forcePing)));
  const out = {} as Record<ProviderId, ProviderStatus>;
  entries.forEach((provider, i) => {
    const r = results[i];
    out[provider.id] = r.status === 'fulfilled'
      ? r.value
      : { status: 'error', label: `Error de conexión con ${provider.id}`, missingVars: [] };
  });
  return out;
}
