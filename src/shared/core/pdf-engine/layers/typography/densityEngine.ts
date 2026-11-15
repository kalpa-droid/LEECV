/**
 * CAPA TIPOGRÁFICA — MOTOR DE DENSIDAD (densityEngine.ts)
 * 
 * Factor centralizado para ajustar el aire vertical según densityMode.
 * Usado por SectionBannerCard, recordSpatialLayoutEngine, cvRecordRenderers (quote-text).
 */

export type DensityMode = 'compact' | 'normal' | 'relaxed';

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

const DENSITY_FACTORS: Record<DensityMode, DensityFactors> = {
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

export function resolveDensityFactors(mode: DensityMode = 'normal'): DensityFactors {
  return DENSITY_FACTORS[mode] || DENSITY_FACTORS.normal;
}

/**
 * Aplica los overrides de tipografía al scale base del preset.
 * Devuelve un nuevo TypographyScale con los ajustes aplicados.
 */
import { TypographyScale, TypographyOverrides } from '../presets/presetSchema';

const CONTRAST_FACTORS = {
  suave: 1.12,      // title/sectionHeading/itemTitle ≈ 1.12x body
  equilibrada: 1.20,
  marcada: 1.28,
} as const;

const SECTION_HEADING_FACTORS = {
  chico: 0.85,
  normal: 1.0,
  destacado: 1.15,
} as const;

const SUMMARY_FACTORS = {
  compacto: 0.90,
  'igual-texto': 1.0,
  destacado: 1.15,
} as const;

export function applyTypographyOverrides(
  base: TypographyScale,
  overrides: TypographyOverrides
): TypographyScale {
  const result: TypographyScale = { ...base };

  // 1. bodyPt override directo
  if (overrides.bodyPt && Number.isFinite(overrides.bodyPt)) {
    result.body = Math.max(8.0, Math.min(14.0, overrides.bodyPt));
  }

  // 2. contrastScheme — escala title, sectionHeading, itemTitle proporcional al body
  if (overrides.contrastScheme) {
    const factor = CONTRAST_FACTORS[overrides.contrastScheme];
    result.title = Math.round(result.body * factor * 2.2); // title ≈ 2.2x body
    result.sectionHeading = Math.round(result.body * factor * 1.3);
    result.itemTitle = Math.round(result.body * factor * 1.1);
  }

  // 3. sectionHeadingScale — ajuste específico del banner de sección
  if (overrides.sectionHeadingScale) {
    const factor = SECTION_HEADING_FACTORS[overrides.sectionHeadingScale];
    result.sectionHeading = Math.round(result.sectionHeading * factor);
  }

  // 4. summaryScale — aplica solo al quote-text vía summaryScaleFactor en el scale resultante
  if (overrides.summaryScale) {
    result.summaryScaleFactor = SUMMARY_FACTORS[overrides.summaryScale];
  } else {
    // Reset limpio cuando se borra la override
    delete result.summaryScaleFactor;
  }

  return result;
}