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
}

export const SECTION_CATALOG: SectionCatalogEntry[] = [
  { id: 'contacto', label: 'Contacto & Redes', tabId: 'personales', dataType: 'single_text', defaultSectorRole: 'sidebar', assignableToColumns: true },
  { id: 'datos-personales', label: 'Datos Personales', tabId: 'personales', dataType: 'single_text', defaultSectorRole: 'sidebar', assignableToColumns: true },
  { id: 'frase', label: 'Frase / Lema Personal', tabId: 'personales', dataType: 'single_text', defaultSectorRole: 'sidebar', coverDisplayFields: ['quote'], assignableToColumns: true },
  { id: 'resumen', label: 'Resumen Profesional', tabId: 'resumen', dataType: 'single_text', defaultSectorRole: 'main', assignableToColumns: true, shortLabel: 'Resumen' },
  { id: 'experiencia', label: 'Experiencia Laboral', tabId: 'experiencia', dataType: 'record_list', defaultSectorRole: 'main', coverDisplayFields: ['role'], assignableToColumns: true, shortLabel: 'Experiencia' },
  { id: 'formacion', label: 'Formación Académica', tabId: 'formacion', dataType: 'record_list', defaultSectorRole: 'main', coverDisplayFields: ['degree'], assignableToColumns: true, shortLabel: 'Formación' },
  { id: 'profesion', label: 'Títulos Profesionales', tabId: 'profesion', dataType: 'record_list', defaultSectorRole: 'main', coverDisplayFields: ['title'], assignableToColumns: true, shortLabel: 'Profesión' },
  { id: 'habilidades', label: 'Habilidades Técnicas', tabId: 'habilidades', dataType: 'record_list', defaultSectorRole: 'sidebar', assignableToColumns: true, shortLabel: 'Habilidades' },
  { id: 'competencias', label: 'Competencias Clave', tabId: 'personales', dataType: 'record_list', defaultSectorRole: 'sidebar', assignableToColumns: true, shortLabel: 'Competencias' },
  { id: 'idiomas', label: 'Idiomas', tabId: 'idiomas', dataType: 'record_list', defaultSectorRole: 'sidebar', assignableToColumns: true, shortLabel: 'Idiomas' },
  { id: 'proyectos', label: 'Proyectos', tabId: 'proyectos', dataType: 'record_list', defaultSectorRole: 'main', coverDisplayFields: ['title'], assignableToColumns: true, shortLabel: 'Proyectos' },
  { id: 'publicaciones', label: 'Publicaciones', tabId: 'publicaciones', dataType: 'record_list', defaultSectorRole: 'main', assignableToColumns: true, shortLabel: 'Publicaciones' },
  { id: 'referencias', label: 'Referencias', tabId: 'referencias', dataType: 'record_list', defaultSectorRole: 'main', assignableToColumns: true, shortLabel: 'Referencias' },
  { id: 'cursos', label: 'Cursos & Capacitaciones', tabId: 'cursos', dataType: 'record_list', defaultSectorRole: 'main', coverDisplayFields: ['title'], assignableToColumns: true, shortLabel: 'Cursos' },
  { id: 'informatica', label: 'Informática & TICs', tabId: 'informatica', dataType: 'record_list', defaultSectorRole: 'sidebar', coverDisplayFields: ['title'], assignableToColumns: true, shortLabel: 'Informática' },
  { id: 'ecologia', label: 'Compromiso Ecológico', tabId: 'ecologia', dataType: 'record_list', defaultSectorRole: 'main', assignableToColumns: true, shortLabel: 'Ecología' },
  { id: 'certificados', label: 'Certificados Escaneados', tabId: 'certificados', dataType: 'record_list', defaultSectorRole: 'main', assignableToColumns: false, shortLabel: 'Certificados' },
  { id: 'firma', label: 'Firma Digital', tabId: 'firma', dataType: 'single_text', defaultSectorRole: 'main', assignableToColumns: false, shortLabel: 'Firma' },
];

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
