/**
 * Núcleo puro — Tipos de datos de EditorLee (editorialTypes.ts)
 *
 * Este archivo contiene únicamente definiciones de tipos TypeScript.
 * No contiene lógica, imports de React, ni dependencias externas.
 * Es testeable en Node.js sin DOM.
 */

/** Agrupación visual de formatos en el Selector de Inicio de EditorLee. */
export type EditorialPresetGroup = 'literario' | 'academico' | 'practico';

/** Identificador único de un preset de documento editorial. */
export type EditorialPresetId =
  | 'libro-ensayo-novela'
  | 'novela-literaria'
  | 'ensayo-editorial'
  | 'trabajo-practico-monografia-tesis'
  | 'tp-secundaria'
  | 'monografia-terciaria'
  | 'tesis-apa7'
  | 'cientifico-vancouver'
  | 'articulo-academico'
  | 'manual-apunte-guia'
  | 'apunte-estudio'
  | 'guia-practica'
  | 'informe-proyecto'
  | 'proyecto-tecnico'
  | 'documento-libre';

/** Identificador único de una sección editorial. */
export type EditorialSectionId = string;

/** Identificador único de un registro (bloque de contenido). */
export type EditorialRecordId = string;

/** Tipos de registro (bloques) dentro de una sección. */
export type EditorialRecordType =
  | 'subtitle'         // Subtítulo / Apartado H2 o H3
  | 'paragraph'        // Párrafo narrativo
  | 'quote'            // Cita o epígrafe con atribución
  | 'callout'          // Recuadro destacado / Caja didáctica
  | 'list'             // Viñetas o lista numerada
  | 'table'            // Tabla con encabezados
  | 'image'            // Foto con verificación DPI // plain-language:allow — verificación de resolución de imagen
  | 'bibliography_item'// Referencia bibliográfica
  | 'qr_or_break'      // QR o salto de página
  | 'poem'             // Poema o estrofas conservando saltos de verso
  | 'figure_placeholder'// Espacio reservado para figura o esquema aún no insertado
  | 'footnote_list'    // Notas al pie agrupadas al cierre del apartado
  | 'epigraph';        // Epígrafe de apertura con atribución editorial

/** Variantes de recuadro destacado (callout). */
export type EditorialCalloutVariant =
  | 'nota'
  | 'definicion'
  | 'importante'
  | 'testimonio'
  | 'clave'
  | 'documento'
  | 'consigna'
  | 'caja'
  | 'resguardo';

/** Modos de carátula/portada. */
export type EditorialCoverMode =
  | 'libro'          // Tapa editorial (título, subtítulo, autor, editorial, QR opcional)
  | 'academica'      // Carátula académica (institución, carrera/cátedra, docente, integrantes, legajo)
  | 'ejecutiva'      // Tapa ejecutiva limpia (organización, fecha)
  | 'sin-caratula';  // Sin carátula

/** Norma de estructura/maquetación del documento (márgenes, interlineado, sangría). */
export type EditorialStructuralNormId =
  | 'libre'
  | 'apa7'
  | 'chicago'
  | 'mla';

/** Norma editorial legado/compat (estructura + alias). */
export type EditorialNormId =
  | EditorialStructuralNormId
  | 'vancouver';

/** Estilo de referencias bibliográficas (independiente de la estructura de página). */
export type EditorialBibliographyStyle =
  | 'apa'
  | 'apa7'
  | 'vancouver'
  | 'ieee'
  | 'harvard'
  | 'chicago'
  | 'mla'
  | 'tradicional';

/** Tipo de fuente bibliográfica para estructurar APA 7 / Vancouver. */
export type EditorialBibliographySourceType =
  | 'libro'
  | 'articulo'
  | 'web'
  | 'tesis';

/** Configuración del índice automático. */
export interface EditorialTocConfig {
  enabled: boolean;
  title: string;                    // "Índice", "Contenido", "Tabla de Contenidos"
  showSubtitles: boolean;           // Incluir H2/H3
  position: 'tras-caratula' | 'tras-preliminares'; // Ubicación del índice
}

