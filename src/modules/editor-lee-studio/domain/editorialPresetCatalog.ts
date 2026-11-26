/**
 * Núcleo puro — Catálogo completo de 12 Formatos Editoriales de EditorLee (PR 2 — V3.9.0)
 *
 * Expone los 12 formatos explícitos agrupados en:
 * 1. Libros y Literatura (Libro, Novela, Ensayo)
 * 2. Académico e Investigación (Tesis APA 7, Monografía, Artículo IMRyD, Informe)
 * 3. Práctico, Técnico y Libre (Manual, Apunte, Guía, Proyecto, Libre)
 *
 * Conserva además los IDs históricos (`tp-secundaria`, `cientifico-vancouver`,
 * `trabajo-practico-monografia-tesis`) como alias retrocompatibles para borradores previos.
 *
 * Este módulo es PURO (sin React, sin DOM).
 */
import {
  EditorialPresetId,
  EditorialPresetGroup,
  EditorialCoverMode,
  EditorialNormId,
  EditorialStructuralNormId,
  EditorialBibliographyStyle,
  EditorialSection,
  EditorialPrintSides,
  EditorialChapterBreakMode,
  EditorialHeaderMode,
  EditorialFooterMode,
} from './editorialTypes';
import {
  findEditorialSectionDefinition,
  createSectionFromDefinition,
} from './editorialSectionCatalog';

export type { EditorialPresetId, EditorialPresetGroup, EditorialCoverMode };

/** Metadatos visuales de los 3 grupos de obras. */
export const EDITORIAL_PRESET_GROUPS: ReadonlyArray<{
  id: EditorialPresetGroup;
  title: string;
  subtitle: string;
}> = [
  {
    id: 'literario',
    title: 'Libros y Literatura',
    subtitle: 'Edición cuidada de narrativa, ensayos y obras para lectura prolongada.',
  },
  {
    id: 'academico',
    title: 'Académico e Investigación',
    subtitle: 'Reglas formales APA 7, Chicago, Vancouver e informes institucionales.',
  },
  {
    id: 'practico',
    title: 'Práctico, Técnico y Libre',
    subtitle: 'Guías paso a paso, apuntes de cátedra, proyectos y lienzo en blanco.',
  },
];

/** Botones del Dock que activa un preset. */
export interface EditorialPresetDockButtons {
  cover: boolean;
  toc: boolean;
  design: boolean;
  metadata: boolean;
  importAi: boolean;
  addSection: boolean;
  bibliography: boolean;
}

/** Un preset universal de documento editorial. */
export interface EditorialPreset {
  id: EditorialPresetId;
  group: EditorialPresetGroup;
  /** True únicamente para IDs heredados que siguen soportados pero no duplican la grilla de 12 formatos. */
  isLegacyAlias?: boolean;
  label: string;
  shortLabel: string;
  audienceTag: string;
  description: string;
  pageSize: string;               // A4, A5 o Carta // plain-language:allow — código de hoja
  coverMode: EditorialCoverMode;
  coverStyleId: string;
  coverPaletteKey: string;
  structuralNormId: EditorialStructuralNormId;
  normId: EditorialNormId;
  bibliographyStyle: EditorialBibliographyStyle;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
    gutter: number;
  };
  firstLineIndent: boolean;
  bibliographyHangingIndent: boolean;
  /** Modalidad de impresión predeterminada ('simplex' 1 cara vs 'duplex' 2 caras). */
  printSides: EditorialPrintSides;
  /** Inicio de cada capítulo/sección ('odd_page' solo efectivo en duplex, 'next_page', 'continuous'). */
  chapterBreakMode: EditorialChapterBreakMode;
  /** Modo de encabezado superior por defecto. */
  headerMode: EditorialHeaderMode;
  /** Modo de pie de página por defecto. */
  footerMode: EditorialFooterMode;
  /** Ocultar encabezado en la página donde inicia cada capítulo/apartado. */
  suppressHeaderOnChapterStart: boolean;
  /** Numeración romana en minúsculas (i, ii...) para preliminares. */
  preliminaryRomanNumerals: boolean;
  /** Salto automático opcional en subtítulos H2. */
  breakOnH2?: boolean;
  dockButtons: EditorialPresetDockButtons;
  defaultSections: string[];      // ids de secciones iniciales (del catálogo)
  typography: {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
  };
}

