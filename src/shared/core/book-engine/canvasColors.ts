/**
 * Resolutor de colores para Canvas 2D.
 *
 * HTML Canvas NO entiende `var(--token)` — asignar un string "var(--...)" a
 * `ctx.fillStyle` es inválido y el navegador lo ignora en silencio, dejando el
 * canvas en el color por defecto (#000000, negro puro). Esto produjo las tapas
 * y contratapas completamente negras.
 *
 * Este módulo convierte cualquier valor de color en algo que Canvas sí entiende:
 *  - Hex / rgb() / hsl() / un nombre seguro de color → pasa tal cual.
 *  - `var(--token)` → se resuelve con getComputedStyle() en el navegador; si no
 *    está disponible o el valor no es un color usable (Worker, jsdom, tests),
 *    cae en una tabla de respaldo con los hex del tema claro.
 *  - Cualquier otra cosa → el `fallback` recibido (nunca #000000 implícito).
 */

export const CANVAS_FALLBACK_HEX: Record<string, string> = {
  // Acentos principales (tema claro, ver src/index.css :root)
  '--color-accent-amber': '#FFC93C',
  '--color-accent-base': '#FF2E63',
  '--color-accent-orange': '#F97316',
  '--color-secondary-base': '#00A8A0',
  '--color-secondary-bright': '#00C4BC',
  '--color-status-success-base': '#1D9E75',
  '--color-status-danger-base': '#D14D4D',
  '--color-accent-purple': '#7C3AED',
  '--color-accent-purple-bright': '#6D28D9',
  // "On base" (texto sobre los acentos)
  '--color-accent-on-base': '#0F172A',
  '--color-secondary-on-base': '#0F172A',
  '--color-status-success-on-base': '#0F172A',
  '--color-accent-purple-on-base': '#0F172A',
  // Botones outline
  '--ui-btn-outline-bg': '#FFFFFF',
  // Fondos
  '--ui-bg-surface': '#FFFFFF',
  '--ui-bg-card': '#FFFFFF',
};

export const COVER_FALLBACK_BG = '#1a1a2e';
export const COVER_FALLBACK_TEXT = '#bafdc1';

// Nombre de token dentro de var( --token ) o var( --token, respaldo )
const VAR_RE = /var\(\s*(--[a-zA-Z0-9_-]+)/;
// Hex de 3/4/6/8 dígitos
const HEX_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const FUNC_RE = /^(?:rgb|rgba|hsl|hsla)\(\s*[^)]+\)$/i;
// Nombres de color permitidos (seguros para Canvas, sin variantes "inventadas")
const SAFE_NAMED_COLORS = new Set([
  'white', 'black', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
  'brown', 'pink', 'cyan', 'magenta', 'silver', 'gold', 'navy', 'teal',
  'maroon', 'olive', 'lime', 'aqua', 'coral', 'tomato', 'salmon', 'khaki',
  'ivory', 'beige', 'crimson', 'indigo', 'orchid', 'plum', 'turquoise',
  'violet', 'transparent', 'gray', 'grey',
]);

function isDirectCanvasColor(value: string): boolean {
  if (HEX_RE.test(value)) return true;
  if (FUNC_RE.test(value)) return true;
  return SAFE_NAMED_COLORS.has(value.toLowerCase());
}

function readComputedCssVar(varName: string): string | null {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return null;
    if (typeof window.getComputedStyle !== 'function') return null;
    const resolved = window.getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return resolved.length > 0 ? resolved : null;
  } catch {
    return null;
  }
}

/**
 * Resuelve un valor de color a algo que Canvas 2D entiende de verdad.
 * Nunca devuelve un string "var(...)" ni un negro implícito.
 */
export function resolveCanvasColor(value: string | null | undefined, fallback: string): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return fallback;

  const varMatch = trimmed.match(VAR_RE);
  if (!varMatch) {
    return isDirectCanvasColor(trimmed) ? trimmed : fallback;
  }

  const varName = varMatch[1];

  const computed = readComputedCssVar(varName);
  if (computed && !computed.includes('var(') && isDirectCanvasColor(computed)) {
    return computed;
  }

  const backup = CANVAS_FALLBACK_HEX[varName];
  if (backup) return backup;

  return fallback;
}
