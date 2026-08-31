import { SECTION_CATALOG, getSection } from '../sectionRegistry';

export interface ActivateSectionOptions {
  titleText?: string;
  fields?: string[];
  iconId?: string;
}

export interface ActivateSectionResult {
  updatedCvData: any;
  targetTab: string;
}

/**
 * NÚCLEO — MOTOR DE ACTIVACIÓN UNIFICADA DE SECCIONES (sectionActivationEngine.ts)
 * 
 * Regula la activación atómica de secciones en `cvData`:
 * 1. Garantiza `sectionVisibility[sectionId] = true` sin desincronización de renders.
 * 2. Si la sección es una sección personalizada nueva, la agrega en `customSections`.
 * 3. Devuelve `targetTab` para enfocar automáticamente la pestaña correspondiente en el editor.
 */
export function activateSection(
  cvData: any,
  sectionId: string,
  options?: ActivateSectionOptions
): ActivateSectionResult {
  if (!cvData) {
    return { updatedCvData: cvData, targetTab: sectionId };
  }

  const catalogEntry = getSection(sectionId, cvData.customSections || []);
  const isCatalogSection = SECTION_CATALOG.some((s) => s.id === sectionId);

  let customSections = [...(cvData.customSections || [])];

  if (!isCatalogSection && !catalogEntry) {
    // Es una nueva sección a medida que no existía antes
    const newCustom = {
      id: sectionId,
      titleText: options?.titleText || 'Nueva Sección',
      iconId: options?.iconId || 'custom',
      fields: options?.fields || ['tituloOGrado'],
      records: []
    };
    customSections.push(newCustom);
  }

  const updatedCvData = {
    ...cvData,
    customSections,
    sectionVisibility: {
      ...(cvData.sectionVisibility || {}),
      [sectionId]: true
    }
  };

  return {
    updatedCvData,
    targetTab: sectionId
  };
}
