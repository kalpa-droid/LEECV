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

import { PageSize } from '../page/pageSizes';
import { MarginPreset } from '../margins/marginPresets';
import { SectorDefinition } from '../layout/sectors/resolveSectors';
import { FixedObjectDefinition } from '../layout/fixedObjects/placeFixedObjects';

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
}

export interface Preset {
  id: string;
  name: string;
  /** A qué categoría de página aplica — un preset de tarjeta no debería poder elegir A4 */
  pageCategory: 'documento' | 'tarjeta' | 'afiche';
  pageSizeId: keyof typeof import('../page/pageSizes').PAGE_SIZES | string;
  marginPresetId: string;
  sectors: SectorDefinition[];
  fixedObjects: FixedObjectDefinition[];
  /** Orden en el que las secciones de contenido se acomodan dentro de cada sector */
  sectionOrder: { sectorRole: string; sectionIds: string[] }[];
  palette: ColorPalette;
  typography: TypographyScale;
}
