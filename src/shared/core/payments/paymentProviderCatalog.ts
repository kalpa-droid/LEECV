/**
 * NÚCLEO CANÓNICO DE PROVEEDORES DE PAGO (Client-Safe)
 * 
 * Regla de oro: CERO imports de Node.js (crypto, process, fs, etc.).
 * Este catálogo es consumido tanto por el bundle del frontend (Vite)
 * como por las funciones Serverless del backend (Vercel).
 */

export type ProviderId = 'mercadopago' | 'paypal' | 'lemonsqueezy';

export interface PaymentProviderCatalogEntry {
  id: ProviderId;
  name: string;
  shortLabel: string;
  defaultCurrency: string;
  emoji: string;
  envVars: string[];
  badgeClass: string;
  checkoutSupported: boolean;
}

export const PAYMENT_PROVIDER_CATALOG: PaymentProviderCatalogEntry[] = [
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    shortLabel: 'MP',
    defaultCurrency: 'ARS',
    emoji: '🌐',
    envVars: ['MP_ACCESS_TOKEN', 'MP_WEBHOOK_SECRET'],
    badgeClass: 'bg-[var(--color-status-success-muted)] text-[var(--color-status-success-text)] border-[var(--color-status-success-base)]/30',
    checkoutSupported: true,
  },
  {
    id: 'paypal',
    name: 'PayPal',
    shortLabel: 'PayPal',
    defaultCurrency: 'USD',
    emoji: '💳',
    envVars: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID'],
    badgeClass: 'bg-[var(--color-secondary-muted)] text-[var(--color-secondary-text)] border-[var(--color-secondary-base)]/30',
    checkoutSupported: true,
  },
  {
    id: 'lemonsqueezy',
    name: 'Lemon Squeezy',
    shortLabel: 'LS',
    defaultCurrency: 'USD',
    emoji: '🌎',
    envVars: ['LEMONSQUEEZY_API_KEY', 'LEMONSQUEEZY_WEBHOOK_SECRET'],
    badgeClass: 'bg-[var(--color-accent-purple-light)] text-[var(--color-accent-purple-text)] border-[var(--color-accent-purple)]/30',
    checkoutSupported: true,
  },
];

export function getPaymentProvider(id: string | null | undefined): PaymentProviderCatalogEntry | undefined {
  return PAYMENT_PROVIDER_CATALOG.find((p) => p.id === id);
}

export function getPaymentProviderDefaultCurrency(id: string | null | undefined): string {
  return getPaymentProvider(id)?.defaultCurrency ?? 'USD';
}

export function getPaymentProviderBadge(id: string | null | undefined): { label: string; className: string; emoji: string } {
  const provider = getPaymentProvider(id);
  if (!provider) {
    return {
      label: id === 'manual' ? 'Transferencia / Manual' : (id || 'Desconocido'),
      className: 'bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)] border-[var(--color-status-warning-base)]/30',
      emoji: '🏦',
    };
  }
  return { label: provider.name, className: provider.badgeClass, emoji: provider.emoji };
}
