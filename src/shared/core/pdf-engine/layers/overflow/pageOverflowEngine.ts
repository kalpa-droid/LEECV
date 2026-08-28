/**
 * NÚCLEO — MOTOR DE PAGINACIÓN A4 Y CONTROL DE OVERFLOW (pageOverflowEngine.ts)
 * 
 * Reglas de Arquitectura:
 * 1. Aplica EXCLUSIVAMENTE a presets con `pageCategory: 'documento'`. Presets de 'tarjeta' u 'afiche'
 *    son estrictamente de tamaño fijo y NUNCA se paginan.
 * 2. Mide el presupuesto de altura Pt por página (A4: 841.89pt menos márgenes y encabezados fijos).
 * 3. Si una sección desborda la Página 1:
   - Trunca o colapsa metadatos secundarios (extras) antes de cortar.
   - Refluye los registros sobrantes a la Página 2+.
   - Agrega la leyenda de continuación `(cont.)` en el título de la sección en la nueva página.
   - Mantiene los `pageTextObjects` (números de página, marcas fijas) en cada hoja resultante.
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
  preset: Preset,
  sections: ContentSection[]
): OverflowResult {
  // Regla 1: Las tarjetas de presentación y afiches son de 1 página fija por definición
  if (preset.pageCategory !== 'documento') {
    return {
      pages: [{ pageNumber: 1, totalPages: 1, sections }],
      hasOverflowed: false
    };
  }

  const marginDef = MARGIN_PRESETS[preset.marginPresetId] || MARGIN_PRESETS.documento_estandar;
  const topMarginPt = typeof marginDef.top === 'number' ? Math.round(marginDef.top * 2.8346) : 34;
  const bottomMarginPt = typeof marginDef.bottom === 'number' ? Math.round(marginDef.bottom * 2.8346) : 34;
  const availableHeightPt = A4_HEIGHT_PT - (topMarginPt + bottomMarginPt);
  const typography = preset.typography;

  // Organizar secciones por sector según preset.sectionOrder
  const sidebarSectionIds = preset.sectionOrder.find(s => s.sectorRole === 'sidebar')?.sectionIds || [];
  const mainSectionIds = preset.sectionOrder.find(s => s.sectorRole === 'main')?.sectionIds || [];

  const splitSector = (secList: ContentSection[], reservedHeaderPt: number, isSidebar: boolean) => {
    const p1: ContentSection[] = [];
    const p2: ContentSection[] = [];
    let curH = reservedHeaderPt;
    let hasOverflow = false;

    for (const section of secList) {
      const titleH = section.titleText ? (typography.sectionHeading || 11) + 10 : 0;
      if (curH + titleH > availableHeightPt - 10) {
        hasOverflow = true;
        p2.push(section);
        continue;
      }

      const fitRecs: any[] = [];
      const overRecs: any[] = [];
      let secH = titleH;

      for (const rec of section.records) {
        const subCols = (section as any).subColumnsCount || 1;
        const est = estimateRecordHeightPt(rec, typography, 'stacked-clean', subCols, isSidebar);
        // Evaluar la decisión sobre totalHeightPt para garantizar que el registro completo entre sin cortar descripciones
        if (curH + secH + est.totalHeightPt <= availableHeightPt - 10) {
          fitRecs.push(rec);
          secH += est.totalHeightPt;
        } else {
          hasOverflow = true;
          overRecs.push(rec);
        }
      }

      if (fitRecs.length > 0) {
        p1.push({ ...section, records: fitRecs });
        curH += secH;
      }

      if (overRecs.length > 0) {
        const cleanId = section.id.replace(/-cont$/, '');
        p2.push({
          ...section,
          id: `${cleanId}-cont`,
          titleText: section.titleText ? section.titleText.replace(/\s*\(cont\.\)$/, '') : '',
          records: overRecs
        });
      }
    }

    return { p1, p2, hasOverflow };
  };

  const sidebarSections = sections.filter(sec => sidebarSectionIds.includes(sec.id));
  const mainSections = sections.filter(sec => mainSectionIds.includes(sec.id) || (!sidebarSectionIds.includes(sec.id) && !mainSectionIds.includes(sec.id)));

  // Bucle de paginación N-páginas
  const pages: PageContent[] = [];
  let currentSidebar = sidebarSections;
  let currentMain = mainSections;
  let pageNum = 1;
  const MAX_PAGES = 10;

  while ((currentSidebar.length > 0 || currentMain.length > 0) && pageNum <= MAX_PAGES) {
    const isFirst = pageNum === 1;
    const sidebarReserve = isFirst ? 130 : 5;
    const mainReserve = isFirst ? 25 : 5;

    const sidebarSplit = splitSector(currentSidebar, sidebarReserve, true);
    const mainSplit = splitSector(currentMain, mainReserve, false);

    const hasContentOnPage = sidebarSplit.p1.length > 0 || mainSplit.p1.length > 0;
    if (!hasContentOnPage && !sidebarSplit.hasOverflow && !mainSplit.hasOverflow) {
      break;
    }

    pages.push({
      pageNumber: pageNum,
      totalPages: 1, // Se actualizará al final
      sections: [...sidebarSplit.p1, ...mainSplit.p1]
    });

    currentSidebar = sidebarSplit.p2;
    currentMain = mainSplit.p2;
    pageNum++;

    if (!sidebarSplit.hasOverflow && !mainSplit.hasOverflow) {
      break;
    }
  }

  // Actualizar totalPages en todas las páginas generadas
  const finalTotalPages = pages.length;
  const updatedPages = pages.map(p => ({ ...p, totalPages: finalTotalPages }));

  return {
    pages: updatedPages,
    hasOverflowed: finalTotalPages > 1
  };
}
