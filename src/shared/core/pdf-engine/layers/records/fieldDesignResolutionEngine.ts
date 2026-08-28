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
import { Preset } from '../presets/presetSchema';
import { ResolvedThemeRoles } from '../colors/colorSystem';
import { resolveSubtleCardBackground } from '../colors/surfaceAwareColorEngine';
import { resolveUnifiedTextSpec, ResolvedTextSpec } from '../typography/unifiedTextHierarchyEngine';

export type PdfRole = 'title' | 'subtitle' | 'badge' | 'description' | 'extra';

export interface ResolvedFieldDesign {
  fieldId: string;
  pdfRole: PdfRole;
  effectiveRole: PdfRole;
  fontSizePt: number;
  colorHex: string;
  fontFamily: string;
  fontWeight: 'bold' | 'normal';
  fontStyle: 'normal' | 'italic';
  opacity: number;
  position: 'inline-right' | 'inline-left' | 'own-line';
  designHint: FieldDesignHint;
  unifiedSpec: ResolvedTextSpec;
}

export function resolveFieldDesign(
  fieldId: string,
  pdfRole: PdfRole,
  preset: Preset,
  sectorRolesColor: ResolvedThemeRoles,
  sectorRole: 'sidebar' | 'main' = 'main'
): ResolvedFieldDesign {
  const catalogEntry = FIELD_CATALOG[fieldId];
  
  // Regla de oro: Si el campo no está catalogado (secciones custom creadas por el usuario), hereda el rol
  const designHint: FieldDesignHint = catalogEntry?.designHint || {};
  const effectiveRole: PdfRole = designHint.sizeOverride || pdfRole;

  // 1. Resolver la superficie del contenedor de registros en HSL
  const cardBgHex = resolveSubtleCardBackground(sectorRole, sectorRolesColor);

  // 2. Obtener la especificacion tipográfica y cromática unificada HSL WCAG
  const unifiedSpec = resolveUnifiedTextSpec(
    effectiveRole,
    cardBgHex,
    sectorRolesColor,
    preset.typography,
    fieldId
  );

  // Overrides de diseño por catálogo si existen
  let colorHex = unifiedSpec.colorHex;
  if (designHint.colorOverride === 'accent') {
    const accentSpec = resolveUnifiedTextSpec('badge', cardBgHex, sectorRolesColor, preset.typography, fieldId);
    colorHex = accentSpec.colorHex;
  } else if (designHint.colorOverride === 'muted') {
    const metaSpec = resolveUnifiedTextSpec('meta', cardBgHex, sectorRolesColor, preset.typography, fieldId);
    colorHex = metaSpec.colorHex;
  }

  const position = designHint.position || 'own-line';

  return {
    fieldId,
    pdfRole,
    effectiveRole,
    fontSizePt: unifiedSpec.fontSizePt,
    colorHex,
    fontFamily: unifiedSpec.fontFamily,
    fontWeight: unifiedSpec.fontWeight,
    fontStyle: unifiedSpec.fontStyle,
    opacity: unifiedSpec.opacity,
    position,
    designHint,
    unifiedSpec
  };
}
