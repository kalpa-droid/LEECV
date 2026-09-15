/**
 * NÚCLEO — CATÁLOGO ÚNICO DE SECCIONES/REGISTROS
 *
 * Antes de este archivo, cada pestaña del editor (Paneles, Portada, Color)
 * escribía su propia lista de "qué secciones existen" a mano, por separado.
 * Eso es lo que causó que "Frase" (personalInfo.quote) apareciera en
 * Portada pero faltara en Paneles — nadie sincronizaba las copias porque
 * no había una sola fuente de la verdad.
 *
 * Regla de núcleo: NINGUNA pestaña vuelve a escribir su propia lista de
 * secciones. Todas leen de acá. Agregar una sección nueva = una entrada
 * acá, y aparece automáticamente en todos los selectores que la consultan.
 */

import { CANONICAL_SECTION_ORDER } from './sections/canonicalSectionOrder';

export type SectionDataType = 'single_text' | 'record_list';
export type SectorRole = 'sidebar' | 'main';

export interface SectionCatalogEntry {
  id: string;
  label: string;
  /** A qué pestaña de carga de datos pertenece este registro */
  tabId: string;
  dataType: SectionDataType;
  defaultSectorRole: SectorRole;
  /**
   * Campo(s) que se muestran cuando esta sección se usa como "destacado en
   * portada" — ahí normalmente solo interesa el título, no año/institución.
   */
  coverDisplayFields?: string[];
  /** Si puede asignarse a columna primaria/secundaria en la pestaña Paneles */
  assignableToColumns: boolean;
  /**
   * Etiqueta corta (1 palabra) para botones chicos de ancho fijo, como el
   * dock lateral — si no se define, se usa `label` completo tal cual.
   */
  shortLabel?: string;
  /** Si es una sección universal del catálogo global que siempre permanece en la UI */
  isUniversal?: boolean;
  /** Si es un slot de sección personalizada configurable en el núcleo */
  isCustomSlot?: boolean;
}

