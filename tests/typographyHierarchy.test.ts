/**
 * Invariante estricto de jerarquía tipográfica y densityMode.
 *
 * Precondición: deriveRecordScale(base) respeta SIEMPRE la cadena
 * extra <= meta <= body <= subtitle < itemTitle <= sectionHeading <= title
 * y respeta el piso de 8.0 pt para cuerpos compactos.
 */
import { describe, it, expect } from 'vitest';
import {
  deriveRecordScale,
} from '../src/shared/core/pdf-engine/layers/typography/typographyHierarchyEngine';
import { applyTypographyOverrides } from '../src/shared/core/pdf-engine/layers/typography/densityEngine';
import { resolveActivePreset } from '../src/shared/core/pdf-engine/layers/presets/presetRegistry';
import { PRESET_TYPOGRAPHY } from '../src/shared/core/pdf-engine/layers/presets/presetCompositionInstances';

function checkInvariant(base: { body: number; itemTitle: number }, ratio?: { subtitle?: number; meta?: number; extra?: number }) {
  const scale = deriveRecordScale({ body: base.body, itemTitle: base.itemTitle, lineHeightBody: 1.3 } as any, ratio);
  expect(scale.extra).toBeLessThanOrEqual(scale.badge); // badge = meta
  expect(scale.badge).toBeLessThanOrEqual(scale.description); // description = body
  expect(scale.description).toBeLessThan(scale.subtitle);
  expect(scale.subtitle).toBeLessThan(scale.title); // itemTitle
}

describe('Typografía — invariante de jerarquía (extra ≤ meta ≤ body < subtitle < itemTitle)', () => {
  it('clasica (body=10, itemTitle=11.5) cumple la cadena', () => {
    checkInvariant({ body: 10, itemTitle: 11.5 }, PRESET_TYPOGRAPHY.clasica.typography.recordScaleRatios);
  });

  it('moderna (body=9, itemTitle=10.5) cumple la cadena', () => {
    checkInvariant({ body: 9, itemTitle: 10.5 }, PRESET_TYPOGRAPHY.moderna.typography.recordScaleRatios);
  });

  it('editorial (body=9.5, itemTitle=11) cumple la cadena', () => {
    checkInvariant({ body: 9.5, itemTitle: 11 }, PRESET_TYPOGRAPHY.editorial.typography.recordScaleRatios);
  });

  it('condensada (body=8.5, itemTitle=10) permite el piso de 8.0 pt', () => {
    const scale = deriveRecordScale({ body: 8.5, itemTitle: 10, lineHeightBody: 1.2 } as any, PRESET_TYPOGRAPHY.condensada.typography.recordScaleRatios);
    // El antiguo piso 10.0 pt comprimía todo a 10 pt; ahora body llega a 8.5 pt
    expect(scale.description).toBeLessThanOrEqual(9);
    expect(scale.description).toBeGreaterThanOrEqual(8);
    checkInvariant({ body: 8.5, itemTitle: 10 }, PRESET_TYPOGRAPHY.condensada.typography.recordScaleRatios);
  });

  it('blindaje: un preset con ratios > 2 (pt confundidos con ratios) no explota la multiplicación', () => {
    const scale = deriveRecordScale({ body: 10, itemTitle: 11, lineHeightBody: 1.3 } as any, { subtitle: 9, meta: 8, extra: 8 });
    expect(scale.subtitle).toBeLessThanOrEqual(16);
    expect(scale.badge).toBeLessThanOrEqual(12);
    expect(scale.extra).toBeLessThanOrEqual(11);
  });
});

describe('Typografía — overrides (bodyPt / densityMode)', () => {
  it('bodyPt=8.5 comprime el cuerpo a ~8.5 pt sin romper la cadena', () => {
    // TypographyScale real (como la que genera generateHarmoniousTypographyScale)
    const base = {
      title: 24,
      sectionHeading: 14,
      itemTitle: 11.5,
      body: 10,
      caption: 8.5,
      fontFamily: 'Helvetica',
      lineHeightBody: 1.4,
      lineHeightHeading: 1.25,
      recordScaleRatios: { subtitle: 1.05, meta: 0.90, extra: 0.88 }
    } as any;
    const overrideScale = applyTypographyOverrides(base, { bodyPt: 8.5 });
    expect(overrideScale.body).toBe(8.5);
    expect(overrideScale.itemTitle).toBeGreaterThanOrEqual(overrideScale.body);
    expect(overrideScale.sectionHeading).toBeGreaterThanOrEqual(overrideScale.itemTitle);
    expect(overrideScale.title).toBeGreaterThanOrEqual(overrideScale.sectionHeading);
  });

  it('resolveActivePreset: typographyOverrides.bodyPt persiste al documento final', () => {
    const cv = {
      activePresetId: 'cv-clasico',
      typographyOverrides: { bodyPt: 8.5 },
    };
    const resolved = resolveActivePreset(cv);
    expect(resolved.typography.body).toBe(8.5);
    expect(resolved.densityMode).toBe('normal');
  });

  it('resolveActivePreset: densityMode=compact se propaga al preset efectivo', () => {
    const cv = {
      activePresetId: 'cv-clasico',
      typographyOverrides: { densityMode: 'compact' },
    };
    const resolved = resolveActivePreset(cv);
    expect(resolved.densityMode).toBe('compact');
  });

  it('resolveActivePreset: typographyOverrides NO sobreescriben color/layout', () => {
    const cv = {
      activePresetId: 'cv-clasico',
      colorPresetId: 'sobrio',
      typographyOverrides: { bodyPt: 9.5, densityMode: 'relaxed' },
    };
    const resolved = resolveActivePreset(cv);
    expect(resolved.densityMode).toBe('relaxed');
    expect(resolved.typography.body).toBe(9.5);
    expect(resolved.palette).toBeDefined();
    expect(resolved.typography.fontFamily).toBeDefined();
  });
});
