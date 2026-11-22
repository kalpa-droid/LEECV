/**
 * Núcleo puro — Presets universales de EditorLee (editorialPresetCatalog.ts)
 *
 * Los 5 presets de documento editorial con hoja por defecto, botones del Dock
 * que encienden y tipo de carátula inicial.
 *
 * Este módulo es PURO (sin React, sin DOM).
 */
import { EditorialPresetId, EditorialCoverMode } from './editorialTypes';
export type { EditorialPresetId, EditorialCoverMode };

/** Botones del Dock que activa un preset. */
export interface EditorialPresetDockButtons {
  cover: boolean;
  toc: boolean;
  design: boolean;
  metadata: boolean;
  importAi: boolean;
  addSection: boolean;
}

/** Un preset universial de documento editorial. */
export interface EditorialPreset {
  id: EditorialPresetId;
  label: string;
  description: string;
  pageSize: string;               // A4 o A5 // plain-language:allow — tamaño de hoja de los presets
  coverMode: EditorialCoverMode;
  dockButtons: EditorialPresetDockButtons;
  defaultSections: string[];      // ids de secciones iniciales (del catálogo)
  typography: {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
  };
}

/** Catálogo de los 5 presets universales. */
export const EDITORIAL_PRESET_CATALOG: EditorialPreset[] = [
  {
    id: 'libro-ensayo-novela',
    label: 'Libro / Ensayo / Novela',
    description: 'Libro de texto con tapa editorial, índice y capítulos.',
    pageSize: 'a5',
    coverMode: 'libro',
    dockButtons: {
      cover: true,
      toc: true,
      design: true,
      metadata: true,
      importAi: true,
      addSection: true,
    },
    defaultSections: ['portada', 'prologo', 'introduccion', 'capitulo', 'capitulo', 'epilogo', 'anexo'],
    typography: { fontFamily: 'Times-Roman', fontSize: 11, lineHeight: 1.5 },
  },
  {
    id: 'trabajo-practico-monografia-tesis',
    label: 'Trabajo Práctico / Monografía / Tesis',
    description: 'Trabajo académico con carátula institucional y bibliografía.',
    pageSize: 'a4',
    coverMode: 'academica',
    dockButtons: {
      cover: true,
      toc: true,
      design: true,
      metadata: true,
      importAi: true,
      addSection: true,
    },
    defaultSections: ['portada', 'resumen', 'introduccion', 'desarrollo', 'metodologia', 'conclusiones', 'bibliografia', 'anexo'],
    typography: { fontFamily: 'Helvetica', fontSize: 12, lineHeight: 1.5 },
  },
  {
    id: 'manual-apunte-guia',
    label: 'Manual / Apunte / Guía',
    description: 'Material didáctico con unidades y ejercicios.',
    pageSize: 'a4',
    coverMode: 'ejecutiva',
    dockButtons: {
      cover: true,
      toc: true,
      design: true,
      metadata: true,
      importAi: true,
      addSection: true,
    },
    defaultSections: ['portada', 'introduccion', 'unidad', 'unidad', 'metodologia', 'glosario', 'bibliografia'],
    typography: { fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.4 },
  },
  {
    id: 'informe-proyecto',
    label: 'Informe / Proyecto',
    description: 'Informe ejecutivo con resumen ejecutivo y anexos.',
    pageSize: 'a4',
    coverMode: 'ejecutiva',
    dockButtons: {
      cover: true,
      toc: true,
      design: true,
      metadata: true,
      importAi: true,
      addSection: true,
    },
    defaultSections: ['portada', 'resumen', 'introduccion', 'desarrollo', 'conclusiones', 'anexo'],
    typography: { fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.4 },
  },
  {
    id: 'documento-libre',
    label: 'Documento Libre',
    description: 'Documento sin estructura predefinida. Agregá secciones a medida.',
    pageSize: 'a4',
    coverMode: 'sin-caratula',
    dockButtons: {
      cover: false,
      toc: false,
      design: true,
      metadata: true,
      importAi: true,
      addSection: true,
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