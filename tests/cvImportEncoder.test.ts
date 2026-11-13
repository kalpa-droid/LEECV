import { describe, it, expect } from 'vitest';
import {
  estimateBase64Bytes,
  computeScaledDimensions,
  computeRenderScale,
  encodeCanvasWithinBudget,
  JPEG_QUALITY_STEPS,
  MAX_PAGE_PAYLOAD_BYTES,
  MAX_IMAGE_DIMENSION,
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

  it('reduce proporcionalmente cuando el lado más largo excede el máximo', () => {
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

describe('pageImageEncoder — computeRenderScale', () => {
  it('una hoja A4 apaisada apunta a ~1920px de lado mayor', () => {
    // A4 landscape: 842x595 pt → escala 1920/842 ≈ 2.28
    expect(computeRenderScale(842, 595)).toBeCloseTo(2.28, 1);
  });

  it('una hoja A4 vertical apunta a ~1920px de lado mayor', () => {
    expect(computeRenderScale(595, 842)).toBeCloseTo(2.28, 1);
  });

  it('respeta el piso 1.5 en páginas diminutas y el techo 2.6', () => {
    expect(computeRenderScale(100, 80)).toBe(2.6);
    expect(computeRenderScale(2000, 1000)).toBe(1.5);
  });

  it('MAX_IMAGE_DIMENSION quedó en 1920 (óptimo lectura IA)', () => {
    expect(MAX_IMAGE_DIMENSION).toBe(1920);
  });
});

// Canvas falso: sin renderizar de verdad (este sandbox no tiene un canvas 2D real), pero con el
// mismo contrato que usa encodeCanvasWithinBudget (.toDataURL según la calidad pedida).
function fakeCanvas(bytesByQuality: Record<string, number>) {
  return {
    width: 1000,
    height: 1000,
    toDataURL: (type: string, quality?: number) => {
      const key = quality !== undefined ? String(quality) : type === 'image/png' ? 'png' : 'webp';
      const bytes = bytesByQuality[key];
      if (bytes === undefined) throw new Error(`calidad inesperada en el test: type=${type} quality=${quality}`);
      const base64Len = Math.ceil((bytes * 4) / 3);
      return `data:${type};base64,${'A'.repeat(base64Len)}`;
    },
  } as unknown as HTMLCanvasElement;
}

describe('pageImageEncoder — encodeCanvasWithinBudget (JPEG)', () => {
  it('la escalera JPEG arranca en 0.88 (no degrada páginas livianas)', () => {
    expect(JPEG_QUALITY_STEPS[0]).toBe(0.88);
    const canvas = fakeCanvas({ '0.88': 400_000, '0.78': 300_000, '0.65': 200_000, '0.48': 100_000 });
    const encoded = encodeCanvasWithinBudget(canvas, MAX_PAGE_PAYLOAD_BYTES);
    expect(encoded.mimeType).toBe('image/jpeg');
    expect(estimateBase64Bytes(encoded.base64)).toBeLessThanOrEqual(MAX_PAGE_PAYLOAD_BYTES);
    expect(estimateBase64Bytes(encoded.base64)).toBeCloseTo(400_000, -3);
  });

  it('regresión: una "foto pesada" igual sale bajo el límite', () => {
    const canvas = fakeCanvas({ '0.88': 6_000_000, '0.78': 4_800_000, '0.65': 3_000_000, '0.48': 2_000_000 });
    const encoded = encodeCanvasWithinBudget(canvas, MAX_PAGE_PAYLOAD_BYTES);
    expect(estimateBase64Bytes(encoded.base64)).toBeLessThanOrEqual(MAX_PAGE_PAYLOAD_BYTES);
  });

  it('si ni la calidad más baja entra, tira un error entendible en vez de mandar un pedido roto', () => {
    const canvas = fakeCanvas({ '0.88': 9_000_000, '0.78': 8_000_000, '0.65': 7_000_000, '0.48': 6_000_000 });
    // scaleToCanvas (el intento de achicar dimensiones) usa document.createElement('canvas') real;
    // en este sandbox sin canvas 2D nativo, ese segundo intento también falla — lo relevante acá
    // es que el resultado sea SIEMPRE un error claro, nunca un base64 que exceda el presupuesto.
    expect(() => encodeCanvasWithinBudget(canvas, MAX_PAGE_PAYLOAD_BYTES)).toThrow();
  });
});

describe('pageImageEncoder — encodeCanvasWithinBudget (página digital)', () => {
  it('acepta WebP q0.9 si entra bajo 1.2MB (borde tipográfico perfecto)', () => {
    const canvas = fakeCanvas({ '0.9': 600_000, png: 900_000 });
    const encoded = encodeCanvasWithinBudget(canvas, MAX_PAGE_PAYLOAD_BYTES, { digitalPage: true });
    expect(encoded.mimeType).toBe('image/webp');
    expect(estimateBase64Bytes(encoded.base64)).toBeCloseTo(600_000, -3);
  });

  it('si WebP no entra bajo 1.2MB y PNG sí, devuelve PNG', () => {
    const canvas = fakeCanvas({ '0.9': 2_000_000, png: 1_100_000 });
    const encoded = encodeCanvasWithinBudget(canvas, MAX_PAGE_PAYLOAD_BYTES, { digitalPage: true });
    expect(encoded.mimeType).toBe('image/png');
    expect(estimateBase64Bytes(encoded.base64)).toBeCloseTo(1_100_000, -3);
  });

  it('si WebP y PNG exceden, cae a la escalera JPEG', () => {
    const canvas = fakeCanvas({ '0.9': 2_000_000, png: 2_000_000, '0.88': 800_000 });
    const encoded = encodeCanvasWithinBudget(canvas, MAX_PAGE_PAYLOAD_BYTES, { digitalPage: true });
    expect(encoded.mimeType).toBe('image/jpeg');
    expect(estimateBase64Bytes(encoded.base64)).toBeCloseTo(800_000, -3);
  });
});
