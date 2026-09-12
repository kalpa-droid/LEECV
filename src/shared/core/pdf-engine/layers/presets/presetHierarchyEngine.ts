import { getCvFormat, resolveActiveFormatId } from '../../../formats/cvFormatRegistry';
import { applyTemplateMode, TemplateApplicationMode } from './templateApplicationEngine';
import { resolveActivePreset } from './presetRegistry';

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
      (payload.applicationMode === 'reorder-only' ? 'template-order'
        : payload.applicationMode === 'full-20-sections' ? 'no-filters'
        : 'full-template');

    const newPresentation = applyTemplateMode(
      {
        sectionVisibility: cvData?.sectionVisibility || {},
        sectionOrders: cvData?.layout?.sectionOrders || { primaria: [], secundaria: [] }
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
        sectionOrders: newPresentation.sectionOrders
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
      columnLayoutPresetId: undefined,
      theme: { ...(cvData.theme || {}), primaryColor: undefined },
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

