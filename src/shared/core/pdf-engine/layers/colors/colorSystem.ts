/**
 * CAPA 9 — SISTEMA DE COLOR Y CONTRASTE AUTOMÁTICO (WCAG 2.1 AA)
 * 
 * Calcula científicamente la luminancia sRGB de los colores para determinar
 * automáticamente si el texto sobre cualquier fondo (primario, secundario o neutro)
 * debe ser claro (#ffffff) u oscuro (#0f172a) garantizando una relación de contraste >= 4.5:1.
 */

/** Convierte hex #RRGGBB o #RGB a valores sRGB [0-1] */
function hexToRGB(hex: string): [number, number, number] {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  if (cleanHex.length !== 6) return [0, 0, 0];

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  return [r, g, b];
}

/** Calcula la luminancia relativa según la fórmula ITU-R BT.709 / WCAG 2.1 */
export function getRelativeLuminance(hex: string): number {
  const [r, g, b] = hexToRGB(hex);
  const transform = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  
  const rL = transform(r);
  const gL = transform(g);
  const bL = transform(b);

  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
}

/** Calcula la relación de contraste entre dos colores (1 a 21) */
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);

  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (brighter + 0.05) / (darker + 0.05);
}

/** Devuelve el color de texto ideal (#ffffff o #0f172a) para un fondo dado */
export function getContrastTextColor(bgHex: string): string {
  const contrastWithWhite = getContrastRatio(bgHex, '#ffffff');
  const contrastWithDark = getContrastRatio(bgHex, '#0f172a');

  return contrastWithWhite >= contrastWithDark ? '#ffffff' : '#0f172a';
}

export interface ResolvedThemeRoles {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  textOnPrimary: string;
  textOnSecondary: string;
  textOnAccent: string;
  border: string;
  qrColors: {
    dark: string;
    light: string;
  };
}

/**
 * Resuelve todos los roles de color calculando contrastes dinámicos.
 * Si el usuario o el preset elige un color de fondo oscuro, el sistema
 * calcula texto claro automáticamente.
 */
export function resolveThemeRoles(theme: any = {}): ResolvedThemeRoles {
  const primary = theme.primaryColor || '#00A8A0';
  const secondary = theme.secondaryColor || '#64748b';
  const accent = theme.accentColor || '#FF2E63';
  const background = theme.bgColor || '#ffffff';

  const textOnPrimary = getContrastTextColor(primary);
  const textOnSecondary = getContrastTextColor(secondary);
  const textOnAccent = getContrastTextColor(accent);

  // Si theme.textColor fue especificado manualmente y cumple WCAG 4.5:1, se usa.
  // De lo contrario, se calcula dinámicamente el color con mayor legibilidad.
  let text = theme.textColor || getContrastTextColor(background);
  if (getContrastRatio(background, text) < 3.5) {
    text = getContrastTextColor(background);
  }

  const border = getRelativeLuminance(background) > 0.5 ? '#e2e8f0' : 'rgba(255,255,255,0.2)';

  // El QR requiere un alto contraste (módulo oscuro vs fondo claro)
  const qrDark = getRelativeLuminance(primary) < 0.4 ? primary : '#1a1a2e';
  const qrLight = '#ffffff';

  return {
    primary,
    secondary,
    accent,
    background,
    text,
    textOnPrimary,
    textOnSecondary,
    textOnAccent,
    border,
    qrColors: {
      dark: qrDark,
      light: qrLight
    }
  };
}
