/**
 * NÚCLEO — MOTOR DE DISEÑO POR CAMPO (fieldDesignResolutionEngine.ts)
 * 
 * Resuelve el tamaño tipográfico, color perceptual y posición espacial de cada campo individual
 * consultando `FIELD_CATALOG[fieldId].designHint`.
 * 
 * Reglas de Cobertura y Fallback:
 * 1. Si el campo existe en `FIELD_CATALOG`, aplica sus overrides de tamaño, color o posición si los declara.
 * 2. Regla para campos no catalogados (secciones custom): Si el campo no existe en `FIELD_CATALOG`,
 *    retorna el comportamiento default de su `pdfRole` inferido sin overrides.
 * 3. Integración síncrona con `typographyHierarchyEngine` y `sectorRolesColor` resuelto.
 */

import { FIELD_CATALOG, FieldDesignHint } from './fieldCatalog';
import { deriveRecordScale } from '../typography/typographyHierarchyEngine';
import { Preset } from '../presets/presetSchema';
import { ResolvedThemeRoles } from '../colors/colorSystem';
import { resolveHierarchyTextColors, resolveSubtleCardBackground } from '../colors/surfaceAwareColorEngine';

export type PdfRole = 'title' | 'subtitle' | 'badge' | 'description' | 'extra';

export interface ResolvedFieldDesign {
  fieldId: string;
  pdfRole: PdfRole;
  effectiveRole: PdfRole;
  fontSizePt: number;
  colorHex: string;
  fontWeight: 'bold' | 'normal';
  position: 'inline-right' | 'inline-left' | 'own-line';
  designHint: FieldDesignHint;
}

export function resolveFieldDesign(
  fieldId: string,
  pdfRole: PdfRole,
  preset: Preset,
  sectorRolesColor: ResolvedThemeRoles,
  sectorRole: 'sidebar' | 'main' = 'main'
): ResolvedFieldDesign {
  const catalogEntry = FIELD_CATALOG[fieldId];
  
  // Regla: Si el campo no está catalogado (p. ej. sección custom creada por el usuario), hereda el rol
  const designHint: FieldDesignHint = catalogEntry?.designHint || {};
  const effectiveRole: PdfRole = designHint.sizeOverride || pdfRole;

  // 1. Tamaño Tipográfico derivado del motor de jerarquía tipográfica
  const scale = deriveRecordScale(preset.typography, preset.typography.recordScaleRatios);
  const fontSizePt = scale[effectiveRole] || scale.badge || 9.0;

  // 2. Weight tipográfico por rol efectivo (H1 bold, H2 bold/medium, cuerpo normal)
  const fontWeight: 'bold' | 'normal' = (effectiveRole === 'title' || effectiveRole === 'subtitle') ? 'bold' : 'normal';

  // 3. Color resuelto por motor HSL consciente de superficie
  const cardBgHex = resolveSubtleCardBackground(sectorRole, sectorRolesColor);
  const hierarchy = resolveHierarchyTextColors(cardBgHex, sectorRolesColor);

  let colorHex = hierarchy.body;
  if (designHint.colorOverride === 'accent') {
    colorHex = hierarchy.accentText;
  } else if (designHint.colorOverride === 'muted') {
    colorHex = hierarchy.meta;
  } else {
    // Rol por defecto según el nivel de jerarquía
    if (effectiveRole === 'title') {
      colorHex = hierarchy.title;
    } else if (effectiveRole === 'subtitle') {
      colorHex = hierarchy.subtitle;
    } else if (effectiveRole === 'badge') {
      colorHex = hierarchy.accentText;
    } else if (effectiveRole === 'extra') {
      colorHex = hierarchy.meta;
    } else {
      colorHex = hierarchy.body;
    }
  }

  // 4. Posición espacial
  const position = designHint.position || 'own-line';

  return {
    fieldId,
    pdfRole,
    effectiveRole,
    fontSizePt,
    colorHex,
    fontWeight,
    position,
    designHint
  };
}
