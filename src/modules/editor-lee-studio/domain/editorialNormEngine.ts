/**
 * Núcleo puro — Motor de Normas Estructurales y Cascada de EditorLee (editorialNormEngine.ts)
 *
 * Separa explícitamente los 3 ejes globales de EditorLee para evitar colisiones:
 * 1. Tipo de obra (`presetId`): define capítulos recomendados, carátula y hoja inicial.
 * 2. Norma estructural (`structuralNormId`): regula márgenes, interlineado, sangría y cuerpo tipográfico
 *    ('libre' | 'apa7' | 'chicago' | 'mla'). Vancouver, IEEE y Harvard suelen adoptar la estructura APA 7.
 * 3. Estilo bibliográfico (`bibliographyStyle`): regula citas en el texto y formato/orden de referencias
 *    ('apa7' | 'vancouver' | 'ieee' | 'harvard' | 'chicago' | 'mla' | 'tradicional').
 *
 * Respeta Nivel 3 (`manualOverrides`) mediante `configCascadeEngine.ts`.
 * Módulo PURO (sin React, sin DOM).
 */

import {
  applyGlobalConfigWithCascade,
  clearManualOverride,
  detectGlobalConflicts,
  getManualOverrides,
  GlobalApplyMode,
  GlobalCascadeConflict,
  markManualOverride,
} from '../../../shared/core/presets/configCascadeEngine';
import {
  BIBLIOGRAPHY_NORM_GUIDES,
  CanonicalCitationStyle,
  normalizeBibliographyStyle,
  syncSectionsBibliographyOrder,
} from './editorialCitationFormatter';
import {
  buildInitialSectionsForPreset,
  DEFAULT_EDITORIAL_PRESET,
  getEditorialPreset,
} from './editorialPresetCatalog';
import type {
  EditorialBibliographyStyle,
  EditorialPresetId,
  EditorialStructuralNormId,
} from './editorialTypes';

export interface EditorialDesignDefaultsFlat {
  pageSizeId: string;
  marginTop: number;
  marginBottom: number;
  marginRight: number;
  gutter: number;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  firstLineIndent: boolean;
  pageNumbers: boolean;
}

export interface EditorialStructuralNormSpec {
  id: EditorialStructuralNormId;
  shortLabel: string;
  label: string;
  summary: string;
  compatibilityHint: string;
  strictCitationStyle?: CanonicalCitationStyle;
  designDefaults: EditorialDesignDefaultsFlat;
}

export const EDITORIAL_STRUCTURAL_NORMS: Record<EditorialStructuralNormId, EditorialStructuralNormSpec> = {
  libre: {
    id: 'libre',
    shortLabel: 'Según obra',
    label: 'Estructura según tipo de obra (Libro / Escolar / Informe)',
    summary: 'Usa las medidas, márgenes y tipografía recomendadas por el tipo de obra o trabajo elegido.',
    compatibilityHint: 'Ideal para novelas, apuntes didácticos, trabajos escolares e informes ejecutivos.',
    designDefaults: {
      pageSizeId: 'a4',
      marginTop: 20,
      marginBottom: 20,
      marginRight: 20,
      gutter: 22,
      fontFamily: 'Helvetica',
      fontSize: 11,
      lineHeight: 1.5,
      firstLineIndent: false,
      pageNumbers: true,
    },
  },
  apa7: {
    id: 'apa7',
    shortLabel: 'APA 7',
    label: 'Normas APA 7.ª ed. (Estructura académica universal)',
    summary: 'Márgenes parejos de 25 mm (1 pulgada), interlineado doble (2.0), inicio de párrafo desplazado y 12 pt claros.',
    compatibilityHint:
      'También es la base visual estándar cuando usás citas estilo Vancouver, IEEE o Harvard.',
    designDefaults: {
      pageSizeId: 'a4',
      marginTop: 25,
      marginBottom: 25,
      marginRight: 25,
      gutter: 25,
      fontFamily: 'Times-Roman',
      fontSize: 12,
      lineHeight: 2.0,
      firstLineIndent: true,
      pageNumbers: true,
    },
  },
  chicago: {
    id: 'chicago',
    shortLabel: 'Chicago',
    label: 'Chicago / Turabian (Estética editorial estricta)',
    summary: 'Márgenes de 25 mm, letra serif clásica 12 pt, doble espacio 2.0 e inicio de párrafo desplazado.',
    compatibilityHint: 'Posee reglas visuales estrictas; se aconseja combinarlo con citas estilo Chicago.',
    strictCitationStyle: 'chicago',
    designDefaults: {
      pageSizeId: 'carta',
      marginTop: 25,
      marginBottom: 25,
      marginRight: 25,
      gutter: 25,
      fontFamily: 'Times-Roman',
      fontSize: 12,
      lineHeight: 2.0,
      firstLineIndent: true,
      pageNumbers: true,
    },
  },
  mla: {
    id: 'mla',
    shortLabel: 'MLA 9',
    label: 'MLA 9.ª ed. (Humanidades, Lengua y Literatura)',
    summary: 'Márgenes de 25 mm, doble espacio 2.0 en todo el documento, Times 12 pt y sección "Obras citadas".',
    compatibilityHint: 'Posee estética propia estricta; suele ir siempre junto al sistema de citas MLA.',
    strictCitationStyle: 'mla',
    designDefaults: {
      pageSizeId: 'carta',
      marginTop: 25,
      marginBottom: 25,
      marginRight: 25,
      gutter: 25,
      fontFamily: 'Times-Roman',
      fontSize: 12,
      lineHeight: 2.0,
      firstLineIndent: true,
      pageNumbers: true,
    },
  },
};

