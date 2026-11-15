/**
 * CAPA TIPOGRÁFICA — MOTOR DE DENSIDAD (densityEngine.ts)
 *
 * Factor centralizado para ajustar el aire vertical según densityMode.
 * Usado por SectionBannerCard, recordSpatialLayoutEngine, cvRecordRenderers (quote-text).
 *
 * densityMode acepta:
 * - Enum legado: 'compact' | 'normal' | 'relaxed' (anclas históricas del sistema).
 * - Número continuo 0.50–1.35 (tirador en Diseño): interpola linealmente
 *   entre los dos anclas que lo rodean (0.50=compacto, 1.00=normal, 1.35=amplio).
 */

import { ContrastSchemeValue, DensityMode, SectionHeadingScaleValue, SummaryScaleValue, TypographyScale, TypographyOverrides } from '../presets/presetSchema';

export interface DensityFactors {
  /** Factor para marginTop/marginBottom de banners de sección (SectionBannerCard) */
  sectionBannerMarginFactor: number;
  /** Factor para paddingVertical de tarjetas de registro */
  recordCardPaddingFactor: number;
  /** Factor para paddingVertical/marginBottom de quote-text */
  quoteTextPaddingFactor: number;
  /** Factor para lineHeightBody global (sobre lineHeightBody base) */
  lineHeightFactor: number;
}

export const DENSITY_FACTORS: Record<DensityMode, DensityFactors> = {
  compact: {
    sectionBannerMarginFactor: 0.5,   // 16→8, 8→4
    recordCardPaddingFactor: 0.625,   // 8→5
    quoteTextPaddingFactor: 0.55,     // 8→4.4, 10→5.5
    lineHeightFactor: 0.95,
  },
  normal: {
    sectionBannerMarginFactor: 1.0,
    recordCardPaddingFactor: 1.0,
    quoteTextPaddingFactor: 1.0,
    lineHeightFactor: 1.0,
  },
  relaxed: {
    sectionBannerMarginFactor: 1.35,  // 16→21.6, 8→10.8
    recordCardPaddingFactor: 1.25,    // 8→10
    quoteTextPaddingFactor: 1.3,      // 8→10.4, 10→13
    lineHeightFactor: 1.05,
  },
};