/** Catálogo completo (12 formatos principales + 3 alias históricos retrocompatibles). */
export const EDITORIAL_PRESET_CATALOG: EditorialPreset[] = [
  // ── 1. Libros y Literatura ───────────────────────────────────────────
  {
    id: 'libro-ensayo-novela',
    group: 'literario',
    shortLabel: 'Libro',
    audienceTag: 'Literario',
    label: 'Libro / Obra Editorial',
    description: 'Prólogo, capítulos numerados, epílogo y anexos con tapa literaria.',
    pageSize: 'a5',
    coverMode: 'libro',
    coverStyleId: 'monica-classic',
    coverPaletteKey: 'sobrio',
    structuralNormId: 'libre',
    normId: 'libre',
    bibliographyStyle: 'tradicional',
    margins: { top: 20, bottom: 20, left: 18, right: 16, gutter: 22 },
    firstLineIndent: true,
    bibliographyHangingIndent: false,
    printSides: 'duplex',
    chapterBreakMode: 'odd_page',
    headerMode: 'mirror_book_chapter',
    footerMode: 'folio_only',
    suppressHeaderOnChapterStart: true,
    preliminaryRomanNumerals: true,
    dockButtons: {
      cover: true,
      toc: true,
      design: true,
      metadata: true,
      importAi: true,
      addSection: true,
      bibliography: false,
    },
    defaultSections: ['prologo', 'introduccion', 'capitulo', 'capitulo', 'epilogo', 'anexo'],
    typography: { fontFamily: 'Times-Roman', fontSize: 11, lineHeight: 1.5 },
  },
  {
    id: 'novela-literaria',
    group: 'literario',
    shortLabel: 'Novela',
    audienceTag: 'Narrativa',
    label: 'Novela Literaria',
    description: 'Hojas compactas, espacio inicial literario clásico (14 pt) tras el primer párrafo y encabezados discretos.',
    pageSize: 'a5',
    coverMode: 'libro',
    coverStyleId: 'minimal-editorial',
    coverPaletteKey: 'sobrio',
    structuralNormId: 'libre',
    normId: 'libre',
    bibliographyStyle: 'tradicional',
    margins: { top: 20, bottom: 22, left: 18, right: 16, gutter: 22 },
    firstLineIndent: true,
    bibliographyHangingIndent: false,
    printSides: 'duplex',
    chapterBreakMode: 'odd_page',
    headerMode: 'mirror_book_chapter',
    footerMode: 'folio_only',
    suppressHeaderOnChapterStart: true,
    preliminaryRomanNumerals: true,
    dockButtons: {
      cover: true,
      toc: true,
      design: true,
      metadata: true,
      importAi: true,
      addSection: true,
      bibliography: false,
    },
    defaultSections: ['dedicatoria', 'prologo', 'capitulo', 'capitulo', 'epilogo'],
    typography: { fontFamily: 'Times-Roman', fontSize: 11, lineHeight: 1.45 },
  },
  {
    id: 'ensayo-editorial',
    group: 'literario',
    shortLabel: 'Ensayo',
    audienceTag: 'Humanidades',
    label: 'Ensayo Académico / Literario',
    description: 'Ideal para textos argumentativos con notas al pie, citas en bloque y bibliografía Chicago.',
    pageSize: 'a5',
    coverMode: 'libro',
    coverStyleId: 'monica-classic',
    coverPaletteKey: 'clasico',
    structuralNormId: 'chicago',
    normId: 'chicago',
    bibliographyStyle: 'chicago',
    margins: { top: 25.4, bottom: 25.4, left: 25.4, right: 25.4, gutter: 25.4 },
    firstLineIndent: true,
    bibliographyHangingIndent: true,
    printSides: 'duplex',
    chapterBreakMode: 'odd_page',
    headerMode: 'mirror_book_chapter',
    footerMode: 'folio_only',
    suppressHeaderOnChapterStart: true,
    preliminaryRomanNumerals: true,
    dockButtons: {
      cover: true,
      toc: true,
      design: true,
      metadata: true,
      importAi: true,
      addSection: true,
      bibliography: true,
    },
    defaultSections: ['introduccion', 'desarrollo', 'conclusiones', 'bibliografia'],
    typography: { fontFamily: 'Times-Roman', fontSize: 11.5, lineHeight: 1.5 },
  },

  // ── 2. Académico e Investigación ─────────────────────────────────────
  {
    id: 'tesis-apa7',
    group: 'academico',
    shortLabel: 'Tesis APA 7',
    audienceTag: 'Universidad',
    label: 'Tesis Universitaria (Normas APA 7.ª ed.)',
    description: 'Márgenes de 1 pulgada (25.4 mm), interlineado doble (2.0), índice y citas APA 7 alfabéticas.',
    pageSize: 'a4',
    coverMode: 'academica',
    coverStyleId: 'magazine-executive',
    coverPaletteKey: 'sobrio',
    structuralNormId: 'apa7',
    normId: 'apa7',
    bibliographyStyle: 'apa7',
    margins: { top: 25.4, bottom: 25.4, left: 25.4, right: 25.4, gutter: 25.4 },
    firstLineIndent: true,
    bibliographyHangingIndent: true,
    printSides: 'simplex',
    chapterBreakMode: 'next_page',
    headerMode: 'none',
    footerMode: 'folio_only',
    suppressHeaderOnChapterStart: false,
    preliminaryRomanNumerals: false,
    dockButtons: {
      cover: true,
      toc: true,
      design: true,
      metadata: true,
      importAi: true,
      addSection: true,
      bibliography: true,
    },
    defaultSections: [
      'resumen',
      'introduccion',
      'marco_teorico',
      'metodologia',
      'resultados',
      'discusion',
      'conclusiones',
      'bibliografia',
      'anexo',
    ],
    typography: { fontFamily: 'Times-Roman', fontSize: 12, lineHeight: 2.0 },
  },
  {
    id: 'monografia-terciaria',
    group: 'academico',
    shortLabel: 'Monografía',
    audienceTag: 'Terciario / Grado',
    label: 'Monografía / TP Académico',
    description: 'Carátula institucional, marco teórico, análisis, conclusiones y referencias APA 7.',
    pageSize: 'a4',
    coverMode: 'academica',
    coverStyleId: 'minimal-editorial',
    coverPaletteKey: 'marino',
    structuralNormId: 'apa7',
    normId: 'apa7',
    bibliographyStyle: 'apa7',
    margins: { top: 25.4, bottom: 25.4, left: 25.4, right: 25.4, gutter: 25.4 },
    firstLineIndent: true,
    bibliographyHangingIndent: true,
    printSides: 'simplex',
    chapterBreakMode: 'next_page',
    headerMode: 'none',
    footerMode: 'folio_only',
    suppressHeaderOnChapterStart: false,
    preliminaryRomanNumerals: false,
    dockButtons: {
      cover: true,
      toc: true,
      design: true,
      metadata: true,
      importAi: true,
      addSection: true,
      bibliography: true,
    },
    defaultSections: ['introduccion', 'marco_teorico', 'desarrollo', 'conclusiones', 'bibliografia', 'anexo'],
    typography: { fontFamily: 'Times-Roman', fontSize: 12, lineHeight: 2.0 },
  },
  {
    id: 'articulo-academico',
    group: 'academico',
    shortLabel: 'Artículo',
    audienceTag: 'Científico IMRyD',
    label: 'Artículo Científico (IMRyD · Vancouver / IEEE)',
    description: 'Resumen, Métodos, Resultados y Discusión con soporte de 2 columnas y citas [1], [2].',
    pageSize: 'a4',
    coverMode: 'academica',
    coverStyleId: 'modern-corporate',
    coverPaletteKey: 'elegante',
    structuralNormId: 'apa7',
    normId: 'vancouver',
    bibliographyStyle: 'vancouver',
    margins: { top: 25.4, bottom: 25.4, left: 25.4, right: 25.4, gutter: 25.4 },
    firstLineIndent: false,
    bibliographyHangingIndent: true,
    printSides: 'simplex',
    chapterBreakMode: 'continuous',
    headerMode: 'book_title',
    footerMode: 'folio_only',
    suppressHeaderOnChapterStart: true,
    preliminaryRomanNumerals: false,
    dockButtons: {
      cover: true,
      toc: true,
      design: true,
      metadata: true,
      importAi: true,
      addSection: true,
      bibliography: true,
    },
    defaultSections: [
      'resumen',
      'introduccion',
      'metodologia',
      'resultados',
      'discusion',
      'conclusiones',
      'bibliografia',
      'anexo',
    ],
    typography: { fontFamily: 'Helvetica', fontSize: 10.5, lineHeight: 1.45 },
  },
  {
    id: 'informe-proyecto',
    group: 'academico',
    shortLabel: 'Informe',
    audienceTag: 'Ejecutivo',
    label: 'Informe Ejecutivo / Institucional',
    description: 'Informe listo para entregar (simple faz, margen de carpeta 30 mm, pie Página X de Y y cada sección en hoja nueva).',
    pageSize: 'a4',
    coverMode: 'ejecutiva',
    coverStyleId: 'bold-impact',
    coverPaletteKey: 'marino',
    structuralNormId: 'libre',
    normId: 'libre',
    bibliographyStyle: 'tradicional',
    margins: { top: 25, bottom: 25, left: 30, right: 20, gutter: 30 },
    firstLineIndent: false,
    bibliographyHangingIndent: false,
    printSides: 'simplex',
    chapterBreakMode: 'next_page',
    headerMode: 'book_title',
    footerMode: 'page_x_of_y',
    suppressHeaderOnChapterStart: true,
    preliminaryRomanNumerals: false,
    dockButtons: {
      cover: true,
      toc: true,
      design: true,
      metadata: true,
      importAi: true,
      addSection: true,
      bibliography: false,
    },
    defaultSections: [
      'resumen_ejecutivo',
      'objetivos_alcance',
      'diagnostico',
      'resultados',
      'conclusiones',
      'recomendaciones',
      'anexo',
    ],
    typography: { fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.45 },
  },

  // ── 3. Práctico, Técnico y Libre ─────────────────────────────────────
  {
    id: 'manual-apunte-guia',
    group: 'practico',
    shortLabel: 'Manual',
    audienceTag: 'Formación',
    label: 'Manual / Material de Curso',
    description: 'Material estructurado con unidades, cajas didácticas destacadas, glosario y referencias.',
    pageSize: 'a4',
    coverMode: 'ejecutiva',
    coverStyleId: 'creative-sustentable',
    coverPaletteKey: 'clasico',
    structuralNormId: 'libre',
    normId: 'libre',
    bibliographyStyle: 'tradicional',
    margins: { top: 20, bottom: 20, left: 20, right: 20, gutter: 22 },
    firstLineIndent: false,
    bibliographyHangingIndent: false,
    printSides: 'duplex',
    chapterBreakMode: 'next_page',
    headerMode: 'mirror_book_chapter',
    footerMode: 'page_x_of_y',
    suppressHeaderOnChapterStart: true,
    preliminaryRomanNumerals: false,
    dockButtons: {
      cover: true,
      toc: true,
      design: true,
      metadata: true,
      importAi: true,
      addSection: true,
      bibliography: true,
    },
    defaultSections: ['introduccion', 'unidad', 'unidad', 'metodologia', 'glosario', 'bibliografia'],
    typography: { fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.45 },
  },
  {
    id: 'apunte-estudio',
    group: 'practico',
    shortLabel: 'Apunte',
    audienceTag: 'Cátedra',
    label: 'Apunte de Estudio / Cuadernillo',
    description: 'Diseño claro en sans-serif con resúmenes, viñetas, subtítulos jerárquicos y recuadros clave.',
    pageSize: 'a4',
    coverMode: 'academica',
    coverStyleId: 'modern-corporate',
    coverPaletteKey: 'clasico',
    structuralNormId: 'libre',
    normId: 'libre',
    bibliographyStyle: 'tradicional',
    margins: { top: 18, bottom: 18, left: 20, right: 18, gutter: 20 },
    firstLineIndent: false,
    bibliographyHangingIndent: false,
    printSides: 'simplex',
    chapterBreakMode: 'continuous',
    headerMode: 'book_title',
    footerMode: 'page_x_of_y',
    suppressHeaderOnChapterStart: true,
    preliminaryRomanNumerals: false,
    dockButtons: {
      cover: true,
      toc: true,
      design: true,
      metadata: true,
      importAi: true,
      addSection: true,
      bibliography: false,
    },
    defaultSections: ['introduccion', 'unidad', 'unidad', 'glosario'],
    typography: { fontFamily: 'Helvetica', fontSize: 10.5, lineHeight: 1.45 },
  },
  {
    id: 'guia-practica',
    group: 'practico',
    shortLabel: 'Guía',
    audienceTag: 'Paso a paso',
    label: 'Guía Práctica de Bolsillo',
    description: 'Formato ágil para procedimientos, checklists y cajas de advertencia o consignas.',
    pageSize: 'a5',
    coverMode: 'ejecutiva',
    coverStyleId: 'creative-sustentable',
    coverPaletteKey: 'elegante',
    structuralNormId: 'libre',
    normId: 'libre',
    bibliographyStyle: 'tradicional',
    margins: { top: 16, bottom: 18, left: 16, right: 16, gutter: 18 },
    firstLineIndent: false,
    bibliographyHangingIndent: false,
    printSides: 'duplex',
    chapterBreakMode: 'next_page',
    headerMode: 'mirror_book_chapter',
    footerMode: 'page_x_of_y',
    suppressHeaderOnChapterStart: true,
    preliminaryRomanNumerals: false,
    dockButtons: {
      cover: true,
      toc: true,
      design: true,
      metadata: true,
      importAi: true,
      addSection: true,
      bibliography: false,
    },
    defaultSections: ['introduccion', 'unidad', 'anexo'],
    typography: { fontFamily: 'Helvetica', fontSize: 10.5, lineHeight: 1.4 },
  },
  {
    id: 'proyecto-tecnico',
    group: 'practico',
    shortLabel: 'Proyecto',
    audienceTag: 'Ingeniería / Gestión',
    label: 'Proyecto Técnico',
    description: 'Propuesta integral con objetivos, solución técnica, cronograma, presupuesto, riesgos y anexos.',
    pageSize: 'a4',
    coverMode: 'ejecutiva',
    coverStyleId: 'modern-corporate',
    coverPaletteKey: 'marino',
    structuralNormId: 'libre',
    normId: 'libre',
    bibliographyStyle: 'ieee',
    margins: { top: 25, bottom: 25, left: 30, right: 20, gutter: 30 },
    firstLineIndent: false,
    bibliographyHangingIndent: true,
    printSides: 'simplex',
    chapterBreakMode: 'next_page',
    headerMode: 'book_title',
    footerMode: 'page_x_of_y',
    suppressHeaderOnChapterStart: true,
    preliminaryRomanNumerals: false,
    dockButtons: {
      cover: true,
      toc: true,
      design: true,
      metadata: true,
      importAi: true,
      addSection: true,
      bibliography: true,
    },
    defaultSections: [
      'resumen_ejecutivo',
      'objetivos_alcance',
      'propuesta_tecnica',
      'cronograma',
      'presupuesto',
      'riesgos',
      'anexo',
    ],
    typography: { fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.45 },
  },
  {
    id: 'documento-libre',
    group: 'practico',
    shortLabel: 'Libre',
    audienceTag: 'En blanco',
    label: 'Documento Libre',
    description: 'Lienzo flexible sin estructura rígida. Agregá capítulos, poemas o tablas a medida.',
    pageSize: 'a4',
    coverMode: 'sin-caratula',
    coverStyleId: 'minimal-editorial',
    coverPaletteKey: 'sobrio',
    structuralNormId: 'libre',
    normId: 'libre',
    bibliographyStyle: 'tradicional',
    margins: { top: 20, bottom: 20, left: 20, right: 20, gutter: 20 },
    firstLineIndent: false,
    bibliographyHangingIndent: false,
    printSides: 'simplex',
    chapterBreakMode: 'continuous',
    headerMode: 'none',
    footerMode: 'folio_only',
    suppressHeaderOnChapterStart: false,
    preliminaryRomanNumerals: false,
    dockButtons: {
      cover: false,
      toc: false,
      design: true,
      metadata: true,
      importAi: true,
      addSection: true,
      bibliography: false,
    },
    defaultSections: [],
    typography: { fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.4 },
  },

  // ── Alias históricos (100% retrocompatibles con borradores guardados) ─
  {
    id: 'tp-secundaria',
    group: 'academico',
    isLegacyAlias: true,
    shortLabel: 'TP Secundaria',
    audienceTag: 'Escolar',
    label: 'Informe / TP Escolar (Secundaria)',
    description: 'Carátula escolar, introducción, desarrollo, conclusión y fuentes.',
    pageSize: 'a4',
    coverMode: 'academica',
    coverStyleId: 'modern-corporate',
    coverPaletteKey: 'clasico',
    structuralNormId: 'libre',
    normId: 'libre',
    bibliographyStyle: 'tradicional',
    margins: { top: 20, bottom: 20, left: 22, right: 20, gutter: 22 },
    firstLineIndent: false,
    bibliographyHangingIndent: false,
    printSides: 'simplex',
    chapterBreakMode: 'next_page',
    headerMode: 'book_title',
    footerMode: 'page_x_of_y',
    suppressHeaderOnChapterStart: true,
    preliminaryRomanNumerals: false,
    dockButtons: {
      cover: true,
      toc: true,
      design: true,
      metadata: true,
      importAi: true,
      addSection: true,
      bibliography: true,
    },
    defaultSections: ['introduccion', 'desarrollo', 'conclusiones', 'bibliografia'],
    typography: { fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.5 },
  },
  {
    id: 'cientifico-vancouver',
    group: 'academico',
    isLegacyAlias: true,
    shortLabel: 'Vancouver',
    audienceTag: 'Científico / Salud',
    label: 'Informe Científico IMRyD (Vancouver)',
    description: 'Estructura Introducción, Métodos, Resultados y Discusión con citas [1], [2].',
    pageSize: 'a4',
    coverMode: 'academica',
    coverStyleId: 'modern-corporate',
    coverPaletteKey: 'elegante',
    structuralNormId: 'apa7',
    normId: 'vancouver',
    bibliographyStyle: 'vancouver',
    margins: { top: 25.4, bottom: 25.4, left: 25.4, right: 25.4, gutter: 25.4 },
    firstLineIndent: false,
    bibliographyHangingIndent: true,
    printSides: 'simplex',
    chapterBreakMode: 'next_page',
    headerMode: 'book_title',
    footerMode: 'folio_only',
    suppressHeaderOnChapterStart: true,
    preliminaryRomanNumerals: false,
    dockButtons: {
      cover: true,
      toc: true,
      design: true,
      metadata: true,
      importAi: true,
      addSection: true,
      bibliography: true,
    },
    defaultSections: [
      'resumen',
      'introduccion',
      'metodologia',
      'resultados',
      'discusion',
      'conclusiones',
      'bibliografia',
      'anexo',
    ],
    typography: { fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.5 },
  },
  {
    id: 'trabajo-practico-monografia-tesis',
    group: 'academico',
    isLegacyAlias: true,
    shortLabel: 'Académico',
    audienceTag: 'Académico',
    label: 'Trabajo Práctico / Monografía / Tesis',
    description: 'Trabajo académico con carátula institucional y bibliografía APA 7.',
    pageSize: 'a4',
    coverMode: 'academica',
    coverStyleId: 'minimal-editorial',
    coverPaletteKey: 'marino',
    structuralNormId: 'apa7',
    normId: 'apa7',
    bibliographyStyle: 'apa7',
    margins: { top: 25.4, bottom: 25.4, left: 25.4, right: 25.4, gutter: 25.4 },
    firstLineIndent: false,
    bibliographyHangingIndent: true,
    printSides: 'simplex',
    chapterBreakMode: 'next_page',
    headerMode: 'none',
    footerMode: 'folio_only',
    suppressHeaderOnChapterStart: false,
    preliminaryRomanNumerals: false,
    dockButtons: {
      cover: true,
      toc: true,
      design: true,
      metadata: true,
      importAi: true,
      addSection: true,
      bibliography: true,
    },
    defaultSections: ['resumen', 'introduccion', 'desarrollo', 'metodologia', 'conclusiones', 'bibliografia', 'anexo'],
    typography: { fontFamily: 'Helvetica', fontSize: 12, lineHeight: 1.5 },
  },
];