export const EDITORIAL_CONTROLLED_FIELD_LABELS: Record<keyof EditorialDesignDefaultsFlat, string> = {
  pageSizeId: 'Hoja de impresión',
  marginTop: 'Margen superior',
  marginBottom: 'Margen inferior',
  marginRight: 'Margen exterior',
  gutter: 'Margen de lomo / izquierdo',
  fontFamily: 'Familia tipográfica',
  fontSize: 'Tamaño de letra',
  lineHeight: 'Interlineado',
  firstLineIndent: 'Inicio de párrafo desplazado',
  pageNumbers: 'Numeración de páginas',
};

export interface EditorialNormCompatibility {
  level: 'optimal' | 'ok' | 'advisory';
  badge: string;
  message: string;
}

const APA_LAYOUT_FRIENDLY_CITATIONS = new Set<CanonicalCitationStyle>([
  'apa7',
  'vancouver',
  'ieee',
  'harvard',
]);

export function checkEditorialNormCompatibility(
  structuralNormId: EditorialStructuralNormId,
  bibliographyStyle: EditorialBibliographyStyle,
): EditorialNormCompatibility {
  const bibStyle = normalizeBibliographyStyle(bibliographyStyle);
  const bibGuide = BIBLIOGRAPHY_NORM_GUIDES[bibStyle];

  if (structuralNormId === 'chicago' && bibStyle !== 'chicago') {
    return {
      level: 'advisory',
      badge: 'Combinación inusual',
      message: `La norma visual Chicago suele ir acoplada a citas Chicago. Elegiste "${bibGuide.label}" como excepción consciente; podés alinearla o dejarla así.`,
    };
  }
  if (structuralNormId === 'mla' && bibStyle !== 'mla') {
    return {
      level: 'advisory',
      badge: 'Combinación inusual',
      message: `MLA 9 tiene reglas estéticas propias ligadas al formato de citas MLA. Elegiste "${bibGuide.label}"; verificá si tu docente pidió esa mezcla.`,
    };
  }
  if (structuralNormId === 'apa7' && APA_LAYOUT_FRIENDLY_CITATIONS.has(bibStyle)) {
    return {
      level: 'optimal',
      badge: 'Combinación recomendada',
      message:
        bibStyle === 'apa7'
          ? 'Estructura visual y referencias unificadas bajo Normas APA 7.ª edición.'
          : `${bibGuide.label} adopta naturalmente el diseño de página limpio de APA 7 sin conflictos.`,
    };
  }
  if (structuralNormId === 'chicago' && bibStyle === 'chicago') {
    return {
      level: 'optimal',
      badge: 'Chicago completo',
      message: 'Diseño de página y citas alineados íntegramente al estándar Chicago.',
    };
  }
  if (structuralNormId === 'mla' && bibStyle === 'mla') {
    return {
      level: 'optimal',
      badge: 'MLA 9 completo',
      message: 'Diseño de página, márgenes y Obras citadas alineados bajo MLA 9.ª edición.',
    };
  }
  return {
    level: 'ok',
    badge: 'Estructura libre + citas',
    message: `Diseño propio de la obra combinado con citas en formato ${bibGuide.label}.`,
  };
}

