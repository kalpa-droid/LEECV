import { describe, it, expect } from 'vitest';
import {
  selectBookSamplePages,
  textTopEdgeToRotationDeg,
  detectLocalPageOrientationFromTextItems,
  evaluateOrientationConsensus,
  planFullBookOrientationBatches,
} from '../../src/modules/book-studio/domain/bookOrientationAi';
import {
  deduceFirstBookPage,
  extractHeaderFooterNumberFromTextItems,
} from '../../src/modules/book-studio/domain/bookFoliadoAi';
import {
  makeDividerPageToken,
  resolveBookOrderedItems,
  BookSectionDivider,
} from '../../src/modules/book-studio/domain/bookDividerCanvas';
import { computeBookFinalPageCount } from '../../src/modules/book-studio/domain/bookPageCount';

describe('bookOrientationAi — muestreo, orientación local, consenso y lotes', () => {
  it('selectBookSamplePages prioriza [2, 5, 10, 15] y excluye eliminadas', () => {
    expect(selectBookSamplePages(20)).toEqual([2, 5, 10, 15]);
    expect(selectBookSamplePages(20, [5])).toEqual([2, 10, 15]);
    expect(selectBookSamplePages(3)).toEqual([1, 2, 3]);
    expect(selectBookSamplePages(0)).toEqual([]);
  });

  it('textTopEdgeToRotationDeg convierte el borde superior de las letras en giro horario exacto', () => {
    expect(textTopEdgeToRotationDeg('top')).toBe(0);
    expect(textTopEdgeToRotationDeg('left')).toBe(90);
    expect(textTopEdgeToRotationDeg('bottom')).toBe(180);
    expect(textTopEdgeToRotationDeg('right')).toBe(270);
    expect(textTopEdgeToRotationDeg('unclear')).toBeNull();
  });

  it('detectLocalPageOrientationFromTextItems detecta texto girado +90° o -90° desde la matriz PDF.js', () => {
    // b > 0, a ≈ 0 → cabeza a la izquierda → requiere girar +90° horario
    const items90 = Array.from({ length: 6 }, () => ({
      str: ' capitulo primero introduccion ',
      transform: [0, 12, -12, 0, 100, 200],
    }));
    expect(detectLocalPageOrientationFromTextItems(items90)?.rotationDeg).toBe(90);

    // b < 0, a ≈ 0 → cabeza a la derecha → requiere girar 270° (-90°)
    const items270 = Array.from({ length: 6 }, () => ({
      str: ' capitulo primero introduccion ',
      transform: [0, -12, 12, 0, 100, 200],
    }));
    expect(detectLocalPageOrientationFromTextItems(items270)?.rotationDeg).toBe(270);
  });

  it('evaluateOrientationConsensus distingue consenso uniforme vs páginas mezcladas', () => {
    const uniform = evaluateOrientationConsensus([
      { pdfPage: 2, textTopEdge: 'left', rotationDeg: 90, confidence: 'high' },
      { pdfPage: 5, textTopEdge: 'left', rotationDeg: 90, confidence: 'high' },
      { pdfPage: 10, textTopEdge: 'left', rotationDeg: 90, confidence: 'medium' },
      { pdfPage: 15, textTopEdge: 'unclear', rotationDeg: null, confidence: 'low' },
    ]);
    expect(uniform.status).toBe('uniform');
    expect(uniform.uniformRotationDeg).toBe(90);

    // Caso pedido por el usuario: pág 2 y 15 a la derecha (+90°), pág 5 y 10 a la izquierda (270°)
    const mixed = evaluateOrientationConsensus([
      { pdfPage: 2, textTopEdge: 'left', rotationDeg: 90, confidence: 'high' },
      { pdfPage: 5, textTopEdge: 'right', rotationDeg: 270, confidence: 'high' },
      { pdfPage: 10, textTopEdge: 'right', rotationDeg: 270, confidence: 'high' },
      { pdfPage: 15, textTopEdge: 'left', rotationDeg: 90, confidence: 'high' },
    ]);
    expect(mixed.status).toBe('mixed');
    expect(mixed.rightTurnPages).toEqual([2, 15]);
    expect(mixed.leftTurnPages).toEqual([5, 10]);
  });

  it('planFullBookOrientationBatches usa imágenes simples hasta 16 págs. y grillas 2x2 para libros largos', () => {
    const shortPages = Array.from({ length: 10 }, (_, i) => i + 1);
    const shortBatches = planFullBookOrientationBatches(shortPages);
    expect(shortBatches.every((b) => b.mode === 'single')).toBe(true);
    expect(shortBatches.length).toBe(3); // 4 + 4 + 2

    const longPages = Array.from({ length: 32 }, (_, i) => i + 1);
    const longBatches = planFullBookOrientationBatches(longPages);
    expect(longBatches.every((b) => b.mode === 'grid2x2')).toBe(true);
    expect(longBatches.length).toBe(2); // 16 páginas por request (4 grillas 2x2)
  });
});

