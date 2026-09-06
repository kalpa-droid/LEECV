import { describe, it, expect } from 'vitest';
import { padToMultipleOf4, getBookletPairIndex, countBlanksBehindCover } from '../../src/shared/core/book-engine/impositionMath';

describe('impositionMath Unit Tests', () => {
  describe('padToMultipleOf4', () => {
    it('debe devolver 0 para 0 páginas', () => {
      expect(padToMultipleOf4(0)).toBe(0);
    });

    it('debe redondear al siguiente múltiplo de 4', () => {
      expect(padToMultipleOf4(1)).toBe(4);
      expect(padToMultipleOf4(2)).toBe(4);
      expect(padToMultipleOf4(3)).toBe(4);
      expect(padToMultipleOf4(4)).toBe(4);
      expect(padToMultipleOf4(5)).toBe(8);
      expect(padToMultipleOf4(10)).toBe(12);
    });
  });

  describe('getBookletPairIndex', () => {
    it('debe calcular los pares para un libro de 8 páginas (2 hojas / 4 caras)', () => {
      // Cara 0 (Frente): izquierda=pág 8 (idx 7), derecha=pág 1 (idx 0)
      expect(getBookletPairIndex(0, 8)).toEqual({ leftIndex: 7, rightIndex: 0 });
      // Cara 1 (Dorso): izquierda=pág 2 (idx 1), derecha=pág 7 (idx 6)
      expect(getBookletPairIndex(1, 8)).toEqual({ leftIndex: 1, rightIndex: 6 });
      // Cara 2 (Frente): izquierda=pág 6 (idx 5), derecha=pág 3 (idx 2)
      expect(getBookletPairIndex(2, 8)).toEqual({ leftIndex: 5, rightIndex: 2 });
      // Cara 3 (Dorso): izquierda=pág 4 (idx 3), derecha=pág 5 (idx 4)
      expect(getBookletPairIndex(3, 8)).toEqual({ leftIndex: 3, rightIndex: 4 });
    });
  });

  describe('countBlanksBehindCover', () => {
    it('debe devolver 1 si se activa la hoja en blanco sin referencia de foliado', () => {
      expect(countBlanksBehindCover(true, 0, 0, 'derecha')).toBe(1);
    });

    it('debe devolver 0 si no se activa la hoja en blanco sin referencia de foliado', () => {
      expect(countBlanksBehindCover(false, 0, 0, 'derecha')).toBe(0);
    });
  });
});