export function resolveStructuralNormFromDraft(draft: any): EditorialStructuralNormId {
  const explicit = draft?.design?.structuralNormId;
  if (explicit === 'libre' || explicit === 'apa7' || explicit === 'chicago' || explicit === 'mla') {
    return explicit;
  }
  const legacyNorm = draft?.design?.normId;
  if (legacyNorm === 'apa7' || legacyNorm === 'vancouver') return 'apa7';
  if (legacyNorm === 'chicago') return 'chicago';
  if (legacyNorm === 'mla') return 'mla';
  const preset = getEditorialPreset(draft?.design?.presetId || '');
  if (preset?.structuralNormId) return preset.structuralNormId;
  return 'libre';
}

export function getStructuralNormTargetDefaults(
  structuralNormId: EditorialStructuralNormId,
  presetId?: EditorialPresetId | string,
): EditorialDesignDefaultsFlat {
  if (structuralNormId !== 'libre') {
    return EDITORIAL_STRUCTURAL_NORMS[structuralNormId].designDefaults;
  }
  const preset = getEditorialPreset(presetId || '') || DEFAULT_EDITORIAL_PRESET;
  return {
    pageSizeId: preset.pageSize,
    marginTop: preset.margins.top,
    marginBottom: preset.margins.bottom,
    marginRight: preset.margins.right,
    gutter: preset.margins.gutter,
    fontFamily: preset.typography.fontFamily,
    fontSize: preset.typography.fontSize,
    lineHeight: preset.typography.lineHeight,
    firstLineIndent: preset.firstLineIndent,
    pageNumbers: true,
  };
}

export function extractFlatDesignFromDraft(draft: any): EditorialDesignDefaultsFlat & { manualOverrides: Record<string, boolean> } {
  const d = draft?.design || {};
  const fallback = getStructuralNormTargetDefaults(
    resolveStructuralNormFromDraft(draft),
    d.presetId,
  );
  return {
    pageSizeId: d.pageSizeId || d.pageSize || fallback.pageSizeId,
    marginTop: typeof d.marginTop === 'number' ? d.marginTop : fallback.marginTop,
    marginBottom: typeof d.marginBottom === 'number' ? d.marginBottom : fallback.marginBottom,
    marginRight: typeof d.marginRight === 'number' ? d.marginRight : fallback.marginRight,
    gutter: typeof d.gutter === 'number' ? d.gutter : fallback.gutter,
    fontFamily: d.typography?.fontFamily || fallback.fontFamily,
    fontSize: typeof d.typography?.fontSize === 'number' ? d.typography.fontSize : fallback.fontSize,
    lineHeight: typeof d.typography?.lineHeight === 'number' ? d.typography.lineHeight : fallback.lineHeight,
    firstLineIndent: typeof d.firstLineIndent === 'boolean' ? d.firstLineIndent : fallback.firstLineIndent,
    pageNumbers: typeof d.pageNumbers === 'boolean' ? d.pageNumbers : true,
    manualOverrides: getManualOverrides(d),
  };
}

export function detectEditorialDesignConflicts(
  draft: any,
  structuralNormId: EditorialStructuralNormId,
  presetId?: EditorialPresetId | string,
): GlobalCascadeConflict[] {
  const flat = extractFlatDesignFromDraft(draft);
  const defaults = getStructuralNormTargetDefaults(structuralNormId, presetId || draft?.design?.presetId);
  return detectGlobalConflicts(
    flat,
    defaults as unknown as Record<string, unknown>,
    EDITORIAL_CONTROLLED_FIELD_LABELS,
  );
}

