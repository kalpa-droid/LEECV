/**
 * CAPA 4 — REGISTROS Y TEXTOS
 * Contenido dinámico puro: los datos, sin ningún estilo ni color todavía.
 * Un "Record" es agnóstico del tipo de plantilla — un trabajo de un CV, un
 * dato de contacto de una tarjeta, o un ítem de un afiche, todos son un
 * Record con la misma forma. El PRESET (Capa 5) es el que después decide
 * cómo se ve.
 */

import { CatalogDerivedKind } from './fieldCatalog';

export interface TextRun {
  text: string;
  weight?: 'normal' | 'bold';
}

/** Kinds que sólo existen en la Tarjeta Personal — TemplateRenderer.tsx (CV) nunca los necesita. */
export type CardOnlyRecordKind = 'card-heading' | 'card-logo';

/** Kinds que sólo existen en el CV — no le corresponden a la Tarjeta. */
export type CvOnlyRecordKind = CatalogDerivedKind | 'skill' | 'social-link' | 'freeform' | 'custom' | 'languages';

/** Kinds que usan los dos productos. */
export type SharedRecordKind = 'contact-item' | 'quote-text' | 'qr';

export type RecordKind = CardOnlyRecordKind | CvOnlyRecordKind | SharedRecordKind;
export type CvRecordKind = CvOnlyRecordKind | SharedRecordKind;
export type CardRecordKind = CardOnlyRecordKind | SharedRecordKind;

/** Un Record = una unidad de contenido que se puede repetir y fluir (ej: un trabajo, un curso, un dato) */
export interface ContentRecord<K extends RecordKind = RecordKind> {
  id: string;
  /** Qué tipo de dato es — el preset lo usa para elegir cómo dibujarlo */
  kind: K;
  fields: Record<string, string | TextRun[]>;
  /** Selección de etiqueta personalizada por campo para este registro puntual */
  fieldLabelOverrides?: Record<string, string>;
  /** A qué sector va este registro (ej: 'sidebar' o 'main') — lo define el preset, no el dato en sí */
  targetSectorRole: 'sidebar' | 'main' | 'banner' | 'footer';
}

/** Un grupo de registros del mismo tipo, con su título de sección (ej: "EXPERIENCIA LABORAL") */
export interface ContentSection<K extends RecordKind = RecordKind> {
  id: string;
  titleText: string;
  records: ContentRecord<K>[];
  breakBefore?: boolean;
}