/** Entrada calculada del índice. */
export interface EditorialTocEntry {
  id: string;
  label: string;
  pageNumber: number;
  depth?: number;
}

/** Metadatos de la obra. */
export interface EditorialMetadata {
  title: string;
  subtitle?: string;
  author?: string;
  editor?: string;
  editorial?: string;
  year?: number;
  isbn?: string;
  language?: string;
  isbnDigital?: string;
  legalNote?: string;                // Nota legal / copyright
}

/** Campos legales / ficha CIP. */
export interface EditorialLegalFields {
  [key: string]: string;            // Campos clave-valor libres
}

/** Modalidad de impresión física del documento editorial. */
export type EditorialPrintSides = 'simplex' | 'duplex';

/** Cómo comienza cada capítulo o sección principal del manuscrito. */
export type EditorialChapterBreakMode = 'odd_page' | 'next_page' | 'continuous';

/** Modo del encabezado superior de página. */
export type EditorialHeaderMode =
  | 'auto'
  | 'none'
  | 'book_title'
  | 'chapter_title'
  | 'mirror_book_chapter'
  | 'custom';

/** Modo del pie de página / folio. */
export type EditorialFooterMode =
  | 'auto'
  | 'none'
  | 'folio_only'
  | 'page_x_of_y'
  | 'book_and_folio'
  | 'custom_and_folio';

/** Alineación del pie de página. */
export type EditorialFooterAlignment = 'auto' | 'center' | 'outside' | 'right';

/** Configuración de diseño. */
export interface EditorialDesignConfig {
  pageSize: string;                  // A4, A5, Carta, etc. (PAGE_SIZES[id]) // plain-language:allow — tamaño de hoja y formatos de impresión
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
    gutter?: number;                 // Margen de encuadernación (lomo)
  };
  typography: {
    fontFamily: string;
    fontSize: number;                // Pt
    lineHeight: number;              // 1.2, 1.5, etc.
  };
  pageNumbers: boolean;
  headersEvenOdd: boolean;           // Encabezados pares/impares
  coverMode: EditorialCoverMode;
  /** Norma estructural activa (Nivel 1). Vancouver/IEEE/Harvard suelen usar `apa7`. */
  structuralNormId?: EditorialStructuralNormId;
  /** Campo legado/compat para lectores existentes. */
  normId?: EditorialNormId;
  bibliographyStyle?: EditorialBibliographyStyle;
  firstLineIndent?: boolean;         // Margen inicial en párrafos (APA 7: 0.5 in)
  bibliographyHangingIndent?: boolean;
  /** Campos ajustados manualmente por el usuario (Nivel 3, cascada anti-pisado). */
  manualOverrides?: Record<string, boolean>;
  coverStyleId?: string;
  coverPaletteKey?: string;
  /** Configuración global de carátulas separadoras por capítulo/sección (desactivadas por defecto). */
  sectionDividers?: EditorialSectionDividerConfig;
  /** Modalidad de impresión: 'simplex' (1 cara) o 'duplex' (2 caras / libro). */
  printSides?: EditorialPrintSides;
  /** Inicio de cada capítulo/sección: 'odd_page' (solo efectivo en duplex), 'next_page' o 'continuous'. */
  chapterBreakMode?: EditorialChapterBreakMode;
  /** Salto automático de hoja antes de cada subtítulo principal (H2). */
  breakOnH2?: boolean;
  /** Oculta el encabezado corriente en la primera página donde abre un capítulo/sección. */
  suppressHeaderOnChapterStart?: boolean;
  /** Modo de encabezado corriente en cuerpo del libro/informe. */
  headerMode?: EditorialHeaderMode;
  /** Texto personalizado para encabezado cuando `headerMode === 'custom'`. */
  headerCustomText?: string;
  /** Modo de pie de página / folio. */
  footerMode?: EditorialFooterMode;
  /** Texto personalizado para pie de página cuando `footerMode === 'custom_and_folio'`. */
  footerCustomText?: string;
  /** Alineación del pie de página. */
  footerAlignment?: EditorialFooterAlignment;
  /** Numeración romana en minúsculas (i, ii, iii...) para páginas preliminares. */
  preliminaryRomanNumerals?: boolean;
  /** Evita líneas sueltas de una sola palabra al cierre de párrafo mediante espacio duro (\u00A0). */
  preventRunts?: boolean;
  /** Bibliografía con resumen/comentario anotado debajo de cada referencia. */
  annotatedBibliography?: boolean;
}

