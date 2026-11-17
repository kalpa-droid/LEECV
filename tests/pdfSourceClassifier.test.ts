/**
 * Tests del clasificador tipado de PDFs problemáticos (pdfSourceClassifier.ts).
 *
 * Cada código estable mapea una causa real de falla al cargar el PDF origen
 * del Book Studio: archivo vacío, contraseña de apertura, PDF dañado,
 * archivo no encontrado, PDF sin páginas o error desconocido.
 */
import { describe, it, expect } from 'vitest';
import {
  PdfSourceError,
  classifyPdfSourceError,
  isPdfSourceError,
  pdfSourceErrorFromUnknown,
} from '../src/shared/core/book-engine/pdfSourceClassifier';

const namedError = (name: string, message = '') => {
  const err = new Error(message);
  err.name = name;
  return err;
};

describe('classifyPdfSourceError', () => {
  it('archivo de 0 bytes → empty-file (aunque el parseo ni empiece)', () => {
    expect(classifyPdfSourceError(new Error('cualquier cosa'), 0)).toBe('empty-file');
  });

  it('PasswordException de pdf.js → password', () => {
    expect(classifyPdfSourceError(namedError('PasswordException'))).toBe('password');
  });

  it('InvalidPDFException de pdf.js → corrupt', () => {
    expect(classifyPdfSourceError(namedError('InvalidPDFException'))).toBe('corrupt');
  });

  it('MissingPDFException de pdf.js → missing', () => {
    expect(classifyPdfSourceError(namedError('MissingPDFException'))).toBe('missing');
  });

  it('error sin tipo conocido → unknown', () => {
    expect(classifyPdfSourceError(new Error('boom'))).toBe('unknown');
    expect(classifyPdfSourceError(null)).toBe('unknown');
    expect(classifyPdfSourceError(undefined)).toBe('unknown');
    expect(classifyPdfSourceError('string loca')).toBe('unknown');
  });

  it('fileSize distinto de 0 NO fuerza empty-file: gana el nombre de la excepción', () => {
    expect(classifyPdfSourceError(namedError('PasswordException'), 12345)).toBe('password');
  });
});

describe('PdfSourceError / pdfSourceErrorFromUnknown', () => {
  it('el error tipado conserva su código y su name', () => {
    const err = new PdfSourceError('password');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('PdfSourceError');
    expect(err.code).toBe('password');
    expect(isPdfSourceError(err)).toBe(true);
  });

  it('pdfSourceErrorFromUnknown NO re-envuelve los ya tipados', () => {
    const original = new PdfSourceError('empty-file');
    expect(pdfSourceErrorFromUnknown(original)).toBe(original);
  });

  it('envuelve errores crudos preservando el detalle como mensaje', () => {
    const wrapped = pdfSourceErrorFromUnknown(namedError('InvalidPDFException', 'estructura rota'));
    expect(wrapped.code).toBe('corrupt');
    expect(wrapped.message).toContain('estructura rota');
  });

  it('fileSize 0 predomina sobre el error crudo', () => {
    const wrapped = pdfSourceErrorFromUnknown(namedError('PasswordException'), 0);
    expect(wrapped.code).toBe('empty-file');
  });
});
