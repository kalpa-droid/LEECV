import { getCvFormat, resolveActiveFormatId } from '../../../formats/cvFormatRegistry';
import { applyTemplateMode, TemplateApplicationMode } from './templateApplicationEngine';
import { resolveActivePreset } from './presetRegistry';
import { CANONICAL_SECTION_ORDER } from '../../../sections/canonicalSectionOrder';
import { checkSectionHasContent } from '../../../sections/activeSectionsDockEngine';

export type PresetLevel = 'format' | 'preset' | 'override';


export interface ApplyPresetPayload {
  formatId?: string;
  presetId?: string;
  colorPresetId?: string;
  typographyPresetId?: string;
  columnLayoutPresetId?: string;
  /** @deprecated Usar `templateMode` con el motor canónico `templateApplicationEngine.ts` */
  applicationMode?: 'curated' | 'reorder-only' | 'full-20-sections';
  templateMode?: TemplateApplicationMode;
}

/**
 * NÚCLEO — GOBERNANZA Y JERARQUÍA DE PRESETS Y FORMATOS (presetHierarchyEngine.ts)
 */
export function applyPresetLevel(cvData: any, level: PresetLevel, payload: ApplyPresetPayload): any {
  if (!cvData) return cvData;

  if (level === 'format' && payload.formatId) {
    const fmt = getCvFormat(payload.formatId);
    const recPreset = fmt.recommendedPresetIds?.[0] || 'cv-clasico';
    const activePresetCompatible = fmt.recommendedPresetIds?.includes(cvData?.activePresetId);
    const targetPresetId = activePresetCompatible ? cvData.activePresetId : recPreset;
    const activePreset = resolveActivePreset({ ...cvData, activePresetId: targetPresetId });

    const modeToApply: TemplateApplicationMode = payload.templateMode ||
      (payload.applicationMode === 'reorder-only'
        ? 'template-order'
        : payload.applicationMode === 'full-20-sections'
          ? 'all-sections'
          : 'full-template');

    const newPresentation = applyTemplateMode(
      {
        sectionVisibility: cvData?.sectionVisibility || {},
        sectionOrders: cvData?.layout?.sectionOrders || { primaria: [], secundaria: [] },
        columnAssignments: cvData?.layout?.columnAssignments || {}
      },
      fmt,
      activePreset,
      modeToApply
    );

    return {
      ...cvData,
      activeFormatId: payload.formatId,
      columnLayoutPresetId: fmt.columnLayoutPresetId,
      activePresetId: targetPresetId,
      colorPresetId: undefined,
      typographyPresetId: undefined,
      theme: { ...(cvData.theme || {}), primaryColor: undefined },
      sectionVisibility: newPresentation.sectionVisibility,
      layout: {
        ...(cvData.layout || {}),
        sectionOrders: newPresentation.sectionOrders,
        // Se conservan las asignaciones manuales aunque una sección se oculte temporalmente
        columnAssignments: newPresentation.columnAssignments || cvData?.layout?.columnAssignments || {}
      }
    };
  }

  if (level === 'preset' && payload.presetId) {
    // Secciones opcionales no universales que NO se encienden por defecto si
    // estaban apagadas y sin contenido (evita secciones fantasma sin datos).
    const NON_UNIVERSAL_OPTIONAL = new Set(['logros', 'publicaciones', 'referencias', 'idiomas', 'redes']);
    const allVisible: Record<string, boolean> = {};
    CANONICAL_SECTION_ORDER.forEach((id) => {
      // Los slots de sección personalizada vacíos NO se encienden por defecto:
      // forzarlos visible dejaba botones fantasma en el dock y secciones sin
      // contenido. Solo se prenden si ya estaban visibles o tienen datos.
      if (id.startsWith('personalizada-') || NON_UNIVERSAL_OPTIONAL.has(id)) {
        allVisible[id] = cvData?.sectionVisibility?.[id] === true || checkSectionHasContent(cvData, id);
      } else {
        allVisible[id] = true;
      }
    });

    // Si el formato activo es compatible con el preset elegido, se conserva
    // (no se pierde la elección de formato al cambiar de preset).
    const activeFormatCompatible =
      cvData?.activeFormatId &&
      getCvFormat(cvData.activeFormatId)?.recommendedPresetIds?.includes(payload.presetId);

    const updated = {
      ...cvData,
      activePresetId: payload.presetId,
      activeFormatId: activeFormatCompatible ? cvData.activeFormatId : undefined,
      colorPresetId: undefined,
      typographyPresetId: undefined,
      columnLayoutPresetId: undefined,
      sectionVisibility: allVisible,
      theme: { ...(cvData.theme || {}), primaryColor: undefined },
    };
    return {
      ...updated,
      activeFormatId: activeFormatCompatible ? cvData.activeFormatId : resolveActiveFormatId(updated)
    };
  }

  if (level === 'override') {
    const updated = {
      ...cvData,
      colorPresetId: payload.colorPresetId !== undefined ? payload.colorPresetId : cvData?.colorPresetId,
      typographyPresetId: payload.typographyPresetId !== undefined ? payload.typographyPresetId : cvData?.typographyPresetId,
      columnLayoutPresetId: payload.columnLayoutPresetId !== undefined ? payload.columnLayoutPresetId : cvData?.columnLayoutPresetId
    };
    if (payload.columnLayoutPresetId !== undefined) {
      updated.activeFormatId = undefined;
    }
    return {
      ...updated,
      activeFormatId: resolveActiveFormatId(updated)
    };
  }

  return cvData;
}