export function applyEditorialGlobalConfig<T extends Record<string, any>>(
  draft: T,
  params: {
    presetId?: EditorialPresetId;
    presetMode?: 'apply-design' | 'replace-structure';
    structuralNormId: EditorialStructuralNormId;
    bibliographyStyle: EditorialBibliographyStyle;
    applyMode?: GlobalApplyMode;
  },
): T {
  const {
    presetId = draft?.design?.presetId || DEFAULT_EDITORIAL_PRESET.id,
    presetMode = 'apply-design',
    structuralNormId,
    bibliographyStyle,
    applyMode = 'preserve-manual',
  } = params;

  const preset = getEditorialPreset(presetId) || DEFAULT_EDITORIAL_PRESET;
  const bibStyle = normalizeBibliographyStyle(bibliographyStyle);
  const flatCurrent = extractFlatDesignFromDraft(draft);
  const targetDefaults = getStructuralNormTargetDefaults(structuralNormId, preset.id);

  const cascadedFlat = applyGlobalConfigWithCascade(flatCurrent, {
    alwaysPatch: {},
    defaultsPatch: targetDefaults,
    mode: applyMode,
  });

  const legacyNormId =
    bibStyle === 'vancouver' && structuralNormId === 'apa7'
      ? 'vancouver'
      : structuralNormId;

  const baseSections =
    presetMode === 'replace-structure'
      ? buildInitialSectionsForPreset(preset.id)
      : Array.isArray(draft?.sections)
        ? draft.sections
        : [];

  const syncedSections = syncSectionsBibliographyOrder(baseSections, bibStyle);

  const currentCover = draft?.cover || {};
  return {
    ...draft,
    design: {
      ...(draft?.design || {}),
      presetId: preset.id,
      pageSizeId: cascadedFlat.pageSizeId,
      marginTop: cascadedFlat.marginTop,
      marginBottom: cascadedFlat.marginBottom,
      marginLeft: cascadedFlat.gutter,
      marginRight: cascadedFlat.marginRight,
      gutter: cascadedFlat.gutter,
      structuralNormId,
      normId: legacyNormId,
      bibliographyStyle: bibStyle,
      firstLineIndent: cascadedFlat.firstLineIndent,
      bibliographyHangingIndent: bibStyle !== 'tradicional',
      manualOverrides: cascadedFlat.manualOverrides,
      typography: {
        fontFamily: cascadedFlat.fontFamily,
        fontSize: cascadedFlat.fontSize,
        lineHeight: cascadedFlat.lineHeight,
      },
    },
    cover: {
      ...currentCover,
      mode: presetMode === 'replace-structure' ? preset.coverMode : currentCover.mode || preset.coverMode,
      coverStyleId: currentCover.coverStyleId || preset.coverStyleId,
      coverPaletteKey: currentCover.coverPaletteKey || preset.coverPaletteKey,
    },
    tocConfig: {
      enabled: preset.dockButtons.toc,
      title: structuralNormId === 'apa7' ? 'Tabla de Contenidos' : 'Índice General',
      showSubtitles: true,
      position: 'tras-caratula',
      ...(draft?.tocConfig || {}),
    },
    sections: syncedSections,
  };
}

export function markEditorialFieldManual<T extends Record<string, any>>(
  draft: T,
  fieldKey: keyof EditorialDesignDefaultsFlat,
): T {
  const nextDesign = markManualOverride(draft?.design || {}, fieldKey);
  return {
    ...draft,
    design: nextDesign,
  };
}

