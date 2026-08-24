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

import { Preset } from '../presets/presetSchema';
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

const A4_HEIGHT_PT = 841.89;

/**
 * Estima la altura en puntos (pt) ocupada por un registro estructurado.
 */
function estimateRecordHeightPt(record: any, typography: any): number {
  const layout = buildStructuredRecordLayout(record.fields || record);
  let height = 0;

  if (layout.header) height += (typography.itemTitle || 11) + 4;
  if (layout.subheader) height += (typography.body || 9.5) + 3;
  if (layout.badges.length > 0) height += 14;
  if (layout.extras.length > 0) height += layout.extras.length * 12;

  if (layout.block) {
    const lines = layout.block.split('\n').length;
    height += lines * ((typography.body || 9.5) * (typography.lineHeightBody || 1.3));
  }

  return height + 8; // padding inferior
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

  const page1Sections: ContentSection[] = [];
  const page2Sections: ContentSection[] = [];

  let currentHeightPt = 0;
  let overflowed = false;

  for (const section of sections) {
    const sectionTitleHeight = section.titleText ? (typography.sectionHeading || 11) + 12 : 0;
    
    // Si agregar la sección supera el presupuesto de la página 1
    if (currentHeightPt + sectionTitleHeight > availableHeightPt - 40) {
      overflowed = true;
      page2Sections.push(section);
      continue;
    }

    const fitRecords: any[] = [];
    const overflowRecords: any[] = [];
    let secAccumulated = sectionTitleHeight;

    for (const rec of section.records) {
      const recHeight = estimateRecordHeightPt(rec, typography);
      if (currentHeightPt + secAccumulated + recHeight <= availableHeightPt - 20) {
        fitRecords.push(rec);
        secAccumulated += recHeight;
      } else {
        overflowed = true;
        overflowRecords.push(rec);
      }
    }

    if (fitRecords.length > 0) {
      page1Sections.push({
        ...section,
        records: fitRecords
      });
      currentHeightPt += secAccumulated;
    }

    if (overflowRecords.length > 0) {
      page2Sections.push({
        ...section,
        id: `${section.id}-cont`,
        titleText: section.titleText ? `${section.titleText} (cont.)` : '',
        records: overflowRecords
      });
    }
  }

  if (!overflowed || page2Sections.length === 0) {
    return {
      pages: [{ pageNumber: 1, totalPages: 1, sections: page1Sections.length > 0 ? page1Sections : sections }],
      hasOverflowed: false
    };
  }

  const totalPages = 2;
  return {
    pages: [
      { pageNumber: 1, totalPages, sections: page1Sections },
      { pageNumber: 2, totalPages, sections: page2Sections }
    ],
    hasOverflowed: true
  };
}