const DENSITY_MIN = 0.5;
const DENSITY_MAX = 1.35;
// Anclas ordenadas de menor a mayor densidad inversa (compacto → normal → amplio)
const DENSITY_ANCHORS: ReadonlyArray<readonly [number, DensityFactors]> = [
  [DENSITY_MIN, DENSITY_FACTORS.compact],
  [1.0, DENSITY_FACTORS.normal],
  [DENSITY_MAX, DENSITY_FACTORS.relaxed],
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpFactors(from: DensityFactors, to: DensityFactors, t: number): DensityFactors {
  return {
    sectionBannerMarginFactor: lerp(from.sectionBannerMarginFactor, to.sectionBannerMarginFactor, t),
    recordCardPaddingFactor: lerp(from.recordCardPaddingFactor, to.recordCardPaddingFactor, t),
    quoteTextPaddingFactor: lerp(from.quoteTextPaddingFactor, to.quoteTextPaddingFactor, t),
    lineHeightFactor: lerp(from.lineHeightFactor, to.lineHeightFactor, t),
  };
}

function densityFactorsAt(value: number): DensityFactors {
  const clamped = Math.min(DENSITY_MAX, Math.max(DENSITY_MIN, value));
  if (clamped <= 1.0) {
    const t = (clamped - DENSITY_MIN) / (1.0 - DENSITY_MIN);
    return lerpFactors(DENSITY_FACTORS.compact, DENSITY_FACTORS.normal, t);
  }
  const t = (clamped - 1.0) / (DENSITY_MAX - 1.0);
  return lerpFactors(DENSITY_FACTORS.normal, DENSITY_FACTORS.relaxed, t);
}

export function resolveDensityFactors(mode: DensityMode | number = 'normal'): DensityFactors {
  if (typeof mode === 'number' && Number.isFinite(mode)) {
    return densityFactorsAt(mode);
  }
  return DENSITY_FACTORS[mode as DensityMode] || DENSITY_FACTORS.normal;
}

/**
 * Aplica los overrides de tipografía al scale base del preset.
 * Devuelve un nuevo TypographyScale con los ajustes aplicados.
 *
 * Compatibilidad retroactiva: los valores enum históricos se resuelven
 * a los mismos factores de siempre; los valores numéricos (tirador)
 * se aplican tal cual, acotados a rangos seguros.
 */

export const CONTRAST_FACTORS: Record<ContrastSchemeValue, number> = {
  suave: 1.12,      // title/sectionHeading/itemTitle ≈ 1.12x body
  equilibrada: 1.20,
  marcada: 1.28,
} as const;

export const SECTION_HEADING_FACTORS: Record<SectionHeadingScaleValue, number> = {
  chico: 0.85,
  normal: 1.0,
  destacado: 1.15,
} as const;

export const SUMMARY_FACTORS: Record<SummaryScaleValue, number> = {
  compacto: 0.90,
  'igual-texto': 1.0,
  destacado: 1.15,
} as const;

/** Redondeo a 0.5 pt (resolución del tirador "Tamaño de lectura"). */
const roundHalf = (v: number): number => Math.round(v * 2) / 2;

const clampNum = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

const clamp2 = (v: number): number => Number(v.toFixed(2));

/**
 * Resuelve un factor que puede venir como enum (tabla) o número continuo.
 * Los números se acotan a [min, max]; los enums caen al fallback si son desconocidos.
 */
function resolveFactor(
  value: ContrastSchemeValue | SectionHeadingScaleValue | SummaryScaleValue | number,
  table: Record<string, number>,
  min: number,
  max: number,
  fallback: number
): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? clampNum(value, min, max) : fallback;
  }
  return table[value] ?? fallback;
}

export function applyTypographyOverrides(
  base: TypographyScale,
  overrides: TypographyOverrides
): TypographyScale {
  const result: TypographyScale = { ...base };

  // 1. bodyPt override directo
  if (overrides.bodyPt && Number.isFinite(overrides.bodyPt)) {
    result.body = clampNum(overrides.bodyPt, 8.0, 14.0);
  }

  // 2. contrastScheme — escala title, sectionHeading, itemTitle proporcional al body (0.5 pt)
  if (overrides.contrastScheme !== undefined) {
    const factor = resolveFactor(overrides.contrastScheme, CONTRAST_FACTORS, 1.05, 1.35, 1.20);
    result.title = roundHalf(result.body * factor * 2.2); // title ≈ 2.2x body
    result.sectionHeading = roundHalf(result.body * factor * 1.3);
    result.itemTitle = roundHalf(result.body * factor * 1.1);
  }

  // 3. sectionHeadingScale — ajuste específico del banner de sección (0.5 pt)
  if (overrides.sectionHeadingScale !== undefined) {
    const factor = resolveFactor(overrides.sectionHeadingScale, SECTION_HEADING_FACTORS, 0.5, 1.5, 1.0);
    result.sectionHeading = roundHalf(result.sectionHeading * factor);
  }

  // 4. summaryScale — aplica solo al quote-text vía summaryScaleFactor en el scale resultante
  if (overrides.summaryScale !== undefined) {
    result.summaryScaleFactor = resolveFactor(overrides.summaryScale, SUMMARY_FACTORS, 0.5, 1.5, 1.0);
  } else {
    // Reset limpio cuando se borra la override
    delete result.summaryScaleFactor;
  }

  // 5. densityMode — escala el interlineado global (lineHeightBody); márgenes y paddings
  //    de banners/tarjetas/quote-text se escalan en sus consumidores vía resolveDensityFactors().
  if (overrides.densityMode !== undefined) {
    const density = resolveDensityFactors(overrides.densityMode);
    result.lineHeightBody = clamp2((base.lineHeightBody || 1.3) * density.lineHeightFactor);
  }

  return result;
}
