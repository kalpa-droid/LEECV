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
  // Ratios reales (proporciones adimensionales). Si alguien pasa un número > 2 asume pt y lo blindamos.
  const safe = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) && Math.abs(n) <= 2 ? n : 1;
  };
  const subtitleRatio = safe(ratios?.subtitle) || 1.1;
  const metaRatio = safe(ratios?.meta) || 0.92;
  const extraRatio = safe(ratios?.extra) || 0.85;

  // bodySize mínimo 8.0 pt para que escalas compactas (Condensada, Moderna) funcionen
  const bodySize = Math.max(8.0, (base.body ?? 9.5));

  const titleSize = clamp(base.itemTitle || 10.5, 8.0, 20);
  const subSize = clamp(bodySize * subtitleRatio, 7.0, 16);
  const bodySizeClamped = clamp(bodySize, 8.0, 14);
  const metaSize = clamp(bodySize * metaRatio, 6.5, 12);
  const extraSize = clamp(bodySize * extraRatio, 6.0, 11);
  const lh = base.lineHeightBody || 1.3;

  // Invariante estricta por tarjeta: title > subtitle > body > badge > extra
  // Ajuste suave si la multiplicación los invierte (fallback conservador)
  const enforceHierarchy = (t: number, s: number, b: number, m: number, e: number): [number, number, number, number, number] => {
    if (t <= s) t = s + 0.5;
    if (s <= b) s = b + 0.5;
    if (b <= m) b = m + 0.5;
    if (m <= e) m = e + 0.5;
    return [t, s, b, m, e];
  };

  const [ts, ss, bs, ms, es] = enforceHierarchy(titleSize, subSize, bodySizeClamped, metaSize, extraSize);

  return {
    title: ts,
    subtitle: ss,
    badge: ms,
    description: bs,
    extra: es,

    // Aliases de compatibilidad
    recordTitle: ts,
    recordSubtitle: ss,
    recordBody: bs,
    recordMeta: ms,
    recordExtra: es,
    lineHeightBody: lh
  };
}
