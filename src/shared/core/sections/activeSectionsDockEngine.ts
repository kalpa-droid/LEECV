/**
 * NÚCLEO — MOTOR DE SECCIONES ACTIVAS DEL DOCK (activeSectionsDockEngine.ts)
 *
 * Antes de este archivo, `CanvaIconDock.tsx` tenía su propia lista fija
 * (`fixedPrioritySections`) con los botones de sección del muelle lateral —
 * una segunda copia de la misma información que ya vive en
 * `SECTION_CATALOG` (sectionRegistry.ts). Cada sección nueva había que
 * agregarla A MANO en dos lugares — y cuando alguien se olvidaba (pasó con
 * "Compromiso Ecológico": está en SECTION_CATALOG pero nunca llegó a
 * fixedPrioritySections), esa sección quedaba sin botón, inaccesible desde
 * el dock, aunque el resto de la app sí la conociera.
 *
 * Regla de núcleo: el dock NO decide qué secciones existen. Sólo lee
 * SECTION_CATALOG (fuente única) y `cvData.sectionVisibility` (fuente
 * única de qué está prendido/apagado). Agregar una sección nueva al
 * catálogo la hace aparecer acá automáticamente, sin tocar este archivo.
 *
 * Importante — por qué NO se filtra por "¿tiene datos cargados?": ocultar
 * el botón de una sección vacía le impediría al usuario cargar su PRIMER
 * registro ahí (no podría ni abrir la pestaña). El criterio correcto es
 * visibilidad explícita (`sectionVisibility`), no presencia de datos.
 */

import { SECTION_CATALOG } from '../sectionRegistry';

export interface DockSectionItem {
  id: string;
  label: string;
  iconId: string;
  isCustom: boolean;
  tabId: string;
  isUniversal?: boolean;
  isDisabled?: boolean;
  hasContent?: boolean;
}

/**
 * Pestañas especiales fijos del Dock Gobernados por el Motor.
 */
export const DOCK_SPECIAL_TABS = {
  addSection: { id: 'nueva_seccion', label: 'Sección', iconId: 'custom' },
  portada: { id: 'portada', label: 'Portada', iconId: 'portada' },
  personal: { id: 'personales', label: 'Personal', iconId: 'personales' }
};

/**
 * IDs de SECTION_CATALOG que ya están cubiertos por el botón fijo
 * "Personal" del dock (datos de contacto, datos personales y frase viven
 * todos dentro de esa misma pestaña agregada) — no generan un botón propio,
 * si no, "Personal" y estos 3 se pisarían mostrando lo mismo dos veces.
 */
const ABSORBED_INTO_PERSONAL_TAB = new Set(['contacto', 'datos-personales', 'frase']);

export function checkSectionHasContent(cvData: any, sectionId: string): boolean {
  if (!cvData) return false;
  const p = cvData.personalInfo || {};

  switch (sectionId) {
    case 'personales':
    case 'contacto':
    case 'datos-personales':
      return !!(p.phone || p.email || p.address || p.dni || p.givenNames || p.surname);
    case 'resumen':
      return !!String(cvData.summary || '').trim();
    case 'frase':
      return !!String(p.quote || '').trim();
    case 'redes':
      return Array.isArray(cvData.redes) && cvData.redes.length > 0;
    case 'experiencia':
      return Array.isArray(cvData.experience) && cvData.experience.length > 0;
    case 'formacion':
      return Array.isArray(cvData.education) && cvData.education.length > 0;
    case 'profesion':
      return Array.isArray(cvData.profession) && cvData.profession.length > 0;
    case 'habilidades':
      return Array.isArray(cvData.hardSkills) && cvData.hardSkills.length > 0;
    case 'competencias':
      return Array.isArray(cvData.skills) && cvData.skills.length > 0;
    case 'idiomas':
      return Array.isArray(cvData.languages) && cvData.languages.length > 0;
    case 'proyectos':
      return Array.isArray(cvData.projects) && cvData.projects.length > 0;
    case 'publicaciones':
      return Array.isArray(cvData.publications) && cvData.publications.length > 0;
    case 'referencias':
      return Array.isArray(cvData.references) && cvData.references.length > 0;
    case 'cursos':
      return Array.isArray(cvData.coursesAndCertificates) && cvData.coursesAndCertificates.length > 0;
    case 'informatica':
      return Array.isArray(cvData.informatics) && cvData.informatics.length > 0;
    case 'ecologia':
      return Array.isArray(cvData.ecology) ? cvData.ecology.length > 0 : !!cvData.ecology;
    case 'certificados':
      return Array.isArray(cvData.certificatesScanned) && cvData.certificatesScanned.length > 0;
    case 'firma':
      return !!(cvData.signature?.dataUrl || cvData.signature?.signerName);
    default: {
      const customSec = Array.isArray(cvData.customSections) ? cvData.customSections.find((cs: any) => cs.id === sectionId) : null;
      return Array.isArray(customSec?.records) && customSec.records.length > 0;
    }
  }
}

export function resolveActiveDockSections(cvData: any): DockSectionItem[] {
  const customSections = cvData?.customSections || [];
  const visibility = cvData?.sectionVisibility || {};

  const customItems: DockSectionItem[] = customSections
    .filter((cs: any) => visibility[cs.id] !== false)
    .map((cs: any) => ({
      id: cs.id,
      label: cs.titleText || 'Nueva Sección',
      iconId: cs.iconId || 'custom',
      isCustom: true,
      tabId: 'custom',
      isUniversal: false,
      isDisabled: false,
      hasContent: checkSectionHasContent(cvData, cs.id)
    }));

  const catalogItems: DockSectionItem[] = SECTION_CATALOG
    .filter((entry) => !ABSORBED_INTO_PERSONAL_TAB.has(entry.id))
    .map((entry) => ({
      id: entry.id,
      label: entry.shortLabel || entry.label,
      iconId: entry.id,
      isCustom: false,
      tabId: entry.tabId,
      isUniversal: !!entry.isUniversal,
      isDisabled: visibility[entry.id] === false,
      hasContent: checkSectionHasContent(cvData, entry.id)
    }));

  return [...customItems, ...catalogItems];
}
