import { describe, it, expect } from 'vitest';
import {
  padToMultiple,
  countBlanksForPadding,
  isBlankPageNumber,
  planBookletSignatures,
  getSignatureSheetPairs,
  getQuarterSheet,
  getOctavoSheet,
  cutAndStackPlan,
  calculateCreepOffset,
  calculateSpineWidth,
  checkHomePrinterMargins,
} from '../../src/shared/kits/print-imposition/impositionPlanner';

describe('padToMultiple / countBlanksForPadding', () => {
  it('rellena al múltiplo pedido', () => {
    expect(padToMultiple(10, 4)).toBe(12);
    expect(padToMultiple(16, 4)).toBe(16);
    expect(padToMultiple(5, 8)).toBe(8);
    expect(padToMultiple(17, 16)).toBe(32);
    expect(padToMultiple(0, 4)).toBe(0);
  });

  it('cuenta los blancos agregados', () => {
    expect(countBlanksForPadding(10, 4)).toBe(2);
    expect(countBlanksForPadding(16, 4)).toBe(0);
    expect(countBlanksForPadding(9, 8)).toBe(7);
    expect(countBlanksForPadding(0, 4)).toBe(0);
  });

  it('detecta páginas de relleno', () => {
    expect(isBlankPageNumber(21, 20)).toBe(true);
    expect(isBlankPageNumber(20, 20)).toBe(false);
  });
});

describe('planBookletSignatures', () => {
  it('single: un único cuadernillo con relleno a múltiplo de 4', () => {
    expect(planBookletSignatures(20, 'single')).toEqual({
      signatures: [20],
      totalPages: 20,
      blanksAdded: 0,
      totalSheets: 5,
    });
    expect(planBookletSignatures(17, 'single').signatures).toEqual([20]);
    expect(planBookletSignatures(17, 'single').blanksAdded).toBe(3);
  });

  it('multi-fixed: cuadernillos de tamaño fijo, el último más chico', () => {
    const plan = planBookletSignatures(20, 'multi-fixed', 4); // 16 págs por cuadernillo
    expect(plan.signatures).toEqual([16, 4]);
    expect(plan.totalSheets).toBe(5);
    expect(planBookletSignatures(64, 'multi-fixed', 4).signatures).toEqual([16, 16, 16, 16]);
  });

  it('multi-balanced: firma repartida, diferencia <= 4 páginas entre cuadernillos', () => {
    const plan = planBookletSignatures(20, 'multi-balanced', 4);
    expect(plan.signatures).toHaveLength(2);
    expect(Math.max(...plan.signatures) - Math.min(...plan.signatures)).toBeLessThanOrEqual(4);
    expect(plan.signatures.reduce((a, b) => a + b, 0)).toBe(20);
    // Todo múltiplo de 4
    for (const s of plan.signatures) expect(s % 4).toBe(0);
  });

  it('multi-balanced equilibra 36 páginas en 3 cuadernillos', () => {
    const plan = planBookletSignatures(36, 'multi-balanced', 4);
    expect(plan.signatures.reduce((a, b) => a + b, 0)).toBe(36);
    for (const s of plan.signatures) expect(s % 4).toBe(0);
  });

  it('lanza error con sheetsPerSignature inválido', () => {
    expect(() => planBookletSignatures(16, 'multi-fixed', 0)).toThrow();
  });
});

