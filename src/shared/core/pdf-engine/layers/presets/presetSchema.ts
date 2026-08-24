/**
 * CAPA 5 — PRESET
 * Acá es donde nace "una plantilla" (CV clásico, CV moderno, Tarjeta personal).
 * Un Preset NO inventa geometría nueva — combina lo que ya definieron las
 * capas 0 a 4 y le agrega lo que le falta al contenido dinámico: orden de
 * las secciones, jerarquía tipográfica y paleta de colores.
 *
 * Esto es lo que hace que agregar una plantilla nueva sea "escribir un
 * Preset", no "escribir un componente nuevo".
 */

import { SectorDefinition } from '../sectors/resolveSectors';
import { FixedObjectDefinition } from '../fixedObjects/placeFixedObjects';
import { PageTextObjectDefinition } from '../pageText/pageTextObjects';

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textOnPrimary: string;
}

export interface TypographyScale {
  /** pt de fuente por nivel de jerarquía */
  title: number;
  sectionHeading: number;
  itemTitle: number;
  body: number;
  caption: number;
  fontFamily: string;
  lineHeightBody?: number;
  lineHeightHeading?: number;
  cover?: {
    badge: number;
    title: number;
    name: number;
    role: number;
    quote: number;
    footerMain: number;
    footerSub: number;
  };
  recordScaleRatios?: {
    subtitle?: number;
    meta?: number;
    extra?: number;
  };
}

export interface Preset {
  id: string;
  name: string;
  /** A qué categoría de página aplica — un preset de tarjeta no debería poder elegir A4 */
  pageCategory: 'documento' | 'tarjeta' | 'afiche';
  pageSizeId: string;
  marginPresetId: string;
  sectors: SectorDefinition[];
  fixedObjects: FixedObjectDefinition[];
  /** Orden en el que las secciones de contenido se acomodan dentro de cada sector */
  sectionOrder: { sectorRole: string; sectionIds: string[] }[];
  palette: ColorPalette;
  paletteSeed?: {
    seedHex: string;
    harmonyScheme?: 'analogous' | 'complementary' | 'split-complementary' | 'monochromatic';
  };
  typography: TypographyScale;

  /** Leyenda explícita de roles por diseño (ej: 'Fondo columna lateral' -> 'primary', 'Título de sección' -> 'accent') */
  roleLegend?: Record<string, string>;

  /** Opcional: objetos de texto anclados a la hoja física (número de página, etc.) — nunca a un sector */
  pageTextObjects?: PageTextObjectDefinition[];

  /** Mapa de qué diseño de Card usa cada tipo de registro (ej: education -> 'accent-card', experience -> 'primary-card') */
  recordCardDesigns?: Record<string, string>;

  /** Diseño de Card que usan las franjas de título de sección (ej: 'primary-card', 'accent-card') */
  sectionBannerDesign?: string;

  /** Estilo o arquetipo de portada (monica-classic, modern-corporate, minimal-editorial, creative-cardon) */
  coverStyle?: 'monica-classic' | 'modern-corporate' | 'minimal-editorial' | 'creative-cardon';

  /**
   * DORSO (doble faz) — opcional. Si un preset lo declara, es "de dos caras":
   * el frente usa `sectors`/`fixedObjects`/`sectionOrder` de arriba, el dorso
   * usa estos. Comparten pageSizeId/marginPresetId/palette/typography — un
   * dorso no es un documento distinto, es la otra cara del mismo objeto físico.
   */
  back?: {
    sectors: SectorDefinition[];
    fixedObjects: FixedObjectDefinition[];
    sectionOrder: { sectorRole: string; sectionIds: string[] }[];
  };

  /** Políticas de adorno y decoración visual (bordes, separadores, sombras, adornos vectoriales) */
  decorativeElementPolicy?: {
    cardBorders?: boolean;
    sectionDividers?: boolean;
    backgroundShapes?: boolean;
    shadowEffects?: boolean;
    cornerOrnaments?: 'organic-leaf' | 'geometric-badge' | 'classic-line' | 'none';
    watermarkType?: 'none' | 'subtle-brand' | 'ecologia';
    headerIconStyle?: 'filled' | 'outlined' | 'minimal';
  };

  /** Solo aplica a pageCategory:'tarjeta' — cómo se imprime en una hoja física */
  print?: {
    bleedPresetId: string;
    impositionPresetId: string;
    /** Hoja física por defecto donde se auto-repite (el usuario puede cambiarla en la UI) */
    defaultSheetPageSizeId: string;
    duplexMode: 'eje_largo' | 'eje_corto';
    /** Opción para encender o apagar sangrado y marcas de corte al imprimir tarjetas */
    showCropMarksAndBleed?: boolean;
  };
}
