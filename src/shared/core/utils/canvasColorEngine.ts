import { colorSystem } from '../uiDesignSystem';

/**
 * Resuelve un token de color o variable CSS a un string hex/RGB válido
 * para su consumo directo en HTML5 Canvas 2D (ctx.fillStyle, ctx.strokeStyle).
 *
 * @param colorSpec Token del colorSystem (ej: 'accent.base', 'purple.base'), variable CSS (ej: 'var(--color-purple-base)') o hex directo.
 * @param fallbackHex Hexadecimal de respaldo si el token no se resuelve.
 */
export function resolveCanvasColor(colorSpec: string, fallbackHex: string = '#000000'): string {
  if (!colorSpec) return fallbackHex;

  // 1. Si ya es un valor hexadecimal o RGB/RGBA directo, retornarlo tal cual
  if (colorSpec.startsWith('#') || colorSpec.startsWith('rgb')) {
    return colorSpec;
  }

  // 2. Si es una llamada var(--variable-css)
  if (colorSpec.startsWith('var(')) {
    const varName = colorSpec.replace(/^var\(/, '').replace(/\)$/, '').trim();
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      if (computed && (computed.startsWith('#') || computed.startsWith('rgb'))) {
        return computed;
      }
    }
  }

  // 3. Si es un token formateado del colorSystem (ej: 'purple.base', 'neutral.surface', 'accent.amber')
  const parts = colorSpec.split('.');
  if (parts.length >= 2) {
    let curr: any = colorSystem;
    for (const p of parts) {
      if (curr && typeof curr === 'object') {
        curr = curr[p];
      } else {
        curr = null;
        break;
      }
    }
    if (typeof curr === 'string' && (curr.startsWith('#') || curr.startsWith('rgb'))) {
      return curr;
    }
  }

  // 4. Mapeo directo por claves conocidas
  if (colorSpec === 'purple' || colorSpec === 'purple.base') return colorSystem.purple.base;
  if (colorSpec === 'accent' || colorSpec === 'accent.base') return colorSystem.accent.base;
  if (colorSpec === 'amber' || colorSpec === 'accent.amber') return colorSystem.amber.base;
  if (colorSpec === 'surface') return colorSystem.neutral.surface;

  return fallbackHex;
}
