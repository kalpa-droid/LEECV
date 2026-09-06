import { commonCatalog } from './catalog/common';
import { navbarCatalog } from './catalog/navbar';
import { pricingCatalog } from './catalog/pricing';
import { checkoutCatalog } from './catalog/checkout';
import { dashboardCatalog } from './catalog/dashboard';

export const textCatalog = {
  common: commonCatalog,
  navbar: navbarCatalog,
  pricing: pricingCatalog,
  checkout: checkoutCatalog,
  dashboard: dashboardCatalog,
};

export type TextCatalog = typeof textCatalog;

export function useText(): TextCatalog {
  return textCatalog;
}

export const t = textCatalog;
