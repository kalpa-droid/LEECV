/**
 * NÚCLEO CANÓNICO DE PRECIOS (Client-Safe)
 *
 * Antes de este archivo, el mismo producto ("1 exportación de PDF") tenía
 * TRES precios distintos escritos a mano en el mismo modal (PdfCheckoutModal.tsx:
 * "$1 USD", "$1.50 USD" y "~$1.800 ARS"), y el plan Pro se mostraba a "$19 USD"
 * en PricingModal.tsx mientras el backend de PayPal cobraba $24 USD de verdad
 * por default. Ningún componente ni endpoint vuelve a escribir un precio a
 * mano — todos leen de acá.
 *
 * Regla de oro (igual que paymentProviderCatalog.ts): CERO imports de Node.js.
 * Este archivo lo usa el frontend (Vite) para mostrar precios en pantalla.
 *
 * ⚠️ TIENE UN GEMELO EN EL BACKEND: api/_lib/paymentProviders/pricingCatalog.ts
 * No se pueden fusionar en un solo archivo compartido porque Vercel
 * (@vercel/nft) no resuelve imports de api/ hacia afuera de api/ — es la
 * misma razón por la que ProviderId también está duplicado entre
 * paymentProviderCatalog.ts (acá) y api/_lib/paymentProviders/types.ts.
 * `npm run verify:pricing-sync` (parte de check-all) FALLA la build si los
 * números de los dos archivos se desalinean — no hace falta confiar en la
 * memoria de quien edite uno de los dos.
 */

export type PlanId = 'single_pdf' | 'credits_pack_5' | 'credits_pack_10' | 'pro' | 'enterprise';

export interface PricingCatalogEntry {
  id: PlanId;
  label: string;
  /** Precio de referencia en USD — lo cobran PayPal y Lemon Squeezy. */
  usd: number;
  /** Precio en ARS — lo cobra Mercado Pago. */
  ars: number;
  /** Créditos de exportación/publicación que otorga esta compra. Los planes de suscripción no consumen créditos (son ilimitados mientras estén activos). */
  credits: number | 'unlimited';
  /** true = suscripción mensual recurrente. false = pago único. */
  recurring: boolean;
}

export const PRICING_CATALOG: PricingCatalogEntry[] = [
  { id: 'single_pdf', label: '1 Exportación de PDF / Publicación', usd: 2.0, ars: 1900, credits: 1, recurring: false },
  { id: 'credits_pack_5', label: 'Pack 5 Créditos', usd: 8.0, ars: 7500, credits: 5, recurring: false },
  { id: 'credits_pack_10', label: 'Pack 10 Créditos', usd: 14.0, ars: 12500, credits: 10, recurring: false },
  { id: 'pro', label: 'LEECV Pro', usd: 19.0, ars: 18500, credits: 'unlimited', recurring: true },
  { id: 'enterprise', label: 'LEECV Enterprise + Cloud', usd: 29.0, ars: 28500, credits: 'unlimited', recurring: true },
];

export function getPrice(planId: PlanId): PricingCatalogEntry {
  const entry = PRICING_CATALOG.find((p) => p.id === planId);
  if (!entry) throw new Error(`Plan de precio desconocido: ${planId}`);
  return entry;
}

/** "$19 USD" / "$1.900 ARS" — formateo consistente para mostrar en botones y tarjetas. */
export function formatPrice(planId: PlanId, currency: 'usd' | 'ars'): string {
  const entry = getPrice(planId);
  if (currency === 'ars') {
    return `$${entry.ars.toLocaleString('es-AR')} ARS`;
  }
  // USD sin decimales cuando es entero (19 en vez de 19.00), con decimales cuando no (1.50).
  const usdDisplay = Number.isInteger(entry.usd) ? entry.usd.toString() : entry.usd.toFixed(2);
  return `$${usdDisplay} USD`;
}

export function formatPricePerMonth(planId: PlanId, currency: 'usd' | 'ars'): string {
  return `${formatPrice(planId, currency)}/mes`;
}
