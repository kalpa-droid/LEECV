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
  sectorRolesColor: ResolvedThemeRoles
): ResolvedFieldDesign {
  const catalogEntry = FIELD_CATALOG[fieldId];
  
  // Regla: Si el campo no está catalogado (p. ej. sección custom), hereda sin override
  const designHint: FieldDesignHint = catalogEntry?.designHint || {};
  const effectiveRole: PdfRole = designHint.sizeOverride || pdfRole;

  // 1. Tamaño Tipográfico derivado del motor de jerarquía tipográfica
  const scale = deriveRecordScale(preset.typography, preset.typography.recordScaleRatios);
  const fontSizePt = scale[effectiveRole] || scale.badge || 9.0;

  // 2. Weight tipográfico por rol efectivo
  const fontWeight: 'bold' | 'normal' = (effectiveRole === 'title' || effectiveRole === 'subtitle') ? 'bold' : 'normal';

  // 3. Color resuelto por superficie y override
  let colorHex = sectorRolesColor.text;
  if (designHint.colorOverride === 'accent') {
    colorHex = sectorRolesColor.accent;
  } else if (designHint.colorOverride === 'muted') {
    colorHex = sectorRolesColor.secondary;
  } else {
    // Rol por defecto
    if (effectiveRole === 'title') {
      colorHex = sectorRolesColor.primary;
    } else if (effectiveRole === 'subtitle') {
      colorHex = sectorRolesColor.secondary;
    } else if (effectiveRole === 'accent' as any) {
      colorHex = sectorRolesColor.accent;
    } else {
      colorHex = sectorRolesColor.text;
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
