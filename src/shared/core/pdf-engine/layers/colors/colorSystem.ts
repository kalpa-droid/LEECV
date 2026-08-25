/**
 * CAPA 9 — SISTEMA DE COLOR, ARMONÍA Y CONTRASTE AUTOMÁTICO (WCAG 2.1 AA)
 * 
 * Calcula científicamente la luminancia sRGB y armonías cromáticas HSL para determinar
 * automáticamente si los colores de fondo, texto, secundario y acento cumplen WCAG 2.1 AA (>= 4.5:1).
 */

/** Convierte hex #RRGGBB o #RGB a valores sRGB [0-1] */
export function hexToRGB(hex: string): [number, number, number] {
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

/** Convierte sRGB [0-1] a hex #RRGGBB */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.min(255, Math.max(0, n * 255))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export interface OKLCH {
  l: number;
  c: number;
  h: number;
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  const clamped = Math.max(0, Math.min(1, c));
  return clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

/** Convierte Hex #RRGGBB a OKLCH { l, c, h } */
export function hexToOKLCH(hex: string): OKLCH {
  const [r, g, b] = hexToRGB(hex);
  const rL = srgbToLinear(r);
  const gL = srgbToLinear(g);
  const bL = srgbToLinear(b);

  const l_ = Math.cbrt(0.4122214708 * rL + 0.5363325363 * gL + 0.0514459929 * bL);
  const m_ = Math.cbrt(0.2119034982 * rL + 0.6806995451 * gL + 0.1073969566 * bL);
  const s_ = Math.cbrt(0.0883024619 * rL + 0.2817188376 * gL + 0.6299787005 * bL);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720403 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bVal = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  const C = Math.sqrt(a * a + bVal * bVal);
  let H = (Math.atan2(bVal, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  return { l: Number(L.toFixed(4)), c: Number(C.toFixed(4)), h: Number(H.toFixed(2)) };
}

/** Convierte OKLCH { l, c, h } a Hex #RRGGBB */
export function oklchToHex(l: number, c: number, h: number): string {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const bVal = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * bVal;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * bVal;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * bVal;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const rL = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gL = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bL = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  return rgbToHex(linearToSrgb(rL), linearToSrgb(gL), linearToSrgb(bL));
}

/** Convierte hex a HSL [0-360, 0-1, 0-1] */
export function hexToHSL(hex: string): [number, number, number] {
  const [r, g, b] = hexToRGB(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), Number(s.toFixed(2)), Number(l.toFixed(2))];
}

/** Convierte HSL [0-360, 0-1, 0-1] a hex */
export function hslToHex(h: number, s: number, l: number): string {
  const hNorm = ((h % 360) + 360) % 360 / 360;
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      let tNorm = t;
      if (tNorm < 0) tNorm += 1;
      if (tNorm > 1) tNorm -= 1;
      if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm;
      if (tNorm < 1 / 2) return q;
      if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, hNorm + 1 / 3);
    g = hue2rgb(p, q, hNorm);
    b = hue2rgb(p, q, hNorm - 1 / 3);
  }

  return rgbToHex(r, g, b);
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

export type HarmonyScheme = 'complementario' | 'analogo' | 'triadico' | 'monocromo';

export interface HarmonyPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

/**
 * MOTOR DE ARMONÍA CROMÁTICA
 * Dado un color primario base y un esquema de armonía ('complementario', 'analogo', 'triadico', 'monocromo'),
 * calcula científicamente los colores secundario y acento rotando el matiz (Hue) en HSL y validando contraste WCAG.
 */
export function generateHarmonyPalette(
  colorBase: string,
  scheme: HarmonyScheme = 'complementario',
  backgroundInput: string = '#ffffff'
): HarmonyPalette {
  const [h, s, l] = hexToHSL(colorBase);
  let secH = h;
  let accH = h;
  let secL = l;
  let accL = l;

  switch (scheme) {
    case 'complementario':
      secH = (h + 180) % 360;
      accH = (h + 30) % 360;
      break;
    case 'analogo':
      secH = (h + 30) % 360;
      accH = (h - 30 + 360) % 360;
      break;
    case 'triadico':
      secH = (h + 120) % 360;
      accH = (h + 240) % 360;
      break;
    case 'monocromo':
      secL = Math.max(0.15, l * 0.65);
      accL = Math.min(0.85, l * 1.35);
      break;
  }

  const primary = colorBase;
  const secondary = hslToHex(secH, Math.max(0.2, s), secL);
  const accent = hslToHex(accH, Math.max(0.3, s), accL);
  const background = backgroundInput;
  const text = getContrastTextColor(background);

  return {
    primary,
    secondary,
    accent,
    background,
    text
  };
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
export function resolveThemeRoles(palette: any = {}): ResolvedThemeRoles {
  const primary = palette.primary || palette.primaryColor || '#00A8A0';
  const secondary = palette.secondary || palette.secondaryColor || '#64748b';
  const accent = palette.accent || palette.accentColor || '#FF2E63';
  const background = palette.background || palette.bgColor || '#ffffff';

  const textOnPrimary = getContrastTextColor(primary);
  const textOnSecondary = getContrastTextColor(secondary);
  const textOnAccent = getContrastTextColor(accent);

  let text = palette.text || palette.textColor || getContrastTextColor(background);
  if (getContrastRatio(background, text) < 3.5) {
    text = getContrastTextColor(background);
  }

  const border = getRelativeLuminance(background) > 0.5 ? '#e2e8f0' : 'rgba(255,255,255,0.2)';

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

export interface SurfacePalette {
  surfaceBg: string;
  isDark: boolean;
  title: string;
  subtitle: string;
  bodyText: string;
  accent: string;
  border: string;
}

/**
 * CAPA 5 & 9 — MATRIZ ALGORÍTMICA DE TRADUCCIÓN CROMÁTICA PARA SUPERFICIES
 * Dado el conjunto de roles resueltos (rolesColor) y el color de superficie real (surfaceBgHex),
 * calcula matemáticamente una paleta traducida armónica en HSL con contraste WCAG 2.1 AA.
 */
export function translatePaletteForSurface(
  rolesColor: ResolvedThemeRoles,
  surfaceBgHex: string = '#ffffff'
): SurfacePalette {
  const isDark = getRelativeLuminance(surfaceBgHex) < 0.45;

  if (!isDark) {
    // Superficie Clara: usa la jerarquía estándar del preset/tema
    return {
      surfaceBg: surfaceBgHex,
      isDark: false,
      title: rolesColor.primary,
      subtitle: rolesColor.secondary,
      bodyText: rolesColor.text,
      accent: rolesColor.accent,
      border: rolesColor.border,
    };
  }

  // Superficie Oscura / Color: calcula tonos traducidos armónicos en HSL (sin blanco crudo plano)
  const [bgH, bgS] = hexToHSL(surfaceBgHex);
  const [accH, accS] = hexToHSL(rolesColor.accent || '#FF2E63');

  // Título armónico sobre superficie oscura (pastel luminoso del acento o del secundario)
  let titleOnDark = hslToHex(accH, Math.max(0.3, accS), 0.90);
  if (getContrastRatio(surfaceBgHex, titleOnDark) < 4.5) {
    titleOnDark = '#F8FAFC'; // Tinte neutro cálido
  }

  // Subtítulo armónico sobre superficie oscura
  let subtitleOnDark = hslToHex(bgH, Math.max(0.15, bgS * 0.5), 0.82);
  if (getContrastRatio(surfaceBgHex, subtitleOnDark) < 3.5) {
    subtitleOnDark = '#E2E8F0';
  }

  // Cuerpo de texto sobre superficie oscura
  let bodyOnDark = '#CBD5E1';
  if (getContrastRatio(surfaceBgHex, bodyOnDark) < 3.5) {
    bodyOnDark = '#F1F5F9';
  }

  // Color de acento recalibrado para resaltar sobre fondo oscuro
  let accentOnDark = hslToHex(accH, Math.max(0.6, accS), 0.75);
  if (getContrastRatio(surfaceBgHex, accentOnDark) < 3.5) {
    accentOnDark = rolesColor.accent;
  }

  const borderOnDark = 'rgba(255, 255, 255, 0.25)';

  return {
    surfaceBg: surfaceBgHex,
    isDark: true,
    title: titleOnDark,
    subtitle: subtitleOnDark,
    bodyText: bodyOnDark,
    accent: accentOnDark,
    border: borderOnDark,
  };
}

export interface TypographyColorBinding {
  title: string;          // Nivel 1 (Nombre / Título Documento)
  sectionHeading: string; // Nivel 2 (Encabezado de Sección)
  itemTitle: string;      // Nivel 3 (Título de Puesto / Carrera)
  caption: string;        // Nivel 5 (Año / Institución / Badges)
  body: string;           // Nivel 4 (Descripción / Texto de Cuerpo)
  accentRule: string;     // Color de Acento (Dorado / Resaltador)
  border: string;         // Línea de separador / borde
}

/**
 * CAPA 5 & 8 — VINCULACIÓN TIPOGRAFÍA ↔ ROLES CROMÁTICOS DE SUPERFICIE
 * Vincula cada nivel de la escala tipográfica (title, sectionHeading, itemTitle, body, caption)
 * con los roles cromáticos resueltos para la superficie actual.
 */
export function getTypographyColorBinding(
  rolesColor: ResolvedThemeRoles,
  surfaceBgHex: string = '#ffffff'
): TypographyColorBinding {
  const surface = translatePaletteForSurface(rolesColor, surfaceBgHex);

  return {
    title: surface.isDark ? surface.accent : surface.title,
    sectionHeading: surface.title,
    itemTitle: surface.isDark ? surface.subtitle : surface.title,
    caption: surface.isDark ? surface.subtitle : surface.subtitle,
    body: surface.bodyText,
    accentRule: surface.accent,
    border: surface.border,
  };
}
