/**
 * NÚCLEO — MOTOR DE PAGINACIÓN Y CONTROL DE FLUJO DE SECCIONES (pageOverflowEngine.ts)
 * 
 * Reglas de Arquitectura:
 * 1. Aplica EXCLUSIVAMENTE a presets con `pageCategory: 'documento'`. Presets de 'tarjeta' u 'afiche'
 *    son estrictamente de tamaño fijo y NUNCA se paginan.
 * 2. Transfiere el flujo de contenido de forma íntegra e ininterrumpida al motor vectorial nativo (@react-pdf/renderer).
 * 3. Garantiza que no existan truncamientos destructivos de metadatos ni agregados artificiales de sufijos "(cont.)".
 * 4. Respeta los saltos de página nativos forzados por el usuario (`break={sec.breakBefore}`).
 * 5. En maquetaciones de canal único (full-width sin sector sidebar), todas las secciones fluyen transparentemente a través del sector main de ancho completo (100%).
 */

import { Preset, TypographyScale } from '../presets/presetSchema';
import { ContentSection } from '../records/recordTypes';
import { MARGIN_PRESETS } from '../margins/marginPresets';
import { buildStructuredRecordLayout } from '../records/recordLayoutEngine';

export interface PageContent {
  pageNumber: number;
  totalPages: number;
  sections: ContentSection[];
}

export interface OverflowResult {
  pages: PageContent[];
  hasOverflowed: boolean;
}

import { deriveRecordScale } from '../typography/typographyHierarchyEngine';
import { resolveRecordLayout, RecordLayoutTemplate } from '../records/recordSpatialLayoutEngine';
import { arrangeRecordFields } from '../records/fieldPlacementEngine';

export interface RecordHeightEstimate {
  atomicHeaderHeightPt: number;
  flowableDescriptionHeightPt: number;
  totalHeightPt: number;
}

const A4_HEIGHT_PT = 841.89;

/**
 * Estima la altura en puntos (pt) ocupada por un registro estructurado,
 * desglosando el bloque atómico de cabecera de la descripción fluyente.
 */
export function estimateRecordHeightPt(
  record: any,
  typography: TypographyScale,
  layoutTemplate: RecordLayoutTemplate = 'stacked-clean',
  subColumnsCount: number = 1,
  isSidebar: boolean = false
): RecordHeightEstimate {
  const structured = buildStructuredRecordLayout(record.fields || record);
  const arranged = arrangeRecordFields(structured, layoutTemplate);
  const scale = deriveRecordScale(typography, typography.recordScaleRatios);
  const spatial = resolveRecordLayout(layoutTemplate);

  let atomicH = 0;

  // Gaps alineados al CSS real de CardObjectRenderer con cálculo de wrap denso por longitud de caracteres:
  if (arranged.headerTitle) {
    const charsPerLine = isSidebar ? 35 : 70;
    const lines = Math.max(1, Math.ceil(arranged.headerTitle.length / charsPerLine));
    atomicH += lines * scale.title + 2;
  }

  if (arranged.headerSubtitle) {
    const charsPerLine = isSidebar ? 40 : 75;
    const lines = Math.max(1, Math.ceil(arranged.headerSubtitle.length / charsPerLine));
    atomicH += lines * scale.subtitle + 2;
  }

  if (arranged.inlineBadges.length > 0) {
    atomicH += scale.badge + 4;
  }

  if (arranged.extrasList.length > 0) {
    atomicH += (scale.extra + 2) * Math.min(arranged.extrasList.length, 2) + 2;
  }

  let descH = 0;
  if (arranged.blockDescription) {
    const charsPerLine = isSidebar ? 45 : 85;
    let descLines = 0;
    for (const line of arranged.blockDescription.split('\n')) {
      descLines += Math.max(1, Math.ceil((line.length || 1) / charsPerLine));
    }
    descH += descLines * (scale.description * scale.lineHeightBody);
  }

  const paddingVertical = 12;
  const marginBottom = 6;

  const cols = Math.max(1, subColumnsCount);
  const atomicHeaderHeightPt = Math.round((atomicH + paddingVertical + marginBottom) / cols);
  const flowableDescriptionHeightPt = Math.round(descH / cols);
  const totalHeightPt = atomicHeaderHeightPt + flowableDescriptionHeightPt;

  return { atomicHeaderHeightPt, flowableDescriptionHeightPt, totalHeightPt };
}

/**
 * Calcula y resuelve la paginación dinámica para documentos A4.
 */
export function processPageOverflow(
  _preset: Preset,
  sections: ContentSection[]
): OverflowResult {
  return {
    pages: [{ pageNumber: 1, totalPages: 1, sections }],
    hasOverflowed: false
  };
}
