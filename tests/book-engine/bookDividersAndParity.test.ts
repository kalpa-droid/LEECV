import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import {
  computePaddingPages,
  countBlanksBehindCoverWithOffset,
} from '../../src/shared/kits/print-imposition/impositionMath';
import { countInsertedPagesBeforePdfPage } from '../../src/modules/book-studio/domain/bookDividerCanvas';
import { computeBookFinalPageCount, computeBookPageBreakdown } from '../../src/modules/book-studio/domain/bookPageCount';
import {
  DEFAULT_BOOK_IMPOSITION_OPTIONS,
  processBookImposition,
  resolveSeparateCoverPlan,
} from '../../src/modules/book-studio/domain/impositionEngine';
import { getAutoContrastTextColor } from '../../src/modules/book-studio/domain/bookColorUtils';

async function makePdf(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([595.28, 841.89]);
    page.drawText(`Pagina ${i}`, { x: 50, y: 800, size: 12, font });
  }
  return await doc.save();
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

describe('Separadores, paridad, relleno y hoja aparte de tapa/contratapa', () => {
  it('sin calibración (refPdfPage === 0) no agrega blancos extra aunque haya separadores', () => {
    expect(
      countBlanksBehindCoverWithOffset({
        blankBehindCoverChecked: true,
        refPdfPage: 0,
        refBookPage: 0,
        refPageSide: 'derecha',
        insertedPagesBeforeRef: 3,
      }),
    ).toBe(1);
    expect(
      countBlanksBehindCoverWithOffset({
        blankBehindCoverChecked: false,
        refPdfPage: 0,
        refBookPage: 0,
        refPageSide: 'derecha',
        insertedPagesBeforeRef: 3,
      }),
    ).toBe(0);
  });

  it('separador con hoja detrás (+2) conserva paridad y separador de 1 pág (+1) la invierte antes de refPdfPage', () => {
    const divWithBlank = {
      id: 'd1',
      insertBeforePage: 3,
      title: 'Cap 1',
      type: 'template' as const,
      blankBehind: true,
    };
    const divSingle = {
      id: 'd2',
      insertBeforePage: 3,
      title: 'Cap 1',
      type: 'template' as const,
      blankBehind: false,
    };

    const deltaBlank = countInsertedPagesBeforePdfPage({
      pdfPageCount: 10,
      sectionDividers: [divWithBlank],
      refPdfPage: 5,
    });
    expect(deltaBlank).toBe(2);

    const deltaSingle = countInsertedPagesBeforePdfPage({
      pdfPageCount: 10,
      sectionDividers: [divSingle],
      refPdfPage: 5,
    });
    expect(deltaSingle).toBe(1);

    // Pág 5 del PDF es naturalmente derecha (impar) y tiene impreso el número 1 (espera derecha).
    // Con separador de 1 pág antes, la pág 5 pasó a izquierda → necesita 1 blanco detrás de tapa para volver a derecha.
    expect(
      countBlanksBehindCoverWithOffset({
        blankBehindCoverChecked: false,
        refPdfPage: 5,
        refBookPage: 1,
        refPageSide: 'derecha',
        insertedPagesBeforeRef: deltaSingle,
      }),
    ).toBe(1);

    // Con separador con hoja detrás (+2), sigue a la derecha → 0 blancos extra.
    expect(
      countBlanksBehindCoverWithOffset({
        blankBehindCoverChecked: false,
        refPdfPage: 5,
        refBookPage: 1,
        refPageSide: 'derecha',
        insertedPagesBeforeRef: deltaBlank,
      }),
    ).toBe(0);
  });

  it('computePaddingPages garantiza al menos 1 blanco delante de contratapa sin sumar 4 extra', () => {
    // 14 págs + 1 contratapa = 15 → relleno natural = 1 blanco (total 16). No debe saltar a 20.
    const r = computePaddingPages(14, true, true, 4);
    expect(r.totalPages).toBe(16);
    expect(r.retreatBlanks).toBe(1);
    expect(r.paddingBlanks).toBe(0);

    // 15 págs + 1 contratapa = 16 → exige al menos 1 blanco delante → sube a 17 → padding a 20.
    const r2 = computePaddingPages(15, true, true, 4);
    expect(r2.totalPages).toBe(20);
    expect(r2.retreatBlanks).toBe(1);
  });

  it('resolveSeparateCoverPlan extrae 1ª y última pág. en destino B cuando no se creó tapa/contratapa y el usuario lo habilita', () => {
    const planHome = resolveSeparateCoverPlan(
      {
        destination: 'B',
        printTarget: 'home',
        extractPdfCoversWhenSeparate: true,
        hasCover: false,
        hasBackCover: false,
        customCover: null,
        customBackCover: null,
      },
      8,
    );
    expect(planHome.isSeparate).toBe(true);
    expect(planHome.frontSource).toBe('pdf-first');
    expect(planHome.backSource).toBe('pdf-last');
    expect(planHome.layout).toBe('home-guillotine');
    expect(planHome.spineEnabled).toBe(false);

    // Guardarraíl: con solo 2 páginas no extrae ambas dejando 0 páginas interiores.
    const planTooShort = resolveSeparateCoverPlan(
      { destination: 'B', printTarget: 'home', extractPdfCoversWhenSeparate: true },
      2,
    );
    expect(planTooShort.frontSource).toBe('pdf-first');
    expect(planTooShort.backSource).toBe('none');
  });

  it('destino B en casa con PDF de 8 págs y sin tapas creadas genera ZIP con interior (3 hojas) y tapa_y_contratapa_guillotina.pdf', async () => {
    const src = await makePdf(8);
    const opts = {
      ...DEFAULT_BOOK_IMPOSITION_OPTIONS,
      printTarget: 'home' as const,
      paperSize: 'A4' as const,
      destination: 'B' as const,
      exportMode: 'vector' as const,
      extractPdfCoversWhenSeparate: true,
      hasCover: false,
      hasBackCover: false,
      customCover: null,
      customBackCover: null,
    };

    // Conteo: 8 - 2 (tapa + contratapa extraídas) = 6 → múltiplo de 4 = 8 (4 hojas de interior) + 1 hoja guillotina = 5 hojas totales.
    expect(computeBookFinalPageCount(opts, 8)).toBe(8);
    const breakdown = computeBookPageBreakdown(opts, 8);
    expect(breakdown.interiorSheets).toBe(4);
    expect(breakdown.separateCoverSheets).toBe(1);
    expect(breakdown.totalSheetsToPrint).toBe(5);

    const out = await processBookImposition(toArrayBuffer(src), opts);
    const zip = await JSZip.loadAsync(out);
    const names = Object.keys(zip.files).sort();
    expect(names).toEqual(['libro_interior.pdf', 'tapa_y_contratapa_guillotina.pdf']);

    const interiorDoc = await PDFDocument.load(await zip.files['libro_interior.pdf']!.async('uint8array'));
    const coverDoc = await PDFDocument.load(await zip.files['tapa_y_contratapa_guillotina.pdf']!.async('uint8array'));
    expect(interiorDoc.getPageCount()).toBe(4);
    expect(coverDoc.getPageCount()).toBe(1);
    // Hoja A4 apaisada (ancho > alto) para cortar al medio.
    const coverSize = coverDoc.getPage(0).getSize();
    expect(coverSize.width).toBeGreaterThan(coverSize.height);
  }, 30000);

  it('getAutoContrastTextColor devuelve blanco sobre oscuro y oscuro sobre claro', () => {
    expect(getAutoContrastTextColor('#111827')).toBe('#FFFFFF');
    expect(getAutoContrastTextColor('#F8FAFC')).toBe('#0F172A');
  });
});
