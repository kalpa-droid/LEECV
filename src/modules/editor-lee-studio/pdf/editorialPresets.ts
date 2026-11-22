import { Preset } from '../../../shared/core/pdf-engine/layers/presets/presetSchema';

/**
 * CAPA 5 — PRESETS DE EDITORLEE
 *
 * Un documento editorial NO es un renderer nuevo: es otro Preset que consume el
 * mismo motor PDF. `pageCategory: 'editorial'` hace que `getAllPresets()` (que
 * filtra 'documento') nunca mezcle plantillas editoriales con plantillas de CV.
 *
 * Los ids coinciden con EDITORIAL_PRESET_CATALOG (editorial-engine), que define
 * el comportamiento de la UI (dock, secciones iniciales, carátula); acá definimos
 * la presentación tipográfica para el PDF.
 *
 * Paletas monocromáticas de alto contraste: la lectura en papel es el objetivo.
 */

export const EDITORIAL_PRESET_ENSAYO = 'libro-ensayo-novela';
export const EDITORIAL_PRESET_ACADEMICO = 'trabajo-practico-monografia-tesis';
export const EDITORIAL_PRESET_MANUAL = 'manual-apunte-guia';
export const EDITORIAL_PRESET_INFORME = 'informe-proyecto';
export const EDITORIAL_PRESET_LIBRE = 'documento-libre';

export const EDITORIAL_PRESETS: Preset[] = [
  {
    id: EDITORIAL_PRESET_ENSAYO,
    name: 'Libro / Ensayo / Novela',
    pageCategory: 'editorial',
    pageSizeId: 'a5',
    marginPresetId: 'margin-standard',
    sectors: [],
    fixedObjects: [],
    sectionOrder: [],
    palette: {
      primary: '#1C1917',
      secondary: '#57534E',
      accent: '#292524',
      text: '#1C1917',
      textOnPrimary: '#FFFFFF',
      background: '#FFFFFF',
    },
    typography: {
      title: 20,
      sectionHeading: 13,
      itemTitle: 11,
      body: 11,
      caption: 8.5,
      fontFamily: 'Times-Roman',
      lineHeightBody: 1.5,
      lineHeightHeading: 1.25,
    },
  },
  {
    id: EDITORIAL_PRESET_ACADEMICO,
    name: 'Trabajo Práctico / Monografía / Tesis',
    pageCategory: 'editorial',
    pageSizeId: 'a4',
    marginPresetId: 'margin-standard',
    sectors: [],
    fixedObjects: [],
    sectionOrder: [],
    palette: {
      primary: '#1E293B',
      secondary: '#475569',
      accent: '#0F172A',
      text: '#0F172A',
      textOnPrimary: '#FFFFFF',
      background: '#FFFFFF',
    },
    typography: {
      title: 18,
      sectionHeading: 12,
      itemTitle: 11,
      body: 11,
      caption: 8.5,
      fontFamily: 'Helvetica',
      lineHeightBody: 1.5,
      lineHeightHeading: 1.25,
    },
  },
  {
    id: EDITORIAL_PRESET_MANUAL,
    name: 'Manual / Apunte / Guía',
    pageCategory: 'editorial',
    pageSizeId: 'a4',
    marginPresetId: 'margin-standard',
    sectors: [],
    fixedObjects: [],
    sectionOrder: [],
    palette: {
      primary: '#134E4A',
      secondary: '#0F766E',
      accent: '#115E59',
      text: '#134E4A',
      textOnPrimary: '#FFFFFF',
      background: '#FFFFFF',
    },
    typography: {
      title: 18,
      sectionHeading: 12,
      itemTitle: 10.5,
      body: 10.5,
      caption: 8,
      fontFamily: 'Helvetica',
      lineHeightBody: 1.45,
      lineHeightHeading: 1.25,
    },
  },
  {
    id: EDITORIAL_PRESET_INFORME,
    name: 'Informe / Proyecto',
    pageCategory: 'editorial',
    pageSizeId: 'a4',
    marginPresetId: 'margin-standard',
    sectors: [],
    fixedObjects: [],
    sectionOrder: [],
    palette: {
      primary: '#1E3A5F',
      secondary: '#3B5B7C',
      accent: '#152B49',
      text: '#1E3A5F',
      textOnPrimary: '#FFFFFF',
      background: '#FFFFFF',
    },
    typography: {
      title: 18,
      sectionHeading: 12,
      itemTitle: 10.5,
      body: 10.5,
      caption: 8,
      fontFamily: 'Helvetica',
      lineHeightBody: 1.45,
      lineHeightHeading: 1.25,
    },
  },
  {
    id: EDITORIAL_PRESET_LIBRE,
    name: 'Documento Libre',
    pageCategory: 'editorial',
    pageSizeId: 'a4',
    marginPresetId: 'margin-standard',
    sectors: [],
    fixedObjects: [],
    sectionOrder: [],
    palette: {
      primary: '#292524',
      secondary: '#57534E',
      accent: '#1C1917',
      text: '#292524',
      textOnPrimary: '#FFFFFF',
      background: '#FFFFFF',
    },
    typography: {
      title: 18,
      sectionHeading: 12,
      itemTitle: 10.5,
      body: 10.5,
      caption: 8,
      fontFamily: 'Helvetica',
      lineHeightBody: 1.45,
      lineHeightHeading: 1.25,
    },
  },
];
