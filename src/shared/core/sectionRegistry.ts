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

export type SectionDataType = 'single_text' | 'record_list';

export interface SectionCatalogEntry {
  id: string;
  label: string;
  /** A qué pestaña de carga de datos pertenece este registro */
  tabId: string;
  dataType: SectionDataType;
  /**
   * Campo(s) que se muestran cuando esta sección se usa como "destacado en
   * portada" — ahí normalmente solo interesa el título, no año/institución.
   */
  coverDisplayFields?: string[];
  /** Si puede asignarse a columna primaria/secundaria en la pestaña Paneles */
  assignableToColumns: boolean;
}

export const SECTION_CATALOG: SectionCatalogEntry[] = [
  { id: 'contacto', label: 'Contacto & Redes', tabId: 'personales', dataType: 'single_text', assignableToColumns: true },
  { id: 'personales', label: 'Datos Personales', tabId: 'personales', dataType: 'single_text', assignableToColumns: true },
  { id: 'frase', label: 'Frase / Lema Personal', tabId: 'personales', dataType: 'single_text', coverDisplayFields: ['quote'], assignableToColumns: true },
  { id: 'competencias', label: 'Competencias Clave', tabId: 'personales', dataType: 'record_list', assignableToColumns: true },
  { id: 'formacion', label: 'Formación Académica', tabId: 'formacion', dataType: 'record_list', coverDisplayFields: ['degree'], assignableToColumns: true },
  { id: 'profesion', label: 'Títulos Profesionales', tabId: 'profesion', dataType: 'record_list', coverDisplayFields: ['title'], assignableToColumns: true },
  { id: 'experiencia', label: 'Experiencia Laboral', tabId: 'experiencia', dataType: 'record_list', coverDisplayFields: ['role'], assignableToColumns: true },
  { id: 'cursos', label: 'Cursos & Capacitaciones', tabId: 'cursos', dataType: 'record_list', coverDisplayFields: ['title'], assignableToColumns: true },
  { id: 'informatica', label: 'Informática & TICs', tabId: 'informatica', dataType: 'record_list', coverDisplayFields: ['title'], assignableToColumns: true },
  { id: 'ecologia', label: 'Compromiso Ecológico', tabId: 'ecologia', dataType: 'record_list', assignableToColumns: true },
  { id: 'certificados', label: 'Certificados Escaneados', tabId: 'certificados', dataType: 'record_list', assignableToColumns: false },
  { id: 'firma', label: 'Firma Digital', tabId: 'firma', dataType: 'single_text', assignableToColumns: false },
];

export function getSection(id: string): SectionCatalogEntry | undefined {
  return SECTION_CATALOG.find(s => s.id === id);
}

export function getColumnAssignableSections(): SectionCatalogEntry[] {
  return SECTION_CATALOG.filter(s => s.assignableToColumns);
}

export function getRecordListSections(): SectionCatalogEntry[] {
  return SECTION_CATALOG.filter(s => s.dataType === 'record_list');
}
