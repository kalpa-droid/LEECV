/**
 * NÚCLEO CANÓNICO DE PRECIOS (Backend / Serverless)
 *
 * GEMELO de src/shared/core/payments/pricingCatalog.ts — ver el comentario
 * de ese archivo para el porqué de la duplicación (Vercel/@vercel/nft no
 * resuelve imports de api/ hacia src/). `npm run verify:pricing-sync`
 * (parte de check-all) compara ambos archivos número por número y rompe la
 * build si alguien edita uno sin el otro.
 *
 * checkoutInitiators.ts usa estos valores como default de cada env var —
 * el default y la env var terminan siendo la MISMA fuente de verdad en vez
 * de dos números que alguien tiene que acordarse de mantener iguales.
 */

export type PlanId = 'single_pdf' | 'credits_pack_5' | 'credits_pack_10' | 'pro' | 'enterprise';

export interface PricingCatalogEntry {
  id: PlanId;
  usd: number;
  ars: number;
}

export const PRICING_CATALOG: PricingCatalogEntry[] = [
  { id: 'single_pdf', usd: 2.0, ars: 1900 },
  { id: 'credits_pack_5', usd: 8.0, ars: 7500 },
  { id: 'credits_pack_10', usd: 14.0, ars: 12500 },
  { id: 'pro', usd: 19.0, ars: 18500 },
  { id: 'enterprise', usd: 29.0, ars: 28500 },
];

export function getPrice(planId: string): PricingCatalogEntry | undefined {
  return PRICING_CATALOG.find((p) => p.id === planId);
}
