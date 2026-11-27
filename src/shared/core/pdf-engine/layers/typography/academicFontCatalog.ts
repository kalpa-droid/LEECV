/**
 * Catálogo de Fuentes Universitarias y Google Fonts compatibles con `@react-pdf/renderer` (.ttf).
 * Expone los nombres que exigen las cátedras (Times New Roman, Arial, Calibri, Georgia, Garamond,
 * Computer Modern) respaldados por sus equivalentes métricos 1:1 libres de licencia cuando el usuario
 * no conecta sus fuentes locales de Windows.
 */

export interface AcademicFontSpec {
  /** Nombre visible en el selector (ej. "Times New Roman"). */
  family: string;
  /** Categoría tipográfica para fallback seguro. */
  category: 'serif' | 'sans' | 'mono';
  /** Equivalente métrico 1:1 libre de licencia (Tinos, Arimo, Carlito, etc.). */
  openEquivalentName: string;
  /** Normas académicas donde está explícitamente aceptada. */
  norms: readonly ('apa7' | 'chicago' | 'mla' | 'vancouver' | 'ieee' | 'libre')[];
  /** Tamaño recomendado en pt para esa norma. */
  recommendedSizePt: number;
  /** Descripción breve en lenguaje sencillo. */
  badge: string;
  /** URLs .ttf directas (Regular, Bold, Italic, BoldItalic) para Font.register(). */
  ttfUrls: {
    regular: string;
    bold?: string;
    italic?: string;
    boldItalic?: string;
  };
  /** Rutas locales servidas desde /public para evitar latencia/CORS en producción. */
  localTtfUrls?: {
    regular: string;
    bold?: string;
    italic?: string;
    boldItalic?: string;
  };
}

