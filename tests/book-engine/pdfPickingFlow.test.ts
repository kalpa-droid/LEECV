import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isPdfLikeFile,
  isFatalPdfLoadError,
} from '../../src/shared/core/pdf-engine/pdfSourceClassifier';
import {
  bookAssetManager,
  isNativePickerFailedSession,
  markNativePickerFailedSession,
  resetNativePickerFailedSession,
} from '../../src/modules/book-studio/domain/bookAssetManager';

/** window same-origin simulado: self === top (como una ventana principal). */
function stubNativeWindow(showOpenFilePicker?: unknown) {
  const w: Record<string, unknown> = {};
  w.self = w;
  w.top = w;
  if (showOpenFilePicker) w.showOpenFilePicker = showOpenFilePicker;
  vi.stubGlobal('window', w);
  return w;
}

describe('isPdfLikeFile', () => {
  it('acepta por tipo MIME aunque el nombre no termine en .pdf', () => {
    expect(isPdfLikeFile({ name: 'documento', type: 'application/pdf' })).toBe(true);
    expect(isPdfLikeFile({ name: 'SIN-EXTENSION', type: 'application/pdf' })).toBe(true);
  });

  it('acepta por extensión aunque no haya tipo MIME', () => {
    expect(isPdfLikeFile({ name: 'libro.PDF', type: '' })).toBe(true);
    expect(isPdfLikeFile({ name: 'libro.pdf' })).toBe(true);
  });

  it('rechaza lo que no parece un PDF', () => {
    expect(isPdfLikeFile({ name: 'foto.png', type: 'image/png' })).toBe(false);
    expect(isPdfLikeFile({ name: 'notas.txt', type: '' })).toBe(false);
    expect(isPdfLikeFile({})).toBe(false);
    expect(isPdfLikeFile(null)).toBe(false);
    expect(isPdfLikeFile(undefined)).toBe(false);
  });
});

describe('isFatalPdfLoadError', () => {
  it('PasswordException e InvalidPDFException son fatales (sin reintento de cMaps)', () => {
    expect(isFatalPdfLoadError({ name: 'PasswordException' })).toBe(true);
    expect(isFatalPdfLoadError({ name: 'InvalidPDFException' })).toBe(true);
  });

  it('MissingPDFException y errores desconocidos no son fatales', () => {
    expect(isFatalPdfLoadError({ name: 'MissingPDFException' })).toBe(false);
    expect(isFatalPdfLoadError({ name: 'UnknownErrorException' })).toBe(false);
    expect(isFatalPdfLoadError(new Error('boom'))).toBe(false);
    expect(isFatalPdfLoadError(null)).toBe(false);
  });
});

describe('pickSourcePdf en entorno sin selector usable', () => {
  beforeEach(() => {
    resetNativePickerFailedSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetNativePickerFailedSession();
  });

  it('showOpenFilePicker rechazando SecurityError devuelve fallback-required y marca la sesión', async () => {
    stubNativeWindow(vi.fn().mockRejectedValue({ name: 'SecurityError' }));
    const result = await bookAssetManager.pickSourcePdf();
    expect(result.status).toBe('fallback-required');
    expect(isNativePickerFailedSession()).toBe(true);
  });

  it('showOpenFilePicker rechazando NotAllowedError devuelve fallback-required', async () => {
    stubNativeWindow(vi.fn().mockRejectedValue({ name: 'NotAllowedError' }));
    const result = await bookAssetManager.pickSourcePdf();
    expect(result.status).toBe('fallback-required');
    expect(isNativePickerFailedSession()).toBe(true);
  });

  it('AbortError (usuario cerró el diálogo) devuelve cancelled y NO marca la sesión', async () => {
    stubNativeWindow(vi.fn().mockRejectedValue({ name: 'AbortError' }));
    const result = await bookAssetManager.pickSourcePdf();
    expect(result.status).toBe('cancelled');
    expect(isNativePickerFailedSession()).toBe(false);
  });

  it('sin window.showOpenFilePicker devuelve fallback-required', async () => {
    stubNativeWindow(undefined);
    const result = await bookAssetManager.pickSourcePdf();
    expect(result.status).toBe('fallback-required');
    expect(isNativePickerFailedSession()).toBe(true);
  });

  it('markNativePickerFailedSession / resetNativePickerFailedSession controlan la bandera', () => {
    expect(isNativePickerFailedSession()).toBe(false);
    markNativePickerFailedSession();
    expect(isNativePickerFailedSession()).toBe(true);
    resetNativePickerFailedSession();
    expect(isNativePickerFailedSession()).toBe(false);
  });
});
