import { commonCatalog } from './catalog/common';
import { navbarCatalog } from './catalog/navbar';

export const textCatalog = {
  common: commonCatalog,
  navbar: navbarCatalog,
};

export type TextCatalog = typeof textCatalog;

export function useText(): TextCatalog {
  return textCatalog;
}

export const t = textCatalog;
