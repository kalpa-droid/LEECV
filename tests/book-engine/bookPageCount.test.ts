import { describe, it, expect } from 'vitest';
import {
  calculateFinalBookPageCount,
  effectiveSourcePageCount,
  hasCustomCoverConfig,
} from '../../src/modules/book-studio/domain/bookPageCount';

describe('calculateFinalBookPageCount — replica exacta del armado del motor', () => {
  it('firma legada (posicional) sigue funcionando igual', () => {
    expect(calculateFinalBookPageCount(20, false, false)).toBe(20);
    expect(calculateFinalBookPageCount(20, true, false)).toBe(24);
    expect(calculateFinalBookPageCount(20, true, true)).toBe(24);
    expect(calculateFinalBookPageCount(0, false, false)).toBe(0);
  });

  it('sin tapa ni contratapa configurada: no hay hojas fantasma (fix del retiro)', () => {
    // Antes del fix, el motor inyectaba 1 blank aunque no hubiera contratapa.
    expect(
      calculateFinalBookPageCount({
        sourcePageCount: 20,
        blankBehindCover: true,
        blankInFrontBackCover: true,
      })
    ).toBe(20);
  });

  it('tapa del PDF: suma su retiro detrás (blankBehindCover)', () => {
    expect(
      calculateFinalBookPageCount({
        sourcePageCount: 20,
        hasSourceCover: true,
        blankBehindCover: true,
      })
    ).toBe(24); // 20 + 1 retiro → 21 → pad a 24
    expect(
      calculateFinalBookPageCount({
        sourcePageCount: 20,
        hasSourceCover: true,
        blankBehindCover: false,
      })
    ).toBe(20);
  });

  it('contratapa del PDF: extrae y re-coloca; el retiro delante se cuenta', () => {
    expect(
      calculateFinalBookPageCount({
        sourcePageCount: 20,
        hasSourceBackCover: true,
        blankInFrontBackCover: true,
      })
    ).toBe(24); // motor: 20 → retira 1 → +retiro → relleno → +contratapa → 24
    expect(
      calculateFinalBookPageCount({
        sourcePageCount: 20,
        hasSourceBackCover: true,
        blankInFrontBackCover: false,
      })
    ).toBe(20);
    expect(
      calculateFinalBookPageCount({
        sourcePageCount: 19,
        hasSourceBackCover: true,
        blankInFrontBackCover: true,
      })
    ).toBe(20);
  });

  it('contratapa personalizada (destino A): retiro + 1 página', () => {
    expect(
      calculateFinalBookPageCount({
        sourcePageCount: 20,
        hasCustomBackCover: true,
        blankInFrontBackCover: true,
      })
    ).toBe(24); // 20 + 1 retiro + 1 contratapa = 22 → 24
    expect(
      calculateFinalBookPageCount({
        sourcePageCount: 20,
        hasCustomBackCover: true,
        blankInFrontBackCover: false,
      })
    ).toBe(24); // 20 + 1 contratapa = 21 → 24
  });

  it('destino B/C con cubiertas custom: el interior no las suma', () => {
    expect(
      calculateFinalBookPageCount({
        sourcePageCount: 20,
        hasCustomCover: true,
        hasCustomBackCover: true,
        separateCover: true,
      })
    ).toBe(20);
    expect(
      calculateFinalBookPageCount({
        sourcePageCount: 20,
        hasSourceCover: true,
        blankBehindCover: true,
        separateCover: true,
      })
    ).toBe(24); // el retiro de tapa sí viaja dentro del interior
  });

  it('tapa personalizada embebida: +1 página y su retiro detrás', () => {
    expect(
      calculateFinalBookPageCount({
        sourcePageCount: 20,
        hasCustomCover: true,
        blankBehindCover: true,
      })
    ).toBe(24); // 20 + 1 tapa + 1 retiro = 22 → 24
  });

  it('capacidad personalizada (8 = cuarto) respeta el múltiplo', () => {
    expect(
      calculateFinalBookPageCount({
        sourcePageCount: 20,
        capacity: 8,
      })
    ).toBe(24);
  });

  it('ajuste de alineación de foliado (refs) agrega el blank extra que el motor suma', () => {
    // refBookPage par → espera izquierda; si el lado guardado es 'derecha', el motor suma 1 blank extra.
    const base = {
      sourcePageCount: 20,
      hasSourceCover: true,
      blankBehindCover: false,
      refPdfPage: 10,
      refBookPage: 8,
    };
    expect(
      calculateFinalBookPageCount({ ...base, refPageSide: 'derecha' })
    ).toBe(24); // 20 + 1 (corrección de lado) → 21 → 24
    expect(
      calculateFinalBookPageCount({ ...base, refPageSide: 'izquierda' })
    ).toBe(20); // lado ya coincide: sin blanks
  });
});

describe('effectiveSourcePageCount — páginas que el motor realmente copia', () => {
  it('pageOrder definido gana sobre pdfPageCount; los splits fotocopia cuentan como página', () => {
    expect(effectiveSourcePageCount(50, [], ['1', '2', '3', '5_0', '5_1'])).toBe(5);
  });

  it('deletedPages se aplican sobre el número base de cada registro de pageOrder', () => {
    expect(effectiveSourcePageCount(50, ['3'], ['1', '2', '3', '3_0', '5'])).toBe(3);
  });

  it('sin pageOrder: pdfPageCount menos deletedPages (mínimo 0)', () => {
    expect(effectiveSourcePageCount(20, [1, 20], undefined)).toBe(18);
    expect(effectiveSourcePageCount(3, [1, 2, 3], undefined)).toBe(0);
  });
});

describe('hasCustomCoverConfig — solo upload/plantilla cuentan como cubierta', () => {
  it('reconoce upload y template; ignora none y nulos', () => {
    expect(hasCustomCoverConfig({ type: 'upload' })).toBe(true);
    expect(hasCustomCoverConfig({ type: 'template' })).toBe(true);
    expect(hasCustomCoverConfig({ type: 'none' })).toBe(false);
    expect(hasCustomCoverConfig(null)).toBe(false);
    expect(hasCustomCoverConfig(undefined)).toBe(false);
  });
});
