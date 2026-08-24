/**
 * NÚCLEO — MOTOR DE JERARQUÍA TIPOGRÁFICA DE REGISTRO (typographyHierarchyEngine.ts)
 * 
 * Deriva 5 niveles de escala tipográfica proporcional para registros:
 * 1. recordTitle: Título del registro (grado, cargo, nombre de curso)
 * 2. recordSubtitle: Subtítulo/Institución (institución, empresa)
 * 3. recordMeta: Badges y metadatos (carga horaria, modalidad, resolución)
 * 4. recordBody: Descripción o detalle principal
 * 5. recordExtra: Notas secundarias y enlaces
 * 
 * Enforce legibilidad mediante clamping rígido [7.5pt, 24pt].
 */

import { TypographyScale } from '../presets/presetSchema';

export interface RecordScaleRatios {
  subtitle?: number; // p. ej. 1.1 (10% más grande que cuerpo)
  meta?: number;     // p. ej. 0.9 (10% más chico)
  extra?: number;    // p. ej. 0.85 (15% más chico)
}

export interface RecordTypographyScale {
  title: number;
  subtitle: number;
  badge: number;
  extra: number;
  description: number;

  // Compatibilidad retroactiva
  recordTitle: number;
  recordSubtitle: number;
  recordMeta: number;
  recordBody: number;
  recordExtra: number;
  lineHeightBody: number;
}

function clamp(val: number, min = 7.5, max = 24): number {
  return Math.min(max, Math.max(min, Number(val.toFixed(2))));
}

export function deriveRecordScale(
  base: TypographyScale,
  ratios?: RecordScaleRatios
): RecordTypographyScale {
  const bodySize = base.body || 9.5;
  const subtitleRatio = ratios?.subtitle || 1.1;
  const metaRatio = ratios?.meta || 0.92;
  const extraRatio = ratios?.extra || 0.85;

  const titleSize = clamp(base.itemTitle || 10.5, 9.5, 20);
  const subSize = clamp(bodySize * subtitleRatio, 8.5, 16);
  const bodySizeClamped = clamp(bodySize, 8.0, 14);
  const metaSize = clamp(bodySize * metaRatio, 7.5, 12);
  const extraSize = clamp(bodySize * extraRatio, 7.5, 11);
  const lh = base.lineHeightBody || 1.3;

  return {
    title: titleSize,
    subtitle: subSize,
    badge: metaSize,
    description: bodySizeClamped,
    extra: extraSize,

    // Aliases de compatibilidad
    recordTitle: titleSize,
    recordSubtitle: subSize,
    recordBody: bodySizeClamped,
    recordMeta: metaSize,
    recordExtra: extraSize,
    lineHeightBody: lh
  };
}
