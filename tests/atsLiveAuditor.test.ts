// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAtsLiveScore } from '../src/shared/core/ats/useAtsLiveScore';
import { CVData } from '../src/types/cv';

const buildCv = (overrides: any = {}) => ({
  id: 'test-live-score',
  title: 'CV de Prueba',
  personalInfo: { name: 'Juan Pérez', email: 'juan@example.com', phone: '5551234567' },
  experience: [],
  education: [],
  skills: [],
  summary: '',
  layout: { sectionOrder: [] },
  ...overrides,
}) as unknown as CVData;

const baseCv = buildCv({ personalInfo: {}, experience: [], education: [] });
const completeCv = buildCv({
  personalInfo: { name: 'Juan Pérez', email: 'juan@example.com', phone: '5551234567', dni: '30.000.000' },
  experience: [
    { periodStart: '2021', periodEnd: '', company: 'ACME', title: 'Analista de Procesos', description: 'Reduje 20% los costos operativos.' },
  ],
  education: [{ degree: 'Licenciatura', field: 'Ingeniería Industrial', periodStart: '2015' }],
  skills: ['Excel', 'Power BI'],
  summary: 'Tengo experiencia en análisis de datos.',
  layout: { sectionOrder: ['experiencia', 'formacion'] },
});

describe('useAtsLiveScore', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('devuelve el fallback seguro cuando no hay datos de CV', () => {
    const { result } = renderHook(() => useAtsLiveScore(undefined));
    expect(result.current.score).toBe(80);
    expect(result.current.warnings).toEqual([]);
    expect(result.current.levels).toEqual({ criticalCount: 0, warningCount: 0, infoCount: 0 });
    expect(result.current.linearReadingOrder).toEqual([]);
  });

  it('detecta que faltan datos de contacto y avisa con severidad critica', () => {
    const { result } = renderHook(() => useAtsLiveScore(baseCv));
    expect(result.current.score).toBeLessThan(80);
    expect(result.current.warnings.some(w => w.id === 'missing_contact')).toBe(true);
    expect(result.current.warnings.some(w => w.level === 'critical')).toBe(true);
    expect(result.current.levels.criticalCount).toBeGreaterThanOrEqual(1);
  });

  it('recalcula el score cuando cvData cambia (detección reactiva)', () => {
    const { result, rerender } = renderHook(({ cv }: { cv: CVData | undefined }) => useAtsLiveScore(cv), {
      initialProps: { cv: baseCv } as { cv: CVData | undefined },
    });

    const baseScore = result.current.score;
    expect(baseScore).toBeLessThan(80);

    rerender({ cv: completeCv });
    const healthyScore = result.current.score;

    expect(healthyScore).toBeGreaterThan(baseScore);
    expect(healthyScore).toBeGreaterThanOrEqual(90);
    expect(healthyScore).toBeLessThanOrEqual(100);
  });

  it('expone linearReadingOrder y niveles agregados de advertencias', () => {
    const { result } = renderHook(() => useAtsLiveScore(baseCv));
    const levels = result.current.levels;
    expect(levels.criticalCount + levels.warningCount + levels.infoCount).toBe(result.current.warnings.length);
    expect(Array.isArray(result.current.linearReadingOrder)).toBe(true);
    expect(result.current.linearReadingOrder.length).toBeGreaterThan(0);
  });

  it('resultados completos no generan warnings críticos de contacto', () => {
    const { result } = renderHook(() => useAtsLiveScore(completeCv));
    const contactWarnings = result.current.warnings.filter(w => w.id === 'missing_contact');
    expect(contactWarnings).toEqual([]);
    expect(result.current.levels.criticalCount).toBe(0);
  });
});