/** Los 12 formatos principales ordenados para la grilla del selector de inicio. */
export const EDITORIAL_PRIMARY_PRESETS: EditorialPreset[] = EDITORIAL_PRESET_CATALOG.filter(
  (p) => !p.isLegacyAlias,
);

/** Obtiene un preset por id. */
export function getEditorialPreset(id: string): EditorialPreset | undefined {
  return EDITORIAL_PRESET_CATALOG.find((p) => p.id === id);
}

/** Preset por defecto. */
export const DEFAULT_EDITORIAL_PRESET: EditorialPreset = EDITORIAL_PRESET_CATALOG[0];

/**
 * Construye las secciones iniciales numeradas correspondientes a un preset.
 * Respeta el orden y agrega numeración incremental solo para tipos repetibles (Capítulo 1, Capítulo 2...).
 */
export function buildInitialSectionsForPreset(presetId: EditorialPresetId): EditorialSection[] {
  const preset = getEditorialPreset(presetId) || DEFAULT_EDITORIAL_PRESET;
  const repeatCounters: Record<string, number> = {};
  const result: EditorialSection[] = [];

  for (let i = 0; i < preset.defaultSections.length; i++) {
    const key = preset.defaultSections[i];
    const def = findEditorialSectionDefinition(key);
    if (!def) continue;

    const repeatIndex = def.repeatable ? (repeatCounters[key] ?? 0) : undefined;
    if (def.repeatable) {
      repeatCounters[key] = (repeatCounters[key] ?? 0) + 1;
    }

    const created = createSectionFromDefinition(def, result.length, repeatIndex);
    result.push({
      ...created,
      id: `ed_${def.id}_${result.length}_${Math.random().toString(36).slice(2, 6)}`,
      startNewPage: preset.chapterBreakMode !== 'continuous',
      records: [
        {
          id: `rec_seed_${result.length}`,
          type: key === 'bibliografia' ? 'bibliography_item' : 'paragraph',
          content: '',
          ...(key === 'bibliografia'
            ? {
                bibStyle: preset.bibliographyStyle,
                bibSourceType: 'libro' as const,
                bibOrderNumber: 1,
              }
            : {}),
        },
      ],
    });
  }

  return result;
}

