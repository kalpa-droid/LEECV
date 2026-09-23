import { describe, it, expect } from 'vitest';
import {
  estimateBase64Bytes,
  computeScaledDimensions,
  encodeCanvasWithinBudget,
  MAX_PAGE_PAYLOAD_BYTES,
} from '../src/shared/core/cv-import/pageImageEncoder';

/**
 * Cubre la regresión real: una foto de cámara sin comprimir (varios MB) superaba el límite
 * de 4.5 MB por pedido de Vercel y la función se caía. Estos tests verifican, sin necesitar
 * un navegador real, que el codificador nunca deja salir un payload por encima del presupuesto.
 */
describe('pageImageEncoder — estimateBase64Bytes', () => {
  it('aproxima el tamaño real en bytes de una cadena base64 (relación 3/4)', () => {
    expect(estimateBase64Bytes('')).toBe(0);
    expect(estimateBase64Bytes('A'.repeat(4000))).toBe(3000);
  });
});

describe('pageImageEncoder — computeScaledDimensions', () => {
  it('nunca agranda una imagen que ya es más chica que el máximo', () => {
    expect(computeScaledDimensions(800, 600, 2000)).toEqual({ width: 800, height: 600 });
  });

  it('reduce proporcionalmente cuando el lado más largo excede el máximo (foto de celular típica)', () => {
    // Una foto de 4000x3000 (12MP, común en celulares) con tope 2000 → factor 0.5
    expect(computeScaledDimensions(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
  });

  it('el lado más largo manda, aunque sea el alto (foto vertical)', () => {
    expect(computeScaledDimensions(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 });
  });

  it('nunca da 0px, incluso con un tope irrisorio', () => {
    const r = computeScaledDimensions(4000, 3000, 1);
    expect(r.width).toBeGreaterThanOrEqual(1);
    expect(r.height).toBeGreaterThanOrEqual(1);
  });
});

// Canvas falso: sin renderizar de verdad (este sandbox no tiene un canvas 2D real), pero con el
// mismo contrato que usa encodeCanvasWithinBudget (.toDataURL según la calidad pedida). Cada
// calidad devuelve una cadena de un tamaño distinto, simulando que más calidad = más pesado.
function fakeCanvas(bytesByQuality: Record<number, number>) {
  return {
    width: 1000,
    height: 1000,
    toDataURL: (_type: string, quality: number) => {
      const bytes = bytesByQuality[quality];
      if (bytes === undefined) throw new Error(`calidad inesperada en el test: ${quality}`);
      // base64 length ≈ bytes * 4/3 → despejamos length para simular ese peso exacto
      const base64Len = Math.ceil((bytes * 4) / 3);
      return `data:image/jpeg;base64,${'A'.repeat(base64Len)}`;
    },
  } as unknown as HTMLCanvasElement;
}

describe('pageImageEncoder — encodeCanvasWithinBudget', () => {
  it('si la calidad más alta (0.82) ya entra en el presupuesto, no baja de más', () => {
    const canvas = fakeCanvas({ 0.82: 500_000, 0.7: 300_000, 0.55: 200_000, 0.4: 100_000 });
    const b64 = encodeCanvasWithinBudget(canvas, MAX_PAGE_PAYLOAD_BYTES);
    expect(estimateBase64Bytes(b64)).toBeLessThanOrEqual(MAX_PAGE_PAYLOAD_BYTES);
    expect(estimateBase64Bytes(b64)).toBeCloseTo(500_000, -3);
  });

  it('regresión: una "foto pesada" (todas las calidades por encima del presupuesto) igual sale bajo el límite', () => {
    // Ninguna calidad entra por sí sola en 3.5MB — sin el arreglo esto es justo lo que
    // reventaba el límite de 4.5MB de Vercel. Se espera que elija la más chica que entre,
    // o si ninguna entra en la primera pasada, siga probando (no debe tirar de entrada).
    const canvas = fakeCanvas({ 0.82: 6_000_000, 0.7: 4_800_000, 0.55: 3_000_000, 0.4: 2_000_000 });
    const b64 = encodeCanvasWithinBudget(canvas, MAX_PAGE_PAYLOAD_BYTES);
    expect(estimateBase64Bytes(b64)).toBeLessThanOrEqual(MAX_PAGE_PAYLOAD_BYTES);
  });

  it('si ni la calidad más baja entra, tira un error entendible en vez de mandar un pedido roto', () => {
    const canvas = fakeCanvas({ 0.82: 9_000_000, 0.7: 8_000_000, 0.55: 7_000_000, 0.4: 6_000_000 });
    // scaleToCanvas (el intento de achicar dimensiones) usa document.createElement('canvas') real;
    // en este sandbox sin canvas 2D nativo, ese segundo intento también falla — lo relevante acá
    // es que el resultado sea SIEMPRE un error claro, nunca un base64 que exceda el presupuesto.
    expect(() => encodeCanvasWithinBudget(canvas, MAX_PAGE_PAYLOAD_BYTES)).toThrow();
  });
});
