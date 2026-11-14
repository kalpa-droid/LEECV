import { CvFormatDefinition } from '../../../formats/cvFormatRegistry';
import { Preset } from './presetSchema';
import { CANONICAL_SECTION_ORDER } from '../../../sections/canonicalSectionOrder';
import { SECTION_CATALOG } from '../../../sectionRegistry';

export type TemplateApplicationMode = 'full-template' | 'template-order' | 'no-filters' | 'all-sections';

export interface PresentationState {
  sectionVisibility: Record<string, boolean>;
  sectionOrders: { primaria: string[]; secundaria: string[] };
}

export const ALL_SECTION_IDS = CANONICAL_SECTION_ORDER.filter(id => id !== 'firma');

/**
 * NÚCLEO — MOTOR DE APLICACIÓN DE PLANTILLAS (templateApplicationEngine.ts)
 * 
 * Función pura que recalcula únicamente visibilidad y orden de presentación (dividido en 2 columnas: primaria y secundaria)
 * sin alterar los arreglos de datos subyacentes. Permite un ciclo infinito
 * de aplicar plantilla -> editar a mano -> re-aplicar plantilla sin pérdida.
 */
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

  if (mode === 'all-sections') {
    const prioritized = [...new Set(defaultVisible.filter(id => ALL_SECTION_IDS.includes(id)))];
    const fullOrder = [...prioritized, ...ALL_SECTION_IDS.filter(id => !prioritized.includes(id))];
    const visibility: Record<string, boolean> = {};
    for (const id of ALL_SECTION_IDS) {
      visibility[id] = true;
    }

    return {
      sectionVisibility: visibility,
      sectionOrders: {
        primaria: ensureFirmaTerminalInPrimaria(fullOrder.filter(id => columnOf(id) === 'primaria')),
        secundaria: fullOrder.filter(id => columnOf(id) === 'secundaria'),
      },
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
    const currentPrimaria = current?.sectionOrders?.primaria || [];
    const currentSecundaria = current?.sectionOrders?.secundaria || [];
    const manualColumn = new Map<string, 'primaria' | 'secundaria'>();
    currentPrimaria.forEach(id => manualColumn.set(id, 'primaria'));
    currentSecundaria.forEach(id => manualColumn.set(id, 'secundaria'));

    const visible = defaultVisible.filter(id => ALL_SECTION_IDS.includes(id)); // ya viene en el orden de prioridad del formato
    const primaria: string[] = [];
    const secundaria: string[] = [];
    for (const id of visible) {
      const manual = manualColumn.get(id);
      if (manual) {
        (manual === 'secundaria' ? secundaria : primaria).push(id);
      } else if (columnOf(id) === 'secundaria') {
        secundaria.push(id);
      } else {
        primaria.push(id);
      }
    }
    return {
      sectionVisibility: visibility,
      sectionOrders: {
        primaria: ensureFirmaTerminalInPrimaria(primaria),
        secundaria,
      },
    };
  }

  // template-order: nada se oculta, se prioriza el orden del formato,
  // el resto se agrega después — separado por columna, respetando la
  // columna base de cada sección (no las mueve de columna, solo las ordena
  // dentro de la suya).
  const prioritized = defaultVisible;
  const rest = ALL_SECTION_IDS.filter(id => !prioritized.includes(id));
  const fullOrder = [...prioritized, ...rest];
  return {
    sectionVisibility: { ...(current?.sectionVisibility || {}) },
    sectionOrders: {
      primaria: ensureFirmaTerminalInPrimaria(fullOrder.filter(id => columnOf(id) === 'primaria')),
      secundaria: fullOrder.filter(id => columnOf(id) === 'secundaria'),
    },
  };
}
