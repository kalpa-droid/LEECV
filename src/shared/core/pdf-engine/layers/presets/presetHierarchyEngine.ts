import { getCvFormat, getFormatDefaultVisibility, resolveActiveFormatId } from '../../../formats/cvFormatRegistry';

export type PresetLevel = 'format' | 'preset' | 'override';

export interface ApplyPresetPayload {
  formatId?: string;
  presetId?: string;
  colorPresetId?: string;
  typographyPresetId?: string;
  columnLayoutPresetId?: string;
}

/**
 * NÚCLEO — GOBERNANZA Y JERARQUÍA DE PRESETS Y FORMATOS (presetHierarchyEngine.ts)
 * 
 * Regula la cascada limpia de 3 niveles:
 * Level 1: Formato Global (activeFormatId) -> Define estándar regional/internacional,
 *          visibilidad de secciones y reset de overrides incompatibles.
 * Level 2: Plantilla Base Visual (activePresetId) -> Define el diseño visual (paleta + tipografía)
 *          y limpia overrides manuales para un estado puro.
 * Level 3: Overrides Manuales (colorPresetId, typographyPresetId, columnLayoutPresetId) ->
 *          Ajustes individuales del usuario sobre la plantilla base activa.
 */
export function applyPresetLevel(cvData: any, level: PresetLevel, payload: ApplyPresetPayload): any {
  if (!cvData) return cvData;

  if (level === 'format' && payload.formatId) {
    const fmt = getCvFormat(payload.formatId);
    const newVis = getFormatDefaultVisibility(payload.formatId);
    const recPreset = fmt.recommendedPresetIds?.[0] || 'cv-clasico';
    const activePresetCompatible = fmt.recommendedPresetIds?.includes(cvData?.activePresetId);

    return {
      ...cvData,
      activeFormatId: payload.formatId,
      columnLayoutPresetId: fmt.columnLayoutPresetId,
      activePresetId: activePresetCompatible ? cvData.activePresetId : recPreset,
      // Limpiar overrides manuales de color y tipografía al cambiar de formato global
      colorPresetId: undefined,
      typographyPresetId: undefined,
      sectionVisibility: {
        ...(cvData?.sectionVisibility || {}),
        ...newVis
      }
    };
  }

  if (level === 'preset' && payload.presetId) {
    const updated = {
      ...cvData,
      activePresetId: payload.presetId,
      activeFormatId: undefined,
      colorPresetId: undefined,
      typographyPresetId: undefined,
      columnLayoutPresetId: undefined
    };
    return {
      ...updated,
      activeFormatId: resolveActiveFormatId(updated)
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