export function clearEditorialFieldManual<T extends Record<string, any>>(
  draft: T,
  fieldKey: keyof EditorialDesignDefaultsFlat,
): T {
  const structuralNormId = resolveStructuralNormFromDraft(draft);
  const defaults = getStructuralNormTargetDefaults(structuralNormId, draft?.design?.presetId);
  const restored = defaults[fieldKey];
  const currentDesign = draft?.design || {};
  const cleaned = clearManualOverride(currentDesign, fieldKey);

  if (fieldKey === 'fontFamily' || fieldKey === 'fontSize' || fieldKey === 'lineHeight') {
    return {
      ...draft,
      design: {
        ...cleaned,
        typography: {
          ...(cleaned.typography || {}),
          [fieldKey]: restored,
        },
      },
    };
  }

  return {
    ...draft,
    design: {
      ...cleaned,
      [fieldKey]: restored,
      ...(fieldKey === 'gutter' ? { marginLeft: restored } : {}),
    },
  };
}

export function formatEditorialPillLabel(draft: any): {
  shortLabel: string;
  tooltip: string;
} {
  const preset = getEditorialPreset(draft?.design?.presetId || '') || DEFAULT_EDITORIAL_PRESET;
  const structuralNorm = resolveStructuralNormFromDraft(draft);
  const bibStyle = normalizeBibliographyStyle(draft?.design?.bibliographyStyle || draft?.design?.normId);
  const bibShortMap: Record<CanonicalCitationStyle, string> = {
    apa7: 'APA 7',
    vancouver: 'Vancouver',
    ieee: 'IEEE',
    harvard: 'Harvard',
    chicago: 'Chicago',
    mla: 'MLA 9',
    tradicional: 'Libre',
  };

  const bibShort = bibShortMap[bibStyle] || 'APA 7';
  if (structuralNorm === 'libre') {
    const shortLabel = bibStyle === 'tradicional' ? preset.shortLabel : `${preset.shortLabel} · ${bibShort}`;
    return {
      shortLabel,
      tooltip: `Obra: ${preset.label} | Citas: ${BIBLIOGRAPHY_NORM_GUIDES[bibStyle].label}. Tocá para ajustar normas globales sin perder tu texto.`,
    };
  }

  const normShort = EDITORIAL_STRUCTURAL_NORMS[structuralNorm].shortLabel;
  const shortLabel = normShort === bibShort ? `${normShort}` : `${normShort} · ${bibShort}`;
  return {
    shortLabel,
    tooltip: `Obra: ${preset.shortLabel} | Estructura: ${EDITORIAL_STRUCTURAL_NORMS[structuralNorm].label} | Citas: ${BIBLIOGRAPHY_NORM_GUIDES[bibStyle].label}.`,
  };
}

export interface EditorialThreePillLabels {
  presetShort: string;
  presetTooltip: string;
  normShort: string;
  normTooltip: string;
  bibShort: string;
  bibTooltip: string;
}

export function formatEditorialGlobalPills(draft: any): EditorialThreePillLabels {
  const preset = getEditorialPreset(draft?.design?.presetId || '') || DEFAULT_EDITORIAL_PRESET;
  const structuralNorm = resolveStructuralNormFromDraft(draft);
  const normSpec = EDITORIAL_STRUCTURAL_NORMS[structuralNorm];
  const bibStyle = normalizeBibliographyStyle(draft?.design?.bibliographyStyle || draft?.design?.normId);
  const bibGuide = BIBLIOGRAPHY_NORM_GUIDES[bibStyle];
  const bibShortMap: Record<CanonicalCitationStyle, string> = {
    apa7: 'APA 7',
    vancouver: 'Vancouver',
    ieee: 'IEEE',
    harvard: 'Harvard',
    chicago: 'Chicago',
    mla: 'MLA 9',
    tradicional: 'Libre',
  };

  const bibShort = bibShortMap[bibStyle] || 'APA 7';
  return {
    presetShort: preset.shortLabel,
    presetTooltip: `Tipo de obra: ${preset.label}. Tocá para cambiar la plantilla base.`,
    normShort: normSpec.shortLabel,
    normTooltip: `Norma visual de página: ${normSpec.label}. Tocá para ajustar márgenes e interlineado globales.`,
    bibShort: `Citas: ${bibShort}`,
    bibTooltip: `Estilo bibliográfico: ${bibGuide.label}. Tocá para cambiar el formato de citas.`,
  };
}