/**
 * Aplica un preset sobre un borrador editorial existente:
 * - `'apply-design'`: actualiza tipografía, hoja, márgenes, citas, impresión y tapa SIN borrar tus textos actuales.
 * - `'replace-structure'`: además reemplaza la lista de secciones por la estructura base del preset.
 */
export function applyEditorialPresetToDraft<T extends Record<string, any>>(
  draft: T,
  presetId: EditorialPresetId,
  mode: 'apply-design' | 'replace-structure' = 'apply-design',
): T {
  const preset = getEditorialPreset(presetId) || DEFAULT_EDITORIAL_PRESET;
  const currentDesign = draft?.design || {};
  const currentCover = draft?.cover || {};
  const manualOverrides: Record<string, boolean> =
    currentDesign?.manualOverrides && typeof currentDesign.manualOverrides === 'object'
      ? currentDesign.manualOverrides
      : {};

  const nextSections =
    mode === 'replace-structure'
      ? buildInitialSectionsForPreset(preset.id)
      : Array.isArray(draft?.sections)
        ? draft.sections
        : [];

  return {
    ...draft,
    design: {
      ...currentDesign,
      presetId: preset.id,
      pageSizeId: manualOverrides.pageSizeId && currentDesign.pageSizeId ? currentDesign.pageSizeId : preset.pageSize,
      marginTop: manualOverrides.marginTop && typeof currentDesign.marginTop === 'number' ? currentDesign.marginTop : preset.margins.top,
      marginBottom: manualOverrides.marginBottom && typeof currentDesign.marginBottom === 'number' ? currentDesign.marginBottom : preset.margins.bottom,
      marginLeft: manualOverrides.gutter && typeof currentDesign.marginLeft === 'number' ? currentDesign.marginLeft : preset.margins.left,
      marginRight: manualOverrides.marginRight && typeof currentDesign.marginRight === 'number' ? currentDesign.marginRight : preset.margins.right,
      gutter: manualOverrides.gutter && typeof currentDesign.gutter === 'number' ? currentDesign.gutter : preset.margins.gutter,
      structuralNormId: preset.structuralNormId,
      normId: preset.normId,
      bibliographyStyle: preset.bibliographyStyle,
      printSides:
        manualOverrides.printSides && (currentDesign.printSides === 'simplex' || currentDesign.printSides === 'duplex')
          ? currentDesign.printSides
          : preset.printSides,
      chapterBreakMode:
        manualOverrides.chapterBreakMode && currentDesign.chapterBreakMode
          ? currentDesign.chapterBreakMode
          : preset.chapterBreakMode,
      headerMode:
        manualOverrides.headerMode && currentDesign.headerMode
          ? currentDesign.headerMode
          : preset.headerMode,
      footerMode:
        manualOverrides.footerMode && currentDesign.footerMode
          ? currentDesign.footerMode
          : preset.footerMode,
      suppressHeaderOnChapterStart:
        manualOverrides.suppressHeaderOnChapterStart && typeof currentDesign.suppressHeaderOnChapterStart === 'boolean'
          ? currentDesign.suppressHeaderOnChapterStart
          : preset.suppressHeaderOnChapterStart,
      preliminaryRomanNumerals:
        manualOverrides.preliminaryRomanNumerals && typeof currentDesign.preliminaryRomanNumerals === 'boolean'
          ? currentDesign.preliminaryRomanNumerals
          : preset.preliminaryRomanNumerals,
      headersEvenOdd:
        (manualOverrides.printSides && currentDesign.printSides
          ? currentDesign.printSides
          : preset.printSides) === 'duplex',
      firstLineIndent:
        manualOverrides.firstLineIndent && typeof currentDesign.firstLineIndent === 'boolean'
          ? currentDesign.firstLineIndent
          : preset.firstLineIndent,
      bibliographyHangingIndent: preset.bibliographyHangingIndent,
      manualOverrides,
      typography: {
        fontFamily:
          manualOverrides.fontFamily && currentDesign.typography?.fontFamily
            ? currentDesign.typography.fontFamily
            : preset.typography.fontFamily,
        fontSize:
          manualOverrides.fontSize && typeof currentDesign.typography?.fontSize === 'number'
            ? currentDesign.typography.fontSize
            : preset.typography.fontSize,
        lineHeight:
          manualOverrides.lineHeight && typeof currentDesign.typography?.lineHeight === 'number'
            ? currentDesign.typography.lineHeight
            : preset.typography.lineHeight,
      },
    },
    cover: {
      ...currentCover,
      mode: preset.coverMode,
      coverStyleId: currentCover.coverStyleId || preset.coverStyleId,
      coverPaletteKey: currentCover.coverPaletteKey || preset.coverPaletteKey,
    },
    tocConfig: {
      enabled: preset.dockButtons.toc,
      title: preset.normId === 'apa7' || preset.normId === 'vancouver' ? 'Tabla de Contenidos' : 'Índice General',
      showSubtitles: true,
      position: 'tras-caratula',
      ...(draft?.tocConfig || {}),
    },
    sections: nextSections,
  };
}
