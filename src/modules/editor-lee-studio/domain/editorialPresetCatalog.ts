/**
 * Núcleo puro — Presets universales de EditorLee (editorialPresetCatalog.ts)
 *
 * Define la estructura completa de cada tipo de publicación (Secundaria, Terciario,
 * Universidad APA 7.ª ed., Científico IMRyD Vancouver, Libro/Novela, Manual, Informe
 * y Libre): hoja, márgenes, tipografía, interlineado, norma bibliográfica, carátula
 * adaptada y secciones iniciales numerables en el Dock.
 *
 * Este módulo es PURO (sin React, sin DOM).
 */
import {
  EditorialPresetId,
  EditorialCoverMode,
  EditorialNormId,
  EditorialStructuralNormId,
  EditorialBibliographyStyle,
  EditorialSection,
} from './editorialTypes';
import {
  findEditorialSectionDefinition,
  createSectionFromDefinition,
} from './editorialSectionCatalog';

export type { EditorialPresetId, EditorialCoverMode };

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
  dockButtons: EditorialPresetDockButtons;
  defaultSections: string[];      // ids de secciones iniciales (del catálogo)
  typography: {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
  };
}

/** Catálogo de presets académicos, científicos, escolares y literarios. */
export const EDITORIAL_PRESET_CATALOG: EditorialPreset[] = [
  {
    id: 'libro-ensayo-novela',
    shortLabel: 'Libro / Novela',
    audienceTag: 'Literario',
    label: 'Libro / Ensayo / Novela',
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
    id: 'tp-secundaria',
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
    id: 'monografia-terciaria',
    shortLabel: 'Terciario',
    audienceTag: 'Terciario',
    label: 'Monografía / TP Terciario',
    description: 'Carátula de instituto, marco teórico, análisis, conclusiones y citas APA 7.',
    pageSize: 'a4',
    coverMode: 'academica',
    coverStyleId: 'minimal-editorial',
    coverPaletteKey: 'marino',
    structuralNormId: 'apa7',
    normId: 'apa7',
    bibliographyStyle: 'apa7',
    margins: { top: 25, bottom: 25, left: 25, right: 25, gutter: 25 },
    firstLineIndent: true,
    bibliographyHangingIndent: true,
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
    typography: { fontFamily: 'Times-Roman', fontSize: 12, lineHeight: 1.5 },
  },
  {
    id: 'tesis-apa7',
    shortLabel: 'Tesis APA 7',
    audienceTag: 'Universidad',
    label: 'Tesis Universitaria (Normas APA 7.ª ed.)',
    description: 'Márgenes de 25 mm, interlineado doble (2.0), índice y citas APA 7 alfabéticas.',
    pageSize: 'a4',
    coverMode: 'academica',
    coverStyleId: 'magazine-executive',
    coverPaletteKey: 'sobrio',
    structuralNormId: 'apa7',
    normId: 'apa7',
    bibliographyStyle: 'apa7',
    margins: { top: 25, bottom: 25, left: 25, right: 25, gutter: 25 },
    firstLineIndent: true,
    bibliographyHangingIndent: true,
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
    id: 'cientifico-vancouver',
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
    margins: { top: 25, bottom: 25, left: 25, right: 25, gutter: 25 },
    firstLineIndent: false,
    bibliographyHangingIndent: true,
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
    margins: { top: 25, bottom: 25, left: 25, right: 25, gutter: 25 },
    firstLineIndent: false,
    bibliographyHangingIndent: true,
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
  {
    id: 'manual-apunte-guia',
    shortLabel: 'Manual / Guía',
    audienceTag: 'Didáctico',
    label: 'Manual / Apunte / Guía',
    description: 'Material didáctico con unidades, glosario y bibliografía.',
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
    typography: { fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.4 },
  },
  {
    id: 'informe-proyecto',
    shortLabel: 'Informe',
    audienceTag: 'Ejecutivo',
    label: 'Informe / Proyecto',
    description: 'Informe ejecutivo con resumen, desarrollo, conclusiones y anexos.',
    pageSize: 'a4',
    coverMode: 'ejecutiva',
    coverStyleId: 'bold-impact',
    coverPaletteKey: 'marino',
    structuralNormId: 'libre',
    normId: 'libre',
    bibliographyStyle: 'tradicional',
    margins: { top: 20, bottom: 20, left: 22, right: 20, gutter: 20 },
    firstLineIndent: false,
    bibliographyHangingIndent: false,
    dockButtons: {
      cover: true,
      toc: true,
      design: true,
      metadata: true,
      importAi: true,
      addSection: true,
      bibliography: false,
    },
    defaultSections: ['resumen', 'introduccion', 'desarrollo', 'conclusiones', 'anexo'],
    typography: { fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.4 },
  },
  {
    id: 'documento-libre',
    shortLabel: 'Libre',
    audienceTag: 'En blanco',
    label: 'Documento Libre',
    description: 'Documento sin estructura predefinida. Agregá capítulos o apartados a medida.',
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
];

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
 * - `'apply-design'`: actualiza tipografía, hoja, márgenes, norma de citas y tapa SIN borrar tus textos actuales.
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