describe('bookFoliadoAi — deducción inversa de Página 1 ("5. Encuentro un número")', () => {
  it('si encuentra el número 10 en la pág. 14 del PDF, deduce que la Página 1 es la pág. 5 (9 anteriores)', () => {
    const res = deduceFirstBookPage({
      detections: [{ pdfPage: 14, printedNumber: 10, confidence: 'high' }],
      totalPages: 40,
      mode: 'normal',
    });
    expect(res).not.toBeNull();
    expect(res?.deducedPdfPage).toBe(5);
    expect(res?.deducedBookPage).toBe(1);
    expect(res?.sourceWitnessPdfPage).toBe(14);
    expect(res?.sourceWitnessBookPage).toBe(10);
  });

  it('verifica consistencia cruzada cuando 2 páginas de muestra coinciden en la misma Página 1', () => {
    // Si pág 5 tiene impreso el 3 (deduce pág 3 = 1) y pág 10 tiene impreso el 8 (deduce pág 3 = 1)
    const res = deduceFirstBookPage({
      detections: [
        { pdfPage: 5, printedNumber: 3, confidence: 'high' },
        { pdfPage: 10, printedNumber: 8, confidence: 'high' },
      ],
      totalPages: 30,
      mode: 'normal',
    });
    expect(res?.deducedPdfPage).toBe(3);
    expect(res?.verifiedByMultiplePages).toBe(true);
  });

  it('deduce pliego y mitad exacta en modo fotocopia (2 páginas por hoja)', () => {
    // Hoja 1: izq(1), der(2)
    // Hoja 2: izq(3=Portadilla), der(4=Página 1 del libro)
    // Hoja 5: izq(9=Página 6), der(10=Página 7)
    const res = deduceFirstBookPage({
      detections: [{ pdfPage: 5, leftPrintedNumber: 6, rightPrintedNumber: 7, confidence: 'high' }],
      totalPages: 20,
      mode: 'fotocopia',
    });
    expect(res).not.toBeNull();
    expect(res?.deducedPdfPage).toBe(2);
    expect(res?.deducedHalf).toBe('derecha');
    expect(res?.deducedBookPage).toBe(1);
  });

  it('maneja capítulos sueltos cuando el número encontrado es mayor que las páginas previas', () => {
    //En la pág. 2 del PDF está impreso el número 45 → la pág. 1 del PDF es la 44
    const res = deduceFirstBookPage({
      detections: [{ pdfPage: 2, printedNumber: 45, confidence: 'high' }],
      totalPages: 12,
      mode: 'normal',
    });
    expect(res?.isExcerptStart).toBe(true);
    expect(res?.deducedPdfPage).toBe(1);
    expect(res?.deducedBookPage).toBe(44);
  });

  it('extractHeaderFooterNumberFromTextItems extrae números de cabecera/pie ignorando años', () => {
    const items = [
      { str: 'Edición 2026', transform: [10, 0, 0, 10, 50, 780] },
      { str: '12', transform: [10, 0, 0, 10, 300, 30] },
    ];
    const extracted = extractHeaderFooterNumberFromTextItems(items, 600, 800, 'normal');
    expect(extracted.printedNumber).toBe(12);
  });
});

describe('bookDividerCanvas & bookPageCount — separadores de capítulo con y sin hoja blanca detrás', () => {
  const sampleDividerWithBlank: BookSectionDivider = {
    id: 'div_cap1',
    insertBeforePage: 5,
    kicker: 'Capítulo 1',
    title: 'Introducción',
    type: 'template',
    blankBehind: true,
  };

  const sampleDividerSingle: BookSectionDivider = {
    id: 'div_cap2',
    insertBeforePage: 10,
    kicker: 'Capítulo 2',
    title: 'Desarrollo',
    type: 'template',
    blankBehind: false,
  };

  it('resolveBookOrderedItems inserta el token del separador antes de la página indicada', () => {
    const items = resolveBookOrderedItems({
      pdfPageCount: 6,
      sectionDividers: [{ ...sampleDividerWithBlank, insertBeforePage: 3 }],
    });
    expect(items).toEqual([1, 2, makeDividerPageToken('div_cap1'), 3, 4, 5, 6]);
  });

  it('computeBookFinalPageCount suma +2 por separador con hoja blanca detrás y +1 por separador simple', () => {
    // 17 páginas + 1 separador con blanco detrás (+2) + 1 separador simple (+1) = 20 páginas (múltiplo de 4 exacto)
    const total = computeBookFinalPageCount(
      {
        sectionDividers: [sampleDividerWithBlank, sampleDividerSingle],
        pageOrder: resolveBookOrderedItems({
          pdfPageCount: 17,
          sectionDividers: [sampleDividerWithBlank, sampleDividerSingle],
        }),
      },
      17,
    );
    expect(total).toBe(20);
  });
});
