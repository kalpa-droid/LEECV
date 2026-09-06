import { commonCatalog } from './catalog/common';
import { navbarCatalog } from './catalog/navbar';
import { pricingCatalog } from './catalog/pricing';
import { checkoutCatalog } from './catalog/checkout';
import { dashboardCatalog } from './catalog/dashboard';
import { agencyCatalog } from './catalog/agency';
import { bannersCatalog } from './catalog/banners';
import { retentionCatalog } from './catalog/retention';
import { validationCatalog } from './catalog/validation';

export const textCatalog = {
  common: commonCatalog,
  navbar: navbarCatalog,
  pricing: pricingCatalog,
  checkout: checkoutCatalog,
  dashboard: dashboardCatalog,
  agency: agencyCatalog,
  banners: bannersCatalog,
  retention: retentionCatalog,
  validation: validationCatalog,
};

export type TextCatalog = typeof textCatalog;

export function useText(): TextCatalog {
  return textCatalog;
}

export const t = textCatalog;
