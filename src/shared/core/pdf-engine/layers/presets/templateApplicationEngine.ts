import { CvFormatDefinition } from '../../../formats/cvFormatRegistry';
import { Preset } from './presetSchema';
import { CANONICAL_SECTION_ORDER } from '../../../sections/canonicalSectionOrder';
import { SECTION_CATALOG } from '../../../sectionRegistry';

export type TemplateApplicationMode = 'full-template' | 'template-order' | 'no-filters' | 'all-sections';

export interface PresentationState {
  sectionVisibility: Record<string, boolean>;
  sectionOrders: { primaria: string[]; secundaria: string[] };
  /**
   * Asignación manual de columna por sección (la que eligió la persona a mano).
   * Sobrevive a reaplicar plantilla incluso si la sección está oculta temporalmente.
   */
  columnAssignments?: Record<string, 'primaria' | 'secundaria'>;
}

export const ALL_SECTION_IDS = CANONICAL_SECTION_ORDER.filter(id => id !== 'firma');

/**
 * NÚCLEO — MOTOR DE APLICACIÓN DE PLANTILLAS (templateApplicationEngine.ts)
 *
 * Función pura que recalcula únicamente visibilidad y orden de presentación (dividido en 2 columnas: primaria y secundaria)
 * sin alterar los arreglos de datos subyacentes. Permite un ciclo infinito
 * de aplicar plantilla -> editar a mano -> re-aplicar plantilla sin pérdida.
 */

/**
 * Secciones que NO se distribuyen por columna (p. ej. 'certificados'): su
 * ubicación la resuelve el motor de sectores por su rol canónico. Excluirlas
 * acá evita que un reordenamiento las mueva de columna a mano.
 */
const isColumnAssignable = (id: string): boolean => {
  const entry = SECTION_CATALOG.find(s => s.id === id);
  return !entry || entry.assignableToColumns !== false;
};

/**
 * Fusiona las dos fuentes de "columna elegida a mano": sectionOrders (gana,
 * es el estado editable reciente) sobre columnAssignments (persistencia).
 */
const mergeManualColumns = (
  columnAssignments: Record<string, 'primaria' | 'secundaria'> | undefined,
  sectionOrders: { primaria?: string[]; secundaria?: string[] } | undefined
): Map<string, 'primaria' | 'secundaria'> => {
  const map = new Map<string, 'primaria' | 'secundaria'>();
  Object.entries(columnAssignments || {}).forEach(([id, col]) => {
    if (col === 'primaria' || col === 'secundaria') map.set(id, col);
  });
  (sectionOrders?.primaria || []).forEach(id => map.set(id, 'primaria'));
  (sectionOrders?.secundaria || []).forEach(id => map.set(id, 'secundaria'));
  return map;
};

/**
 * Distribuye ids entre columnas respetando la elección manual; las secciones
 * no asignables a columna (certificados) quedan fuera y las resuelve el
 * motor de sectores por su rol canónico.
 */
const distributeByColumn = (
  ids: string[],
  columnOf: (id: string) => 'primaria' | 'secundaria',
  manualColumn: Map<string, 'primaria' | 'secundaria'>
): { primaria: string[]; secundaria: string[] } => {
  const primaria: string[] = [];
  const secundaria: string[] = [];
  for (const id of ids) {
    if (!isColumnAssignable(id)) continue;
    const manual = manualColumn.get(id);
    if (manual === 'secundaria') secundaria.push(id);
    else if (manual) primaria.push(id);
    else if (columnOf(id) === 'secundaria') secundaria.push(id);
    else primaria.push(id);
  }
  return { primaria, secundaria };
};

export function applyTemplateMode(
  current: PresentationState,
  format: CvFormatDefinition | null | undefined,
  activePreset: Preset,
  mode: TemplateApplicationMode
): PresentationState {
  if (mode === 'no-filters') {
    // Sin cambios de visibilidad ni de columna/orden — solo estilos
    // (paleta/tipografía), que ya se aplican aparte vía presetHierarchyEngine.ts.
    return current;
  }

  const defaultVisible = format?.defaultVisibleSections || ALL_SECTION_IDS;

  const hasSidebarSector = Array.isArray(activePreset?.sectors) && activePreset.sectors.some(s => s.role === 'sidebar');
  const baseSidebarIds = activePreset?.sectionOrder?.find(s => s.sectorRole === 'sidebar')?.sectionIds || [];
  const columnOf = (id: string): 'primaria' | 'secundaria' => {
    if (!hasSidebarSector) return 'primaria';
    return baseSidebarIds.includes(id) ? 'secundaria' : 'primaria';
  };

  const ensureFirmaTerminalInPrimaria = (list: string[]) => {
    if (!list.includes('firma')) return list;
    return [...list.filter(id => id !== 'firma'), 'firma'];
  };

  const manualColumn = mergeManualColumns(current?.columnAssignments, current?.sectionOrders);
  const persistAssignments = Object.fromEntries(manualColumn);

  if (mode === 'all-sections') {
    const prioritized = [...new Set(defaultVisible.filter(id => ALL_SECTION_IDS.includes(id)))];
    const fullOrder = [...prioritized, ...ALL_SECTION_IDS.filter(id => !prioritized.includes(id))];
    const visibility: Record<string, boolean> = {};
    for (const id of ALL_SECTION_IDS) {
      visibility[id] = true;
    }
    const { primaria, secundaria } = distributeByColumn(fullOrder, columnOf, manualColumn);

    return {
      sectionVisibility: visibility,
      sectionOrders: {
        primaria: ensureFirmaTerminalInPrimaria(primaria),
        secundaria,
      },
      columnAssignments: persistAssignments,
    };
  }

  if (mode === 'full-template') {
    const visibility: Record<string, boolean> = {};
    for (const id of ALL_SECTION_IDS) {
      visibility[id] = defaultVisible.includes(id);
    }
    // La plantilla decide QUÉ secciones se ven, pero NO sobrescribe la
    // columna que la persona eligió a mano: si una sección visible ya tenía
    // una asignación de columna en el estado actual, se respeta y solo se
    // reordena dentro de esa columna según la prioridad del formato.
    const visible = defaultVisible.filter(id => ALL_SECTION_IDS.includes(id)); // ya viene en el orden de prioridad del formato
    const { primaria, secundaria } = distributeByColumn(visible, columnOf, manualColumn);
    return {
      sectionVisibility: visibility,
      sectionOrders: {
        primaria: ensureFirmaTerminalInPrimaria(primaria),
        secundaria,
      },
      columnAssignments: persistAssignments,
    };
  }

  // template-order: nada se oculta, se prioriza el orden del formato,
  // el resto se agrega después — separado por columna, respetando la
  // columna elegida a mano (no la mueve de columna, solo la ordena
  // dentro de la suya).
  const prioritized = defaultVisible;
  const rest = ALL_SECTION_IDS.filter(id => !prioritized.includes(id));
  const fullOrder = [...prioritized, ...rest];
  const { primaria, secundaria } = distributeByColumn(fullOrder, columnOf, manualColumn);
  return {
    sectionVisibility: { ...(current?.sectionVisibility || {}) },
    sectionOrders: {
      primaria: ensureFirmaTerminalInPrimaria(primaria),
      secundaria,
    },
    columnAssignments: persistAssignments,
  };
}