/** Configuración global de carátulas separadoras por capítulo o sección. */
export interface EditorialSectionDividerConfig {
  enabled: boolean;
  /** 'body-chapters' = solo cuerpo (Capítulos, Unidades, Desarrollo); 'all-sections' = todas salvo Bibliografía. */
  scope: 'body-chapters' | 'all-sections';
  /** true = hereda el mismo diseño y paleta de la portada principal. */
  inheritCoverStyle: boolean;
  coverStyleId?: string;
  coverPaletteKey?: string;
  /** Insertar hoja en blanco detrás de cada carátula separadora (impresión doble cara). */
  blankBackPage: boolean;
}

/** Configuración puntual de carátula separadora en una sección individual (Nivel 3). */
export interface EditorialSectionCoverOverride {
  enabled?: boolean;
  kicker?: string;
  subtitle?: string;
  coverStyleId?: string;
  coverPaletteKey?: string;
  blankBackPage?: boolean;
}

/** Un registro (bloque de contenido) dentro de una sección. */
export interface EditorialRecord {
  id: EditorialRecordId;
  type: EditorialRecordType;
  title?: string;                    // Título o encabezado opcional del bloque
  content: string;                   // Contenido principal (párrafo, texto, etc.)
  // Campos específicos por tipo (solo los relevantes para ese tipo)
  subtitleLevel?: number;            // 2 o 3 para subtitle
  quoteAttribution?: string;         // quote / epigraph
  calloutVariant?: EditorialCalloutVariant; // callout
  calloutTitle?: string;             // callout: encabezado explícito (ej. CAJA 1 · Concepto clave)
  calloutItems?: string[];           // callout: viñetas o ítems internos estructurados
  listStyle?: 'bullet' | 'numbered'; // list
  tableHeaders?: string[];           // table
  tableRows?: string[][];            // table
  tableCaption?: string;             // table (título/epígrafe)
  tableHasHeaderRow?: boolean;       // table: false para fichas clave-valor sin encabezado de columna
  tableStylePreset?: 'apa' | 'grid' | 'striped' | 'minimal';
  tableColWidthsPct?: number[];
  tableColAlignments?: ('left' | 'center' | 'right')[];
  tableFontSizePt?: number;
  figureNumber?: string;             // figure_placeholder (ej. "Figura 1")
  figureCaption?: string;            // figure_placeholder
  figureHint?: string;               // figure_placeholder
  footnotes?: { number: number; text: string }[]; // footnote_list / párrafo anotado
  preserveLineBreaks?: boolean;      // poem / bloques con saltos significativos
  keepTogether?: boolean;            // wrap={false} cuando el bloque entra completo en página
  sourceOrigin?: 'docx' | 'md' | 'txt' | 'pdf_imported' | 'manual';
  imagePath?: string;                // image (ruta o data URI)
  imageDpi?: number;                 // image (calculado)
  imageCaption?: string;             // image (epígrafe)
  imageLayoutMode?: 'full-width' | 'centered' | 'pair-side-by-side' | 'wrap-left' | 'wrap-right';
  imageWidthPct?: number;
  imageWrapGapMm?: number;
  imageWrapLineAdjust?: number;
  secondaryImagePath?: string;
  secondaryImageCaption?: string;
  pairWidthRatio?: '50-50' | '60-40' | '40-60';
  spanFullWidth?: boolean;           // En modo 2 columnas, cruza de margen a margen
  forceColumnBreakAfter?: boolean;   // Salto manual de columna en modo 2 columnas
  bibAuthor?: string;                // bibliography_item
  bibYear?: string;                  // bibliography_item
  bibTitle?: string;                 // bibliography_item
  bibEditorial?: string;             // bibliography_item
  bibStyle?: EditorialBibliographyStyle; // bibliography_item
  bibSourceType?: EditorialBibliographySourceType; // bibliography_item
  bibJournal?: string;               // bibliography_item (revista / publicación periódica)
  bibVolume?: string;                // bibliography_item
  bibIssue?: string;                 // bibliography_item
  bibPages?: string;                 // bibliography_item
  bibCity?: string;                  // bibliography_item
  bibDoiOrUrl?: string;              // bibliography_item
  bibAccessDate?: string;            // bibliography_item (ej. 2026 nov 22 para Vancouver web)
  bibOrderNumber?: number;           // bibliography_item (orden secuencial [1] Vancouver)
  bibAnnotation?: string;            // bibliography_item (resumen/anotación editorial comentada)
  qrCode?: string;                   // qr_or_break (URL del QR)
  isBreak?: boolean;                 // qr_or_break (saltar página)
}

