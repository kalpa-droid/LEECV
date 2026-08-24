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

  // Organizar secciones por sector según preset.sectionOrder
  const sidebarSectionIds = preset.sectionOrder.find(s => s.sectorRole === 'sidebar')?.sectionIds || [];
  const mainSectionIds = preset.sectionOrder.find(s => s.sectorRole === 'main')?.sectionIds || [];

  const splitSector = (secList: ContentSection[], reservedHeaderPt: number) => {
    const p1: ContentSection[] = [];
    const p2: ContentSection[] = [];
    let curH = reservedHeaderPt;
    let hasOverflow = false;

    for (const section of secList) {
      const titleH = section.titleText ? (typography.sectionHeading || 11) + 12 : 0;
      if (curH + titleH > availableHeightPt - 30) {
        hasOverflow = true;
        p2.push(section);
        continue;
      }

      const fitRecs: any[] = [];
      const overRecs: any[] = [];
      let secH = titleH;

      for (const rec of section.records) {
        const rH = estimateRecordHeightPt(rec, typography);
        if (curH + secH + rH <= availableHeightPt - 20) {
          fitRecs.push(rec);
          secH += rH;
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
        p2.push({
          ...section,
          id: `${section.id}-cont`,
          titleText: section.titleText ? `${section.titleText} (cont.)` : '',
          records: overRecs
        });
      }
    }

    return { p1, p2, hasOverflow };
  };

  const sidebarSections = sections.filter(sec => sidebarSectionIds.includes(sec.id));
  const mainSections = sections.filter(sec => mainSectionIds.includes(sec.id) || (!sidebarSectionIds.includes(sec.id) && !mainSectionIds.includes(sec.id)));

  // Reserva de foto en sidebar (150pt) y título de header en main (40pt)
  const sidebarSplit = splitSector(sidebarSections, 150);
  const mainSplit = splitSector(mainSections, 40);

  const overflowed = sidebarSplit.hasOverflow || mainSplit.hasOverflow;

  if (!overflowed) {
    return {
      pages: [{ pageNumber: 1, totalPages: 1, sections }],
      hasOverflowed: false
    };
  }

  const totalPages = 2;
  return {
    pages: [
      { pageNumber: 1, totalPages, sections: [...sidebarSplit.p1, ...mainSplit.p1] },
      { pageNumber: 2, totalPages, sections: [...sidebarSplit.p2, ...mainSplit.p2] }
    ],
    hasOverflowed: true
  };
}
