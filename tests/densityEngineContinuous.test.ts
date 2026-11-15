/**
 * Invariante del motor de densidad continua (V2.14.0).
 *
 * densityMode acepta enum legado ('compact' | 'normal' | 'relaxed') o número
 * continuo 0.50–1.35. Los valores numéricos interpolan linealmente entre las
 * anclas del motor; los enums históricos siguen resolviendo igual que siempre
 * (retrocompatibilidad con borradores guardados).
 */
import { describe, it, expect } from 'vitest';
import {
  DENSITY_FACTORS,
  resolveDensityFactors,
  applyTypographyOverrides,
} from '../src/shared/core/pdf-engine/layers/typography/densityEngine';
import { resolveActivePreset } from '../src/shared/core/pdf-engine/layers/presets/presetRegistry';
import type { TypographyScale } from '../src/shared/core/pdf-engine/layers/presets/presetSchema';

const baseScale: TypographyScale = {
  title: 21,
  sectionHeading: 13,
  itemTitle: 11,
  body: 9.5,
  caption: 8,
  fontFamily: 'Helvetica',
  lineHeightBody: 1.3,
  lineHeightHeading: 1.2,
};

describe('resolveDensityFactors — interpolación continua', () => {
  it('ancla compacta (enum legado) respeta factores históricos', () => {
    expect(resolveDensityFactors('compact')).toEqual(DENSITY_FACTORS.compact);
    expect(DENSITY_FACTORS.compact.recordCardPaddingFactor).toBe(0.625);
    expect(DENSITY_FACTORS.compact.lineHeightFactor).toBe(0.95);
  });

  it('ancla normal y relajada caen en sus tablas', () => {
    expect(resolveDensityFactors('normal')).toEqual(DENSITY_FACTORS.normal);
    expect(resolveDensityFactors('relaxed')).toEqual(DENSITY_FACTORS.relaxed);
  });

  it('0.75 interpola exactamente a mitad de camino entre compact y normal', () => {
    const f = resolveDensityFactors(0.75);
    expect(f.recordCardPaddingFactor).toBeCloseTo(0.8125, 5); // 0.625 → 1.0 al 50%
    expect(f.lineHeightFactor).toBeCloseTo(0.975, 5); // 0.95 → 1.0 al 50%
    expect(f.sectionBannerMarginFactor).toBeCloseTo(0.75, 5);
    expect(f.quoteTextPaddingFactor).toBeCloseTo(0.775, 5);
  });

  it('1.2 cae del lado relajado (entre normal y relaxed)', () => {
    const f = resolveDensityFactors(1.2);
    expect(f.recordCardPaddingFactor).toBeGreaterThan(1.0);
    expect(f.recordCardPaddingFactor).toBeLessThan(1.25);
    expect(f.lineHeightFactor).toBeGreaterThan(1.0);
    expect(f.lineHeightFactor).toBeLessThan(1.05);
  });

  it('clampa fuera de rango y enum desconocido cae a normal', () => {
    expect(resolveDensityFactors(99).recordCardPaddingFactor).toBe(1.25); // relajado
    expect(resolveDensityFactors(-1).recordCardPaddingFactor).toBe(0.625); // compacto
    expect(resolveDensityFactors('weird' as any)).toEqual(DENSITY_FACTORS.normal);
  });
});

describe('applyTypographyOverrides — overrides numéricos y enums', () => {
  it('densityMode numérico 0.75 escala lineHeightBody por el factor interpolado', () => {
    const out = applyTypographyOverrides(baseScale, { densityMode: 0.75 });
    expect(out.lineHeightBody).toBe(1.27); // 1.3 * 0.975, redondeado a 2 decimales por el motor
    expect(out.lineHeightBody).toBeLessThan(baseScale.lineHeightBody!);
  });

  it('densityMode enum legado compact escala igual que siempre (retrocompat)', () => {
    const out = applyTypographyOverrides(baseScale, { densityMode: 'compact' });
    expect(out.lineHeightBody).toBe(1.23); // 1.3 * 0.95, redondeado a 2 decimales por el motor
  });

  it('bodyPt 8.5 + contraste 1.15 → title redondeado a 0.5 pt', () => {
    const out = applyTypographyOverrides(baseScale, { bodyPt: 8.5, contrastScheme: 1.15 });
    expect(out.body).toBe(8.5);
    expect(out.title).toBe(Math.round(8.5 * 1.15 * 2.2 * 2) / 2); // 21.5
    expect(out.title % 0.5).toBe(0);
  });

  it('summaryScale numérico 0.85 se refleja en summaryScaleFactor', () => {
    const out = applyTypographyOverrides(baseScale, { summaryScale: 0.85 });
    expect(out.summaryScaleFactor).toBe(0.85);
  });

  it('sectionHeadingScale numérico 0.75 encoge el banner tras el contraste', () => {
    const out = applyTypographyOverrides(baseScale, { contrastScheme: 1.15, sectionHeadingScale: 0.75 });
    expect(out.sectionHeading).toBe(Math.round(Math.round(9.5 * 1.15 * 1.3 * 2) / 2 * 0.75 * 2) / 2);
  });

  it('sin overrides de summaryScale no deja summaryScaleFactor residual', () => {
    const out = applyTypographyOverrides(baseScale, {});
    expect(out.summaryScaleFactor).toBeUndefined();
  });
});

describe('resolveActivePreset — refleja densityMode numérico en el preset resuelto', () => {
  it('expone densityMode 0.75 y el lineHeightBody escalado', () => {
    const preset = resolveActivePreset({
      activePresetId: 'cv-clasico',
      typographyOverrides: { densityMode: 0.75 },
    } as any);
    expect(preset.densityMode).toBe(0.75);
    const baseLh = (resolveActivePreset({ activePresetId: 'cv-clasico' } as any).typography.lineHeightBody || 1.3) as number;
    expect(preset.typography.lineHeightBody).toBeCloseTo(Number((baseLh * 0.975).toFixed(2)), 2);
  });

  it('sin overrides mantiene densityMode normal', () => {
    const preset = resolveActivePreset({ activePresetId: 'cv-clasico' } as any);
    expect(preset.densityMode).toBe('normal');
  });
});