const RAW_SECTION_CATALOG: SectionCatalogEntry[] = [
  { id: 'contacto', label: 'Contacto', tabId: 'personales', dataType: 'single_text', defaultSectorRole: 'sidebar', assignableToColumns: true, isUniversal: true },
  { id: 'datos-personales', label: 'Datos Personales', tabId: 'personales', dataType: 'single_text', defaultSectorRole: 'sidebar', assignableToColumns: true, isUniversal: true },
  { id: 'frase', label: 'Titular Profesional', tabId: 'personales', dataType: 'single_text', defaultSectorRole: 'sidebar', coverDisplayFields: ['quote'], assignableToColumns: true, shortLabel: 'Titular', isUniversal: true },
  { id: 'objetivo', label: 'Objetivo Profesional / Resumen Ejecutivo', tabId: 'objetivo', dataType: 'single_text', defaultSectorRole: 'main', assignableToColumns: true, shortLabel: 'Objetivo', isUniversal: true },
  { id: 'resumen', label: 'Resumen Profesional', tabId: 'resumen', dataType: 'single_text', defaultSectorRole: 'main', assignableToColumns: true, shortLabel: 'Resumen', isUniversal: true },
  { id: 'experiencia', label: 'Experiencia Laboral', tabId: 'experiencia', dataType: 'record_list', defaultSectorRole: 'main', coverDisplayFields: ['role'], assignableToColumns: true, shortLabel: 'Experiencia', isUniversal: true },
  { id: 'logros', label: 'Logros Cuantificables y Métricas', tabId: 'logros', dataType: 'record_list', defaultSectorRole: 'main', coverDisplayFields: ['title'], assignableToColumns: true, shortLabel: 'Logros', isUniversal: false },
  { id: 'portafolio', label: 'Portafolio / Trabajos Destacados', tabId: 'portafolio', dataType: 'record_list', defaultSectorRole: 'main', coverDisplayFields: ['title'], assignableToColumns: true, shortLabel: 'Portafolio', isUniversal: true },
  { id: 'formacion', label: 'Formación Académica', tabId: 'formacion', dataType: 'record_list', defaultSectorRole: 'main', coverDisplayFields: ['degree'], assignableToColumns: true, shortLabel: 'Formación', isUniversal: true },
  { id: 'profesion', label: 'Títulos Profesionales', tabId: 'profesion', dataType: 'record_list', defaultSectorRole: 'main', coverDisplayFields: ['title'], assignableToColumns: true, shortLabel: 'Profesión', isUniversal: true },
  { id: 'cursos', label: 'Cursos & Capacitaciones', tabId: 'cursos', dataType: 'record_list', defaultSectorRole: 'main', coverDisplayFields: ['title'], assignableToColumns: true, shortLabel: 'Cursos', isUniversal: true },
  { id: 'informatica', label: 'Informática & TICs', tabId: 'informatica', dataType: 'record_list', defaultSectorRole: 'sidebar', coverDisplayFields: ['title'], assignableToColumns: true, shortLabel: 'Informática', isUniversal: true },
  { id: 'proyectos', label: 'Proyectos', tabId: 'proyectos', dataType: 'record_list', defaultSectorRole: 'main', coverDisplayFields: ['title'], assignableToColumns: true, shortLabel: 'Proyectos', isUniversal: true },
  { id: 'publicaciones', label: 'Publicaciones', tabId: 'publicaciones', dataType: 'record_list', defaultSectorRole: 'main', assignableToColumns: true, shortLabel: 'Publicaciones', isUniversal: false },
  { id: 'referencias', label: 'Referencias', tabId: 'referencias', dataType: 'record_list', defaultSectorRole: 'main', assignableToColumns: true, shortLabel: 'Referencias', isUniversal: false },
  { id: 'habilidades', label: 'Habilidades Técnicas', tabId: 'habilidades', dataType: 'record_list', defaultSectorRole: 'sidebar', assignableToColumns: true, shortLabel: 'Habilidades', isUniversal: true },
  { id: 'competencias', label: 'Competencias Clave (Soft Skills)', tabId: 'competencias', dataType: 'record_list', defaultSectorRole: 'sidebar', assignableToColumns: true, shortLabel: 'Competencias', isUniversal: true },
  { id: 'idiomas', label: 'Idiomas', tabId: 'idiomas', dataType: 'record_list', defaultSectorRole: 'sidebar', assignableToColumns: true, shortLabel: 'Idiomas', isUniversal: false },
  { id: 'redes', label: 'Redes Sociales & Enlaces', tabId: 'redes', dataType: 'record_list', defaultSectorRole: 'sidebar', coverDisplayFields: ['url'], assignableToColumns: true, shortLabel: 'Redes', isUniversal: false },
  { id: 'personalizada-1', label: 'Sección Personalizada 1', tabId: 'personalizada-1', dataType: 'record_list', defaultSectorRole: 'main', assignableToColumns: true, shortLabel: 'Personalizada 1', isUniversal: false, isCustomSlot: true },
  { id: 'personalizada-2', label: 'Sección Personalizada 2', tabId: 'personalizada-2', dataType: 'record_list', defaultSectorRole: 'main', assignableToColumns: true, shortLabel: 'Personalizada 2', isUniversal: false, isCustomSlot: true },
  { id: 'personalizada-3', label: 'Sección Personalizada 3', tabId: 'personalizada-3', dataType: 'record_list', defaultSectorRole: 'main', assignableToColumns: true, shortLabel: 'Personalizada 3', isUniversal: false, isCustomSlot: true },
  { id: 'personalizada-4', label: 'Sección Personalizada 4', tabId: 'personalizada-4', dataType: 'record_list', defaultSectorRole: 'main', assignableToColumns: true, shortLabel: 'Personalizada 4', isUniversal: false, isCustomSlot: true },
  { id: 'personalizada-5', label: 'Sección Personalizada 5', tabId: 'personalizada-5', dataType: 'record_list', defaultSectorRole: 'main', assignableToColumns: true, shortLabel: 'Personalizada 5', isUniversal: false, isCustomSlot: true },
  { id: 'certificados', label: 'Certificados Escaneados', tabId: 'certificados', dataType: 'record_list', defaultSectorRole: 'main', assignableToColumns: false, shortLabel: 'Certificados', isUniversal: true },
  { id: 'firma', label: 'Firma Digital', tabId: 'firma', dataType: 'single_text', defaultSectorRole: 'main', assignableToColumns: false, shortLabel: 'Firma', isUniversal: true },
];

export const SECTION_CATALOG: SectionCatalogEntry[] = CANONICAL_SECTION_ORDER
  .map(id => RAW_SECTION_CATALOG.find(s => s.id === id))
  .filter((s): s is SectionCatalogEntry => s !== undefined);

export function getFullSectionCatalog(customSections: any[] = []): SectionCatalogEntry[] {
  const customEntries: SectionCatalogEntry[] = (customSections || []).map((cs: any) => ({
    id: cs.id,
    label: cs.titleText || 'Nueva Sección',
    tabId: 'custom',
    dataType: 'record_list',
    defaultSectorRole: 'main',
    coverDisplayFields: cs.fields || ['tituloOGrado'],
    assignableToColumns: true
  }));

  return [...SECTION_CATALOG, ...customEntries];
}

export function getSection(id: string, customSections: any[] = []): SectionCatalogEntry | undefined {
  return getFullSectionCatalog(customSections).find(s => s.id === id);
}

export function getSectionLabel(id: string, customSections: any[] = []): string {
  const entry = getSection(id, customSections);
  return entry ? entry.label.toUpperCase() : id.toUpperCase();
}

export function getColumnAssignableSections(customSections: any[] = []): SectionCatalogEntry[] {
  return getFullSectionCatalog(customSections).filter(s => s.assignableToColumns);
}

export function getRecordListSections(customSections: any[] = []): SectionCatalogEntry[] {
  return getFullSectionCatalog(customSections).filter(s => s.dataType === 'record_list');
}

export function getSectionsRequiringManualAdjustment(customSections: any[] = []): SectionCatalogEntry[] {
  return getFullSectionCatalog(customSections);
}