export const ACADEMIC_FONT_CATALOG: readonly AcademicFontSpec[] = [
  {
    family: 'Times New Roman',
    category: 'serif',
    openEquivalentName: 'Tinos',
    norms: ['apa7', 'chicago', 'mla', 'libre'],
    recommendedSizePt: 12,
    badge: 'APA 7 · Chicago · MLA (12 pt)',
    localTtfUrls: {
      regular: '/fonts/editorial/Tinos-Regular.ttf',
      bold: '/fonts/editorial/Tinos-Bold.ttf',
      italic: '/fonts/editorial/Tinos-Italic.ttf',
      boldItalic: '/fonts/editorial/Tinos-BoldItalic.ttf',
    },
    ttfUrls: {
      regular: 'https://cdn.jsdelivr.net/fontsource/fonts/tinos@latest/latin-400-normal.ttf',
      bold: 'https://cdn.jsdelivr.net/fontsource/fonts/tinos@latest/latin-700-normal.ttf',
      italic: 'https://cdn.jsdelivr.net/fontsource/fonts/tinos@latest/latin-400-italic.ttf',
      boldItalic: 'https://cdn.jsdelivr.net/fontsource/fonts/tinos@latest/latin-700-italic.ttf',
    },
  },
  {
    family: 'Arial',
    category: 'sans',
    openEquivalentName: 'Arimo',
    norms: ['apa7', 'vancouver', 'ieee', 'libre'],
    recommendedSizePt: 11,
    badge: 'APA 7 · Monografías · Informes (11 pt)',
    localTtfUrls: {
      regular: '/fonts/editorial/Arimo-Regular.ttf',
      bold: '/fonts/editorial/Arimo-Bold.ttf',
      italic: '/fonts/editorial/Arimo-Italic.ttf',
      boldItalic: '/fonts/editorial/Arimo-BoldItalic.ttf',
    },
    ttfUrls: {
      regular: 'https://cdn.jsdelivr.net/fontsource/fonts/arimo@latest/latin-400-normal.ttf',
      bold: 'https://cdn.jsdelivr.net/fontsource/fonts/arimo@latest/latin-700-normal.ttf',
      italic: 'https://cdn.jsdelivr.net/fontsource/fonts/arimo@latest/latin-400-italic.ttf',
      boldItalic: 'https://cdn.jsdelivr.net/fontsource/fonts/arimo@latest/latin-700-italic.ttf',
    },
  },
  {
    family: 'Calibri',
    category: 'sans',
    openEquivalentName: 'Carlito',
    norms: ['apa7', 'libre'],
    recommendedSizePt: 11,
    badge: 'APA 7 · Estándar Word (11 pt)',
    ttfUrls: {
      regular: 'https://cdn.jsdelivr.net/fontsource/fonts/carlito@latest/latin-400-normal.ttf',
      bold: 'https://cdn.jsdelivr.net/fontsource/fonts/carlito@latest/latin-700-normal.ttf',
      italic: 'https://cdn.jsdelivr.net/fontsource/fonts/carlito@latest/latin-400-italic.ttf',
      boldItalic: 'https://cdn.jsdelivr.net/fontsource/fonts/carlito@latest/latin-700-italic.ttf',
    },
  },
  {
    family: 'Georgia',
    category: 'serif',
    openEquivalentName: 'Gelasio',
    norms: ['apa7', 'libre'],
    recommendedSizePt: 11,
    badge: 'APA 7 · Ensayos y Lectura (11 pt)',
    ttfUrls: {
      regular: 'https://cdn.jsdelivr.net/fontsource/fonts/gelasio@latest/latin-400-normal.ttf',
      bold: 'https://cdn.jsdelivr.net/fontsource/fonts/gelasio@latest/latin-700-normal.ttf',
      italic: 'https://cdn.jsdelivr.net/fontsource/fonts/gelasio@latest/latin-400-italic.ttf',
      boldItalic: 'https://cdn.jsdelivr.net/fontsource/fonts/gelasio@latest/latin-700-italic.ttf',
    },
  },
  {
    family: 'Garamond',
    category: 'serif',
    openEquivalentName: 'EB Garamond',
    norms: ['chicago', 'libre'],
    recommendedSizePt: 12,
    badge: 'Libros · Novelas · Humanidades (12 pt)',
    ttfUrls: {
      regular: 'https://cdn.jsdelivr.net/fontsource/fonts/eb-garamond@latest/latin-400-normal.ttf',
      bold: 'https://cdn.jsdelivr.net/fontsource/fonts/eb-garamond@latest/latin-700-normal.ttf',
      italic: 'https://cdn.jsdelivr.net/fontsource/fonts/eb-garamond@latest/latin-400-italic.ttf',
      boldItalic: 'https://cdn.jsdelivr.net/fontsource/fonts/eb-garamond@latest/latin-700-italic.ttf',
    },
  },
  {
    family: 'Computer Modern',
    category: 'serif',
    openEquivalentName: 'Newsreader',
    norms: ['apa7', 'ieee', 'libre'],
    recommendedSizePt: 10,
    badge: 'APA 7 · Ciencias Exactas (10 pt)',
    ttfUrls: {
      regular: 'https://cdn.jsdelivr.net/fontsource/fonts/newsreader@latest/latin-400-normal.ttf',
      bold: 'https://cdn.jsdelivr.net/fontsource/fonts/newsreader@latest/latin-700-normal.ttf',
      italic: 'https://cdn.jsdelivr.net/fontsource/fonts/newsreader@latest/latin-400-italic.ttf',
      boldItalic: 'https://cdn.jsdelivr.net/fontsource/fonts/newsreader@latest/latin-700-italic.ttf',
    },
  },
  {
    family: 'Lora',
    category: 'serif',
    openEquivalentName: 'Lora',
    norms: ['libre'],
    recommendedSizePt: 11,
    badge: 'Google Font · Editorial Moderna',
    ttfUrls: {
      regular: 'https://cdn.jsdelivr.net/fontsource/fonts/lora@latest/latin-400-normal.ttf',
      bold: 'https://cdn.jsdelivr.net/fontsource/fonts/lora@latest/latin-700-normal.ttf',
      italic: 'https://cdn.jsdelivr.net/fontsource/fonts/lora@latest/latin-400-italic.ttf',
      boldItalic: 'https://cdn.jsdelivr.net/fontsource/fonts/lora@latest/latin-700-italic.ttf',
    },
  },
  {
    family: 'Inter',
    category: 'sans',
    openEquivalentName: 'Inter',
    norms: ['libre', 'ieee'],
    recommendedSizePt: 10.5,
    badge: 'Google Font · Informes y Guías',
    ttfUrls: {
      regular: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf',
      bold: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf',
      italic: 'https://cdn.jsdelivr.net/fontsource/fonts/arimo@latest/latin-400-italic.ttf',
      boldItalic: 'https://cdn.jsdelivr.net/fontsource/fonts/arimo@latest/latin-700-italic.ttf',
    },
  },
];

export function findAcademicFontSpec(family?: string): AcademicFontSpec | undefined {
  if (!family) return undefined;
  const lower = family.trim().toLowerCase();
  return ACADEMIC_FONT_CATALOG.find(
    (f) => f.family.toLowerCase() === lower || f.openEquivalentName.toLowerCase() === lower,
  );
}

/**
 * Resuelve nombres Type1 legacy (Times-Roman / Helvetica / sans-serif) a una familia Unicode
 * completa con soporte TTF local (Tinos / Arimo) para el motor editorial.
 */
export function resolveDefaultUnicodeFontForPreset(rawFamily?: string): string {
  const clean = String(rawFamily || '').trim();
  if (!clean) return 'Times New Roman';
  const spec = findAcademicFontSpec(clean);
  if (spec) return spec.family;
  const lower = clean.toLowerCase();
  if (lower.startsWith('times') || lower === 'serif') return 'Times New Roman';
  if (lower.startsWith('helvetica') || lower === 'sans' || lower === 'sans-serif') return 'Arial';
  return clean;
}
