import { commonCatalog } from './catalog/common';
import { navbarCatalog } from './catalog/navbar';
import { pricingCatalog } from './catalog/pricing';

export const textCatalog = {
  common: commonCatalog,
  navbar: navbarCatalog,
  pricing: pricingCatalog,
};

export type TextCatalog = typeof textCatalog;

export function useText(): TextCatalog {
  return textCatalog;
}

export const t = textCatalog;
