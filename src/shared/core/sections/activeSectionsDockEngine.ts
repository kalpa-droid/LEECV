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
      isDisabled: false
    }));

  const catalogItems: DockSectionItem[] = SECTION_CATALOG
    .filter((entry) => !ABSORBED_INTO_PERSONAL_TAB.has(entry.id))
    .filter((entry) => entry.isUniversal || visibility[entry.id] !== false)
    .map((entry) => ({
      id: entry.id,
      label: entry.shortLabel || entry.label,
      iconId: entry.id,
      isCustom: false,
      tabId: entry.tabId,
      isUniversal: !!entry.isUniversal,
      isDisabled: visibility[entry.id] === false
    }));

  // Personalizadas primero (igual que antes: quedan pegadas al botón "+"),
  // después las del catálogo estándar en su orden declarado.
  return [...customItems, ...catalogItems];
}
