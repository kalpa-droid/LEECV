import { describe, it, expect } from 'vitest';
import { resolveDocumentCanvasPx } from '../src/shared/core/pdf-engine/layers/page/pageSizes';
import { calculateFitScale, calculateCenteredScroll } from '../src/shared/core/viewport/viewportCalculations';

describe('viewportEngine — Nucleo de Calculos Fisicos y Viewport', () => {
  describe('resolveDocumentCanvasPx', () => {
    it('convierte A4 a pixeles CSS a 96 DPI correctamente', () => {
      const dimensions = resolveDocumentCanvasPx('a4');
      expect(dimensions.widthPx).toBe(794);
      expect(dimensions.heightPx).toBe(1123);
    });

    it('convierte A5 a pixeles CSS a 96 DPI correctamente', () => {
      const dimensions = resolveDocumentCanvasPx('a5');
      expect(dimensions.widthPx).toBe(559);
      expect(dimensions.heightPx).toBe(794);
    });

    it('convierte Tarjeta Estandar AR/US a pixeles CSS a 96 DPI correctamente', () => {
      const dimensions = resolveDocumentCanvasPx('tarjeta_estandar');
      expect(dimensions.widthPx).toBe(336);
      expect(dimensions.heightPx).toBe(193);
    });

    it('retorna A4 por defecto si el pageSizeId es desconocido', () => {
      const dimensions = resolveDocumentCanvasPx('invalido_xyz');
      expect(dimensions.widthPx).toBe(794);
      expect(dimensions.heightPx).toBe(1123);
    });
  });

  describe('calculateFitScale', () => {
    it('retorna null si el ancho del contenedor es 0 o invalido (señal de no medir todavia)', () => {
      expect(calculateFitScale(0, 640, 794, 1123)).toBeNull();
      expect(calculateFitScale(-10, 640, 794, 1123)).toBeNull();
    });

    it('aplica padding adaptativo por defecto en movil (12px para containerWidth < 768)', () => {
      const scale = calculateFitScale(360, 640, 794, 1123);
      // (360 - 12) / 794 = 348 / 794 = 0.438 -> 0.44
      expect(scale).toBeCloseTo(0.44, 2);
    });

    it('aplica padding adaptativo por defecto en desktop (32px para containerWidth >= 768)', () => {
      const scale = calculateFitScale(1024, 768, 794, 1123);
      // (1024 - 32) / 794 = 992 / 794 = 1.249 -> 1.25
      expect(scale).toBeCloseTo(1.25, 2);
    });

    it('calcula escala de ajuste optima con padding explicito', () => {
      const scale = calculateFitScale(360, 640, 794, 1123, { safetyPaddingPx: 32 });
      // (360 - 32) / 794 = 328 / 794 = 0.413 -> 0.41
      expect(scale).toBeCloseTo(0.41, 2);
    });

    it('respeta minScale y maxScale', () => {
      const minScale = calculateFitScale(50, 50, 794, 1123, { minScale: 0.25 });
      expect(minScale).toBe(0.25);

      const maxScale = calculateFitScale(4000, 4000, 794, 1123, { maxScale: 1.5 });
      expect(maxScale).toBe(1.5);
    });
  });

  describe('calculateCenteredScroll', () => {
    it('calcula scrollLeft centrado y scrollTop en 0 si el lienzo excede el contenedor', () => {
      const scroll = calculateCenteredScroll(500, 500, 1000, 1000);
      expect(scroll.scrollLeft).toBe(250);
      expect(scroll.scrollTop).toBe(0);
    });

    it('retorna 0 si el lienzo es menor o igual al contenedor', () => {
      const scroll = calculateCenteredScroll(1000, 1000, 500, 500);
      expect(scroll.scrollLeft).toBe(0);
      expect(scroll.scrollTop).toBe(0);
    });
  });
});