describe('Cuarto (doblez en cruz)', () => {
  it('pliego 1: matriz exacta de la especificación', () => {
    const sheet = getQuarterSheet(1);
    expect(sheet.front.map((c) => c.page)).toEqual([4, 5, 1, 8]);
    expect(sheet.front.map((c) => c.rotation)).toEqual([180, 180, 0, 0]);
    expect(sheet.back.map((c) => c.page)).toEqual([6, 3, 7, 2]);
    expect(sheet.back.map((c) => c.rotation)).toEqual([180, 180, 0, 0]);
    expect(sheet.front.map((c) => c.slot)).toEqual(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
  });

  it('múltiples pliegos: offset 8*(N-1)', () => {
    const sheet2 = getQuarterSheet(2);
    expect(sheet2.front.map((c) => c.page)).toEqual([12, 13, 9, 16]);
    expect(sheet2.back.map((c) => c.page)).toEqual([14, 11, 15, 10]);
  });
});

describe('Octavo (doblez en cruz)', () => {
  it('pliego 1: matriz exacta de la especificación', () => {
    const sheet = getOctavoSheet(1);
    expect(sheet.front.map((c) => c.page)).toEqual([5, 12, 9, 8, 4, 13, 16, 1]);
    expect(sheet.back.map((c) => c.page)).toEqual([7, 10, 11, 6, 2, 15, 14, 3]);
    expect(sheet.front.slice(0, 4).every((c) => c.rotation === 180)).toBe(true);
    expect(sheet.front.slice(4).every((c) => c.rotation === 0)).toBe(true);
    expect(sheet.back.slice(0, 4).every((c) => c.rotation === 180)).toBe(true);
    expect(sheet.back.slice(4).every((c) => c.rotation === 0)).toBe(true);
  });

  it('múltiples pliegos: offset 16*(N-1)', () => {
    const sheet2 = getOctavoSheet(2);
    expect(sheet2.front.map((c) => c.page)).toEqual([21, 28, 25, 24, 20, 29, 32, 17]);
    expect(sheet2.back.map((c) => c.page)).toEqual([23, 26, 27, 22, 18, 31, 30, 19]);
  });
});

describe('Cut-and-Stack', () => {
  it('simplex 8 páginas en grilla 2x2: ejemplo exacto de la especificación', () => {
    const plan = cutAndStackPlan(8, 4, 'simplex');
    expect(plan.paddedTotal).toBe(8);
    expect(plan.blanksAdded).toBe(0);
    expect(plan.sheets).toEqual([
      { front: [1, 3, 5, 7] },
      { front: [2, 4, 6, 8] },
    ]);
  });

  it('simplex con relleno al múltiplo de la grilla', () => {
    const plan = cutAndStackPlan(10, 4, 'simplex');
    expect(plan.paddedTotal).toBe(12);
    expect(plan.blanksAdded).toBe(2);
  });

  it('duplex borde largo: H = ceil(T/2G), dorso espejado horizontalmente', () => {
    const plan = cutAndStackPlan(16, 4, 'duplex-long-edge');
    expect(plan.sheets).toHaveLength(2);
    // Frente hoja 1: Pág 1,5,9,13
    expect(plan.sheets[0].front).toEqual([1, 5, 9, 13]);
    // Dorso hoja 1: el par de Pág 1 (Pág 2) queda arriba a la DERECHA (espejo horizontal)
    expect(plan.sheets[0].back).toEqual([14, 10, 6, 2]);
    expect(plan.sheets[1].front).toEqual([3, 7, 11, 15]);
    expect(plan.sheets[1].back).toEqual([16, 12, 8, 4]);
  });

  it('step-and-repeat simplex: cada hoja repite su página', () => {
    const plan = cutAndStackPlan(3, 4, 'step-and-repeat');
    expect(plan.sheets).toEqual([
      { front: [1, 1, 1, 1] },
      { front: [2, 2, 2, 2] },
      { front: [3, 3, 3, 3] },
    ]);
    expect(plan.blanksAdded).toBe(0);
  });

  it('step-and-repeat duplex: par frente/dorso por hoja', () => {
    const plan = cutAndStackPlan(4, 4, 'step-and-repeat-duplex');
    expect(plan.sheets[0]).toEqual({ front: [1, 1, 1, 1], back: [2, 2, 2, 2] });
    expect(plan.sheets[1]).toEqual({ front: [3, 3, 3, 3], back: [4, 4, 4, 4] });
  });

  it('lanza error con grilla inválida', () => {
    expect(() => cutAndStackPlan(8, 0, 'simplex')).toThrow();
  });
});

describe('Creep y lomo', () => {
  it('creep: el pliego más externo no compensa; crece hacia dentro', () => {
    expect(calculateCreepOffset(0, 4, 0.1)).toBeCloseTo(0.3);
    expect(calculateCreepOffset(1, 4, 0.1)).toBeCloseTo(0.2);
    expect(calculateCreepOffset(2, 4, 0.1)).toBeCloseTo(0.1);
    expect(calculateCreepOffset(3, 4, 0.1)).toBe(0);
  });

  it('creep: 0 sin grosor de papel o cuadernillo de 1 hoja', () => {
    expect(calculateCreepOffset(0, 4, 0)).toBe(0);
    expect(calculateCreepOffset(0, 1, 0.1)).toBe(0);
  });

  it('lomo: espesor por hoja común (0.10), ahuesado (0.12) o manual', () => {
    // 100 páginas = 50 hojas
    expect(calculateSpineWidth(100, { paperThicknessMm: 0.1 })).toBeCloseTo(5);
    expect(calculateSpineWidth(100, { paperThicknessMm: 0.12 })).toBeCloseTo(6);
    expect(calculateSpineWidth(100, { paperThicknessMm: 0.14 })).toBeCloseTo(7);
  });

  it('lomo: “sin grosor de papel” (guillotina/anillado) → 0', () => {
    expect(calculateSpineWidth(100)).toBe(0);
    expect(calculateSpineWidth(100, { paperThicknessMm: 0 })).toBe(0);
  });

  it('lomo: alternativa por PPI', () => {
    expect(calculateSpineWidth(300, { pagesPerInch: 400 })).toBeCloseTo((300 / 400) * 25.4);
  });
});

describe('checkHomePrinterMargins', () => {
  const sheetMm = { width: 210, height: 297 };

  it('diseño dentro del área imprimible → fits', () => {
    const result = checkHomePrinterMargins({
      designBoxMm: { x: 20, y: 20, width: 170, height: 257 },
      sheetMm,
    });
    expect(result.fits).toBe(true);
    expect(result.violations).toEqual([]);
    expect(result.fitScale).toBe(1);
  });

  it('diseño que pisa los 5 mm perimetrales → no entra + escala sugerida', () => {
    const result = checkHomePrinterMargins({
      designBoxMm: { x: 0, y: 0, width: 210, height: 297 },
      sheetMm,
    });
    expect(result.fits).toBe(false);
    expect(result.violations).toEqual(['left', 'top', 'right', 'bottom']);
    expect(result.fitScale).toBeLessThan(1);
    expect(result.fitScale).toBeGreaterThan(0);
  });

  it('margen personalizado (ej. 6 mm)', () => {
    const result = checkHomePrinterMargins({
      designBoxMm: { x: 5, y: 5, width: 200, height: 287 },
      sheetMm,
      unprintableMarginMm: 6,
    });
    expect(result.fits).toBe(false);
  });
});

describe('getSignatureSheetPairs', () => {
  it('cuadernillo de 8 páginas: empareja como lo haría un cuadernillo real', () => {
    expect(getSignatureSheetPairs(8, 0)).toEqual([
      [7, 0],
      [1, 6],
      [5, 2],
      [3, 4],
    ]);
  });

  it('respeta el offset global del cuadernillo siguiente', () => {
    expect(getSignatureSheetPairs(8, 8)).toEqual([
      [15, 8],
      [9, 14],
      [13, 10],
      [11, 12],
    ]);
  });

  it('cuadernillo de 4 páginas: una sola hoja, frente y dorso', () => {
    expect(getSignatureSheetPairs(4, 0)).toEqual([
      [3, 0],
      [1, 2],
    ]);
  });

  it('entrada inválida (no múltiplo de 4) devuelve vacío', () => {
    expect(getSignatureSheetPairs(6, 0)).toEqual([]);
    expect(getSignatureSheetPairs(0, 0)).toEqual([]);
    expect(getSignatureSheetPairs(NaN, 0)).toEqual([]);
  });
});

describe('getSignatureSheetPairs — dirección de lectura', () => {
  it('RTL espeja los pares de cada hoja (la primera página a la izquierda)', () => {
    expect(getSignatureSheetPairs(8, 0, 'rtl')).toEqual([
      [0, 7],
      [6, 1],
      [2, 5],
      [4, 3],
    ]);
  });

  it('LTR explícito es idéntico al comportamiento por defecto', () => {
    expect(getSignatureSheetPairs(8, 0, 'ltr')).toEqual(getSignatureSheetPairs(8, 0));
  });

  it('RTL también respeta el offset global del cuadernillo siguiente', () => {
    expect(getSignatureSheetPairs(8, 8, 'rtl')).toEqual([
      [8, 15],
      [14, 9],
      [10, 13],
      [12, 11],
    ]);
  });
});
