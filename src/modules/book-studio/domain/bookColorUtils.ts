/**
 * Utilidades puras de color para el selector de color propio de tapa, contratapa
 * y separadores (Book Studio). Sin DOM: se pueden testear en Vitest.
 */
import { CANVAS_FALLBACK_HEX, COVER_FALLBACK_BG } from '../../../shared/kits/print-imposition/canvasColors';

/** Tinta clara y oscura que se alternan según el fondo elegido (desde el catálogo de canvas). */
export const BOOK_INK_LIGHT = CANVAS_FALLBACK_HEX['--ui-btn-outline-bg'];
export const BOOK_INK_DARK = CANVAS_FALLBACK_HEX['--color-accent-on-base'];

/** Fondo inicial cuando todavía no hay color propio ni preset resoluble. */
export const BOOK_DEFAULT_CUSTOM_BG = COVER_FALLBACK_BG.toUpperCase();

/** Convierte `#rgb`, `#rrggbb` o `rgb(r,g,b)` a `#RRGGBB` (o null si no se puede). */
export function toHex6(css: string | null | undefined): string | null {
  const v = (css ?? '').trim();
  const hex = v.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})(?:[0-9a-fA-F]{2})?$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return `#${h.toUpperCase()}`;
  }
  const fn = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
  if (fn) {
    const part = (n: string) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0');
    return `#${part(fn[1])}${part(fn[2])}${part(fn[3])}`.toUpperCase();
  }
  return null;
}

/** Luminancia relativa WCAG de un color `#RRGGBB`. */
export function relativeLuminance(hex6: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex6.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

/** Tinta (clara u oscura) con mejor contraste sobre el fondo dado. */
export function getAutoContrastTextColor(bgCss: string): string {
  const hex = toHex6(bgCss) ?? BOOK_DEFAULT_CUSTOM_BG;
  const lum = relativeLuminance(hex);
  const contrastWithLight = 1.05 / (lum + 0.05);
  const contrastWithDark = (lum + 0.05) / (relativeLuminance(BOOK_INK_DARK) + 0.05);
  return contrastWithLight >= contrastWithDark ? BOOK_INK_LIGHT : BOOK_INK_DARK;
}