/** Categoría de sección editorial para organización y distintivos del Dock. */
export type EditorialSectionKind =
  | 'preliminares'
  | 'cuerpo'
  | 'cierre'
  | 'personalizada';

/** Una sección editorial (capítulo, prólogo, anexo, etc.). */
export interface EditorialSection {
  id: EditorialSectionId;
  title: string;
  sectionKey?: string;                // Clave canónica del catálogo (Regla 8)
  category?: EditorialSectionKind;    // Categoría canónica (preliminares/cuerpo/cierre)
  visible: boolean;                   // ¿Mostrar en PDF?
  includeInToc: boolean;             // ¿Incluir en índice?
  startNewPage: boolean;              // ¿Empezar en página nueva?
  position: number;                   // Orden relativo
  records: EditorialRecord[];
  /** Volanta editorial previa al título principal (ej. "BLOQUE I · CAPÍTULO 1"). */
  kickerLabel?: string;
  /** Control de página maestra aplicable a esta sección ('auto' | 'clean' | 'preliminary' | 'body'). */
  masterPageMode?: 'auto' | 'clean' | 'preliminary' | 'body';
  /** Sobreescritura puntual de encabezado corriente para esta sección. */
  runningHeaderText?: string;
  /** Epígrafe de apertura en portada o carátula de capítulo. */
  epigraphText?: string;
  epigraphAuthor?: string;
  /** Alias alternativo de columnas por sección (1 o 2). */
  columnCount?: 1 | 2;
  /** Carátula o portadilla separadora opcional para esta sección/capítulo. */
  sectionCover?: EditorialSectionCoverOverride;
  /** Diseño de columnas específico de esta sección (1 o 2 columnas). */
  columns?: 1 | 2;
  columnGapMm?: number;
  spanHeadingsFullWidth?: boolean;
}

/** Reglas del manifiesto editorial. */
export interface EditorialManifestRules {
  preserveScenes: boolean;            // No romper escenas/párrafos largos
  preservePoems: boolean;             // No romper poemas (keepLines)
  preserveCitations: boolean;         // No romper citas
  typographyCleanup: boolean;         // Limpiar tipografía (espacios, guiones, etc.)
  qrQuietZone: number;                // Zona de silencio del QR (4 módulos)
  qrMinSize: number;                  // Tamaño mínimo QR (2 cm)
}

/** Documento editorial completo. */
export interface EditorialDocumentData {
  id: string;
  type: 'editorial';
  metadata: EditorialMetadata;
  legalFields: EditorialLegalFields;
  tocConfig: EditorialTocConfig;
  designConfig: EditorialDesignConfig;
  sections: EditorialSection[];
  manifestRules: EditorialManifestRules;
  createdAt: number;
  updatedAt: number;
}