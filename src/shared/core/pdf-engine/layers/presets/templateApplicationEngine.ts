import { CvFormatDefinition } from '../../../formats/cvFormatRegistry';
import { Preset } from './presetSchema';

export type TemplateApplicationMode = 'full-template' | 'template-order' | 'no-filters';

export interface PresentationState {
  sectionVisibility: Record<string, boolean>;
  sectionOrders: { primaria: string[]; secundaria: string[] };
}

export const ALL_SECTION_IDS = [
  'contacto', 'datos-personales', 'redes', 'resumen', 'experiencia',
  'formacion', 'profesion', 'habilidades', 'competencias', 'idiomas',
  'proyectos', 'publicaciones', 'referencias', 'cursos', 'informatica',
  'ecologia', 'certificados'
  // 'firma' excluida a propósito — Paso 1.5, nunca se reordena por acá.
];

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

  // Columna base de cada sección según el preset visual ACTIVO — el
  // formato no tiene esta información, solo el preset la tiene.
  const baseSidebarIds = activePreset?.sectionOrder?.find(s => s.sectorRole === 'sidebar')?.sectionIds || [];
  const columnOf = (id: string): 'primaria' | 'secundaria' =>
    baseSidebarIds.includes(id) ? 'secundaria' : 'primaria';

  if (mode === 'full-template') {
    const visibility: Record<string, boolean> = {};
    for (const id of ALL_SECTION_IDS) {
      visibility[id] = defaultVisible.includes(id);
    }
    const visible = defaultVisible; // ya viene en el orden de prioridad del formato
    return {
      sectionVisibility: visibility,
      sectionOrders: {
        primaria: visible.filter(id => columnOf(id) === 'primaria'),
        secundaria: visible.filter(id => columnOf(id) === 'secundaria'),
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
      primaria: fullOrder.filter(id => columnOf(id) === 'primaria'),
      secundaria: fullOrder.filter(id => columnOf(id) === 'secundaria'),
    },
  };
}

