import { describe, expect, it } from 'vitest';
import { getPageSize, PAGE_SIZES } from '../src/shared/core/pdf-engine/layers/page/pageSizes';
import {
  BOOK_PAPER_SPECS,
  BOOK_PRINT_PROFILES,
  applyBookPrintProfile,
  clearBookFieldManual,
  detectBookPrintTargetConflicts,
  inferBookPrintTarget,
  markBookFieldManual,
  resolveBookPaperSpec,
} from '../src/modules/book-studio/domain/bookPrintProfileEngine';

describe('Libro/Folleto — Perfil Global En casa vs Imprenta y Papel', () => {
  it('registra los formatos SRA3, A3+ y A2 junto con A4, Carta, Oficio, Legal y A3 en PAGE_SIZES', () => {
    for (const key of ['a4', 'carta', 'oficio', 'legal', 'a3', 'sra3', 'a3_plus', 'a2']) {
      const size = PAGE_SIZES[key];
      expect(size).toBeDefined();
      expect(size.widthMm).toBeGreaterThan(0);
      expect(size.heightMm).toBeGreaterThan(size.widthMm);
      expect(size.widthPt).toBeGreaterThan(0);
      expect(size.heightPt).toBeGreaterThan(size.widthPt);
    }
    expect(getPageSize('sra3').widthMm).toBe(320);
    expect(getPageSize('sra3').heightMm).toBe(450);
    expect(getPageSize('a3_plus').widthMm).toBe(329);
    expect(getPageSize('a2').widthMm).toBe(420);
  });

  it('separa formatos caseros (hasta A3) vs formatos de imprenta (A3 en adelante)', () => {
    expect(BOOK_PRINT_PROFILES.home.allowedPaperSizes).toEqual(['A4', 'CARTA', 'OFICIO', 'LEGAL', 'A3']);
    expect(BOOK_PRINT_PROFILES.print_shop.allowedPaperSizes).toEqual(['A3', 'SRA3', 'A3_PLUS', 'A2']);
    expect(BOOK_PRINT_PROFILES.home.defaults.unprintableMarginMm).toBe(5);
    expect(BOOK_PRINT_PROFILES.print_shop.defaults.unprintableMarginMm).toBe(0);
    expect(BOOK_PRINT_PROFILES.print_shop.defaults.destination).toBe('C');
  });

  it('mantiene las dimensiones de canvas heredadas para A4 y A3 y escala los formatos nuevos', () => {
    expect(resolveBookPaperSpec('A4').coverCanvasWidth).toBe(1748);
    expect(resolveBookPaperSpec('A4').coverCanvasHeight).toBe(2480);
    expect(resolveBookPaperSpec('A3').coverCanvasWidth).toBe(2480);
    expect(resolveBookPaperSpec('A3').coverCanvasHeight).toBe(3508);

    for (const id of Object.keys(BOOK_PAPER_SPECS)) {
      const spec = resolveBookPaperSpec(id);
      expect(spec.coverCanvasWidth).toBeGreaterThan(1000);
      expect(spec.coverCanvasHeight).toBeLessThanOrEqual(3800);
    }
  });

  it('infiere automáticamente Imprenta para pliegos SRA3/A3+/A2 o destino C al borde', () => {
    expect(inferBookPrintTarget({ paperSize: 'A4' })).toBe('home');
    expect(inferBookPrintTarget({ paperSize: 'OFICIO' })).toBe('home');
    expect(inferBookPrintTarget({ paperSize: 'SRA3' })).toBe('print_shop');
    expect(inferBookPrintTarget({ paperSize: 'A3_PLUS' })).toBe('print_shop');
    expect(inferBookPrintTarget({ paperSize: 'A2' })).toBe('print_shop');
    expect(inferBookPrintTarget({ paperSize: 'A3', destination: 'C', unprintableMarginMm: 0 })).toBe('print_shop');
  });

  it('detecta conflictos manuales al pasar de Casa a Imprenta y permite conservar o sobrescribir', () => {
    const start = {
      printTarget: 'home' as const,
      paperSize: 'LEGAL' as const,
      destination: 'A' as const,
      unprintableMarginMm: 5,
      showGuides: false,
      applyCreep: true,
      paperThicknessMm: 0.1,
      manualOverrides: {},
    };
    const customized = markBookFieldManual(start, 'paperSize');

    const conflicts = detectBookPrintTargetConflicts(customized, 'print_shop');
    expect(conflicts.map((c) => c.fieldKey)).toEqual(['paperSize']);

    const preserved = applyBookPrintProfile(customized, 'print_shop', 'preserve-manual');
    expect(preserved.printTarget).toBe('print_shop');
    expect(preserved.paperSize).toBe('LEGAL');
    expect(preserved.destination).toBe('C');
    expect(preserved.unprintableMarginMm).toBe(0);
    expect(preserved.showGuides).toBe(true);

    const resetPaper = clearBookFieldManual(preserved, 'paperSize');
    expect(resetPaper.paperSize).toBe('SRA3');
    expect(resetPaper.manualOverrides?.paperSize).toBeUndefined();

    const fullApplied = applyBookPrintProfile(customized, 'print_shop', 'apply-all');
    expect(fullApplied.paperSize).toBe('SRA3');
    expect(fullApplied.manualOverrides?.paperSize).toBeUndefined();
  });
});
