/**
 * Núcleo puro — Tipos de datos de EditorLee (editorialTypes.ts)
 *
 * Este archivo contiene únicamente definiciones de tipos TypeScript.
 * No contiene lógica, imports de React, ni dependencias externas.
 * Es testeable en Node.js sin DOM.
 */

/** Identificador único de un preset de documento editorial. */
export type EditorialPresetId =
  | 'libro-ensayo-novela'
  | 'trabajo-practico-monografia-tesis'
  | 'tp-secundaria'
  | 'monografia-terciaria'
  | 'tesis-apa7'
  | 'cientifico-vancouver'
  | 'manual-apunte-guia'
  | 'informe-proyecto'
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
  | 'callout'          // Recuadro destacado
  | 'list'             // Viñetas o lista numerada
  | 'table'            // Tabla con encabezados
  | 'image'            // Foto con verificación DPI // plain-language:allow — verificación de resolución de imagen
  | 'bibliography_item'// Referencia bibliográfica
  | 'qr_or_break';     // QR o salto de página

/** Variantes de recuadro destacado (callout). */
export type EditorialCalloutVariant =
  | 'nota'
  | 'definicion'
  | 'importante'
  | 'testimonio'
  | 'clave'
  | 'documento'
  | 'consigna';

/** Modos de carátula/portada. */
export type EditorialCoverMode =
  | 'libro'          // Tapa editorial (título, subtítulo, autor, editorial, QR opcional)
  | 'academica'      // Carátula académica (institución, carrera/cátedra, docente, integrantes, legajo)
  | 'ejecutiva'      // Tapa ejecutiva limpia (organización, fecha)
  | 'sin-caratula';  // Sin carátula

/** Norma editorial / sistema de citas activo en el documento. */
export type EditorialNormId =
  | 'libre'
  | 'apa7'
  | 'vancouver'
  | 'chicago';

/** Formato de bibliografía. */
export type EditorialBibliographyStyle =
  | 'apa'
  | 'apa7'
  | 'vancouver'
  | 'chicago'
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
  normId?: EditorialNormId;
  bibliographyStyle?: EditorialBibliographyStyle;
  firstLineIndent?: boolean;         // Margen inicial en párrafos (APA 7: 0.5 in)
  bibliographyHangingIndent?: boolean;
  coverStyleId?: string;
  coverPaletteKey?: string;
}

/** Un registro (bloque de contenido) dentro de una sección. */
export interface EditorialRecord {
  id: EditorialRecordId;
  type: EditorialRecordType;
  title?: string;                    // Título o encabezado opcional del bloque
  content: string;                   // Contenido principal (párrafo, texto, etc.)
  // Campos específicos por tipo (solo los relevantes para ese tipo)
  subtitleLevel?: number;            // 2 o 3 para subtitle
  quoteAttribution?: string;         // quote
  calloutVariant?: EditorialCalloutVariant; // callout
  listStyle?: 'bullet' | 'numbered'; // list
  tableHeaders?: string[];           // table
  tableRows?: string[][];            // table
  imagePath?: string;                // image (ruta o data URI)
  imageDpi?: number;                 // image (calculado)
  imageCaption?: string;             // image (epígrafe)
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