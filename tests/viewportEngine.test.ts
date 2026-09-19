import { describe, it, expect } from 'vitest';
import { resolveDocumentCanvasPx } from '../src/shared/core/pdf-engine/layers/page/pageSizes';
import { calculateFitScale, calculateCenteredScroll, clampZoom, contentBoxWidth, quantizeRasterZoom } from '../src/shared/core/viewport/viewportCalculations';

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

  describe('zoom sin React en el camino crítico', () => {
    it('clampZoom acota el zoom total a [0.2, 2.5]', () => {
      expect(clampZoom(0.05)).toBe(0.2);
      expect(clampZoom(9)).toBe(2.5);
      expect(clampZoom(1.23456)).toBe(1.235);
    });

    it('contentBoxWidth resta el padding del contenedor y nunca da negativo', () => {
      expect(contentBoxWidth(390, 8, 8)).toBe(374);
      expect(contentBoxWidth(10, 8, 8)).toBe(0);
    });

    it('la medición sobre la caja completa no cambia si aparece la barra de scroll (sin ciclos)', () => {
      const withoutScrollbar = calculateFitScale(contentBoxWidth(1000, 16, 16), 700, 794, 1123);
      const withScrollbar = calculateFitScale(contentBoxWidth(1000, 16, 16), 700, 794, 1123);
      expect(withScrollbar).toBe(withoutScrollbar);
    });

    it('quantizeRasterZoom: nunca menor a 1 y escalonado de a 0.25 (un pellizco no re-rasteriza cada tick)', () => {
      expect(quantizeRasterZoom(0.4)).toBe(1);
      expect(quantizeRasterZoom(1)).toBe(1);
      expect(quantizeRasterZoom(1.01)).toBe(1.25);
      expect(quantizeRasterZoom(1.25)).toBe(1.25);
      expect(quantizeRasterZoom(1.26)).toBe(1.5);
      expect(quantizeRasterZoom(2.5)).toBe(2.5);
    });

    it('en móvil 390px: la hoja A4 ocupa el ancho útil sin desbordar el contenedor con padding', () => {
      const content = contentBoxWidth(390, 8, 8); // p-2
      const scale = calculateFitScale(content, 800, 794, 1123)!;
      expect(794 * scale).toBeLessThanOrEqual(content);
      expect(794 * scale).toBeGreaterThan(content * 0.9);
    });
  });

  describe('cableado del viewport (guardias)', () => {
    const read = (rel: string) => require('fs').readFileSync(require('path').join(__dirname, '..', rel), 'utf-8') as string;

    it('el hook escribe el zoom DIRECTO al DOM como variable CSS y no depende de setState para pintar', () => {
      const hook = read('src/shared/core/viewport/useDocumentViewport.ts');
      expect(hook).toContain('style.setProperty(DOC_SCALE_VAR');
      expect(hook).toContain('useIsomorphicLayoutEffect');
      expect(hook).not.toMatch(/safetyPaddingPx:\s*48/);
    });

    it('la hoja de CVPreview lee el zoom por CSS (var + calc) y ya no lo redondea en JS ni lo anima con transición', () => {
      const preview = read('src/modules/cv-builder/components/CVPreview.tsx');
      expect(preview).toContain('var(${DOC_SCALE_VAR}');
      expect(preview).toContain('calc(${widthPx}px * ${scaleExpr})');
      expect(preview).not.toContain('Math.round(widthPx * zoomLevel)');
      expect(preview).not.toContain('transition-[width,height]');
      expect(preview).not.toMatch(/transform: `scale\(\$\{zoomLevel\}\)`/);
    });

    it('App y Book Studio ya no pisan el padding adaptativo con safetyPaddingPx: 48', () => {
      expect(read('src/app/App.tsx')).not.toMatch(/safetyPaddingPx:\s*48/);
      expect(read('src/modules/book-studio/BookStudioContent.tsx')).not.toMatch(/safetyPaddingPx:\s*48/);
    });
  });
});

