import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import {
  processBookImposition,
  DEFAULT_BOOK_IMPOSITION_OPTIONS,
} from '../../src/shared/core/book-engine/impositionEngine';

/** Crea un PDF de N páginas A4 con una línea de texto por página (sin fuentes externas). */
async function makePdf(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([595.28, 841.89]);
    page.drawText(`Pagina ${i}`, { x: 50, y: 800, size: 12, font });
  }
  return await doc.save();
}

/** Convierte el Uint8Array de pdf-lib en ArrayBuffer (parametro aceptado por el motor). */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function isPdf(bytes: Uint8Array): boolean {
  return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // "%PDF"
}

function isZip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK"
}

describe('processBookImposition — integración headless (camino vectorial)', () => {
  it('arma un PDF de 8 páginas en 4 hojas (destino A, vector, sin blancos extra)', async () => {
    const src = await makePdf(8);
    const out = await processBookImposition(toArrayBuffer(src), {
      ...DEFAULT_BOOK_IMPOSITION_OPTIONS,
      exportMode: 'vector',
      blankInFrontBackCover: false,
    });

    expect(isPdf(out)).toBe(true);
    const loaded = await PDFDocument.load(out);
    expect(loaded.getPageCount()).toBe(4);
  }, 30000);

  it('ZIP por cuadernillo: 32 páginas → ZIP con 2 PDFs de 8 hojas cada uno', async () => {
    const src = await makePdf(32);
    const out = await processBookImposition(toArrayBuffer(src), {
      ...DEFAULT_BOOK_IMPOSITION_OPTIONS,
      exportMode: 'vector',
      blankInFrontBackCover: false,
      zipByBooklet: true,
    });

    expect(isZip(out)).toBe(true);
    const zip = await JSZip.loadAsync(out);
    const names = Object.keys(zip.files).sort();
    expect(names).toEqual(['cuadernillo_1.pdf', 'cuadernillo_2.pdf']);

    for (const name of names) {
      const data = await zip.files[name]!.async('uint8array');
      const pdf = await PDFDocument.load(data);
      expect(pdf.getPageCount()).toBe(8);
    }
  }, 30000);

  it('destino B sin cubierta personalizada cae back a A (PDF simple, no ZIP)', async () => {
    const src = await makePdf(8);
    const out = await processBookImposition(toArrayBuffer(src), {
      ...DEFAULT_BOOK_IMPOSITION_OPTIONS,
      exportMode: 'vector',
      destination: 'B',
      blankInFrontBackCover: false,
    });

    expect(isPdf(out)).toBe(true);
    expect(isZip(out)).toBe(false);
  }, 30000);

  it('showGuides no cambia la cantidad de páginas de salida', async () => {
    const src = await makePdf(8);
    const base = {
      ...DEFAULT_BOOK_IMPOSITION_OPTIONS,
      exportMode: 'vector' as const,
      blankInFrontBackCover: false,
    };

    const without = await processBookImposition(toArrayBuffer(src), { ...base, showGuides: false });
    const withGuides = await processBookImposition(toArrayBuffer(src), { ...base, showGuides: true });

    const pdfWithout = await PDFDocument.load(without);
    const pdfWith = await PDFDocument.load(withGuides);
    expect(pdfWith.getPageCount()).toBe(pdfWithout.getPageCount());
  }, 30000);
});
