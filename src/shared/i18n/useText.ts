import { commonCatalog } from './catalog/common';
import { navbarCatalog } from './catalog/navbar';
import { pricingCatalog } from './catalog/pricing';
import { checkoutCatalog } from './catalog/checkout';
import { dashboardCatalog } from './catalog/dashboard';
import { agencyCatalog } from './catalog/agency';
import { bannersCatalog } from './catalog/banners';

export const textCatalog = {
  common: commonCatalog,
  navbar: navbarCatalog,
  pricing: pricingCatalog,
  checkout: checkoutCatalog,
  dashboard: dashboardCatalog,
  agency: agencyCatalog,
  banners: bannersCatalog,
};

export type TextCatalog = typeof textCatalog;

export function useText(): TextCatalog {
  return textCatalog;
}

export const t = textCatalog;
