import { describe, it, expect } from 'vitest';
import {
  analyzePdfPage,
  findColumnGutter,
  reconstructText,
  reconstructColumnText,
  type PdfTextItemLike,
} from '../src/shared/core/cv-import/pdfPageLayout';

/** Fábrica de TextItem sintético estilo PDF.js (y crece hacia arriba). */
function span(str: string, x: number, y: number, width?: number, height = 10, hasEOL = false): PdfTextItemLike {
  return {
    str,
    transform: [height, 0, 0, height, x, y] as unknown as number[],
    width: width ?? Math.max(4, str.length * height * 0.5),
    height,
    hasEOL,
  };
}

/** CV de 1 columna: líneas centradas sobre el mismo x, de arriba hacia abajo. */
function singleColumnItems(): PdfTextItemLike[] {
  const lines = [
    'Juan Pérez',
    'Desarrollador Full Stack',
    'Experiencia laboral en empresas de tecnología',
    'Educación universitaria en informática',
    'Habilidades técnicas en desarrollo web',
  ];
  return lines.map((line, idx) => span(line, 60, 780 - idx * 26));
}

/**
 * CV estilo Canva/Word de 2 columnas, con el stream INTERCALADO como lo entrega
 * un PDF real (línea izq, línea der, línea izq, línea der...) y un gutter vacío
 * persistente entre x=250 y x=330.
 */
function twoColumnItemsInterleaved(): PdfTextItemLike[] {
  const left = [
    'EXPERIENCIA',
    'Desarrollador senior en Globant',
    'Liderazgo de equipo técnico',
    'Arquitectura de plataformas web',
    'Mentoria de desarrolladores junior',
  ];
  const right = [
    'CONTACTO',
    'juan@ejemplo.com',
    '+54 11 5555 6666',
    'linkedin.com/in/juanperez',
    'Buenos Aires, Argentina',
  ];
  const items: PdfTextItemLike[] = [];
  for (let i = 0; i < left.length; i++) {
    items.push(span(left[i], 40, 780 - i * 30, 200));
    items.push(span(right[i], 340, 780 - i * 30, 180));
  }
  return items;
}

describe('pdfPageLayout — findColumnGutter', () => {
  it('detecta la franja vacía entre dos columnas de un CV estilo Canva', () => {
    const gutter = findColumnGutter(twoColumnItemsInterleaved(), 595);
    expect(gutter).not.toBeNull();
    expect(gutter!.start).toBeLessThanOrEqual(250 + 5);
    expect(gutter!.end).toBeGreaterThanOrEqual(330 - 5);
  });

  it('en un CV de una sola columna no detecta gutter', () => {
    expect(findColumnGutter(singleColumnItems(), 595)).toBeNull();
  });
});

describe('pdfPageLayout — analyzePdfPage modos', () => {
  it('CV de 1 columna coherente → modo text, con saltos de línea y sin mezcla', () => {
    const result = analyzePdfPage(singleColumnItems(), 595, 842);
    expect(result.mode).toBe('text');
    expect(result.text).toContain('\n');
    expect(result.text).toContain('Juan Pérez');
    expect(result.multiColumn).toBe(false);
  });

  it('CV de 2 columnas (stream intercalado) → modo hybrid y texto por bloques sin intercalar', () => {
    const result = analyzePdfPage(twoColumnItemsInterleaved(), 595, 842);
    expect(result.mode).toBe('hybrid');
    expect(result.multiColumn).toBe(true);
    expect(result.columnCount).toBe(2);

    const leftBlock = result.text.slice(0, result.text.indexOf('CONTACTO'));
    const rightBlockStart = result.text.indexOf('CONTACTO');
    expect(leftBlock).toContain('EXPERIENCIA');
    expect(result.text.slice(rightBlockStart)).toContain('juan@ejemplo.com');
    // La columna derecha no debe filtrarse dentro del bloque izquierdo
    expect(leftBlock).not.toContain('juan@ejemplo.com');
  });

  it('PDF escaneado (sin capa de texto) → modo image', () => {
    const result = analyzePdfPage([], 595, 842);
    expect(result.mode).toBe('image');
    expect(result.text).toBe('');
  });

  it('texto con encoding roto (sin palabras comunes ni ratio alfabético) → modo image', () => {
    const garbage = Array.from({ length: 12 }, (_, i) =>
      span(`%$#@&*^~{}<>[]${i}¦¬¡¢£¤¥¦`, 60, 780 - i * 20)
    );
    const result = analyzePdfPage(garbage, 595, 842);
    expect(result.mode).toBe('image');
  });
});

describe('pdfPageLayout — reconstrucción y orden', () => {
  it('respeta hasEOL como salto de renglón forzado aún en el mismo baseline', () => {
    const items = [span('Hola', 10, 700, 40, 10, true), span('mundo', 60, 700, 40, 10, false)];
    const text = reconstructText(items);
    expect(text).toBe('Hola\nmundo');
  });

  it('el bloque de la columna izquierda se emite completo antes que el de la derecha', () => {
    const items = twoColumnItemsInterleaved();
    const gutter = findColumnGutter(items, 595)!;
    const text = reconstructColumnText(items, gutter);
    expect(text.indexOf('EXPERIENCIA')).toBeLessThan(text.indexOf('CONTACTO'));
    expect(text).toContain('\n\n');
  });
});
