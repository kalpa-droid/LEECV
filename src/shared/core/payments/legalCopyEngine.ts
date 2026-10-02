import { PRICING_CATALOG } from './pricingCatalog';
import { PLAN_FEATURES } from '../entitlements/useEntitlements';

// Junta labels en español natural: ["A","B","C"] -> "A, B y C"
function joinNatural(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? '';
  return `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`;
}

export function getRecurringPlanLabels(): string[] {
  return PRICING_CATALOG.filter(p => p.recurring).map(p => p.label);
}

export function getOneTimePackLabels(): string[] {
  // Paquetes de créditos propiamente dichos, sin contar la exportación suelta
  return PRICING_CATALOG.filter(p => !p.recurring && p.credits !== 1).map(p => p.label);
}

export function getRecurringPlansSentence(): string {
  return joinNatural(getRecurringPlanLabels());
}

export function getPacksSentence(): string {
  return joinNatural(getOneTimePackLabels());
}

export function getAllPlansOfferingSentence(): string {
  const free = PLAN_FEATURES.free.label;
  const paid = PRICING_CATALOG.map(p => p.label);
  return joinNatural([free, ...paid]);
}
