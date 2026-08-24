/**
 * NÚCLEO — MOTOR DE UBICACIÓN COMPLETA DE CAMPOS (fieldPlacementEngine.ts)
 *
 * Recibe un StructuredRecordLayout (campos resueltos con su pdfRole) y el arquetipo
 * de diseño espacial activo (stacked-clean, split-date-left, inline-compact, boxed-highlight)
 * y organiza la representación estructural del registro garantizando cero omisión de datos.
 */

import { StructuredRecordLayout } from './recordLayoutEngine';
import { RecordLayoutTemplate } from './recordSpatialLayoutEngine';

export interface PlacedRecordElement {
  id: string;
  role: 'title' | 'subtitle' | 'badge' | 'extra' | 'description';
  label?: string;
  value: string;
  type?: 'text' | 'textarea' | 'url';
}

export interface ArrangedRecordLayout {
  archetype: RecordLayoutTemplate;
  headerTitle: string | null;
  headerSubtitle: string | null;
  sideBadge: string | null;
  inlineBadges: PlacedRecordElement[];
  extrasList: PlacedRecordElement[];
  blockDescription: string | null;
  totalFieldsCount: number;
}

export function arrangeRecordFields(
  structured: StructuredRecordLayout,
  archetype: RecordLayoutTemplate = 'stacked-clean'
): ArrangedRecordLayout {
  const inlineBadges: PlacedRecordElement[] = [];
  const extrasList: PlacedRecordElement[] = [];
  let sideBadge: string | null = null;
  let fieldCount = 0;

  if (structured.header) fieldCount++;
  if (structured.subheader) fieldCount++;
  if (structured.block) fieldCount++;

  // Procesamiento de Badges
  structured.badges.forEach((b, idx) => {
    fieldCount++;
    if (archetype === 'split-date-left' && idx === 0) {
      sideBadge = b.value;
    } else {
      inlineBadges.push({
        id: b.id,
        role: 'badge',
        label: b.label,
        value: b.value
      });
    }
  });

  // Procesamiento de Extras (garantiza cero omisión)
  structured.extras.forEach((e) => {
    fieldCount++;
    extrasList.push({
      id: e.id,
      role: 'extra',
      label: e.label,
      value: e.value,
      type: e.type
    });
  });

  return {
    archetype,
    headerTitle: structured.header,
    headerSubtitle: structured.subheader,
    sideBadge,
    inlineBadges,
    extrasList,
    blockDescription: structured.block,
    totalFieldsCount: fieldCount
  };
}
