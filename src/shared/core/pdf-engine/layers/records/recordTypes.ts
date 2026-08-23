/**
 * CAPA 4 — REGISTROS Y TEXTOS
 * Contenido dinámico puro: los datos, sin ningún estilo ni color todavía.
 * Un "Record" es agnóstico del tipo de plantilla — un trabajo de un CV, un
 * dato de contacto de una tarjeta, o un ítem de un afiche, todos son un
 * Record con la misma forma. El PRESET (Capa 5) es el que después decide
 * cómo se ve.
 */

export interface TextRun {
  text: string;
  weight?: 'normal' | 'bold';
}

/** Un Record = una unidad de contenido que se puede repetir y fluir (ej: un trabajo, un curso, un dato) */
export interface ContentRecord {
  id: string;
  /** Qué tipo de dato es — el preset lo usa para elegir cómo dibujarlo */
  kind: 'experience' | 'education' | 'course' | 'contact-item' | 'skill' | 'social-link' | 'qr' | 'freeform' | 'card-heading' | 'quote-text';
  fields: Record<string, string | TextRun[]>;
  /** A qué sector va este registro (ej: 'sidebar' o 'main') — lo define el preset, no el dato en sí */
  targetSectorRole: 'sidebar' | 'main' | 'banner' | 'footer';
}

/** Un grupo de registros del mismo tipo, con su título de sección (ej: "EXPERIENCIA LABORAL") */
export interface ContentSection {
  id: string;
  titleText: string;
  records: ContentRecord[];
}
