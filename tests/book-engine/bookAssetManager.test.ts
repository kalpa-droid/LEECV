import { describe, it, expect } from 'vitest';
import {
  bookAssetManager,
  isAssetRef,
  STORAGE_WARN_BYTES,
} from '../../src/modules/book-studio/domain/bookAssetManager';

describe('bookAssetManager — contratos puros', () => {
  it('isAssetRef reconoce solo refs con prefijo asset:', () => {
    expect(isAssetRef('asset:cover-123')).toBe(true);
    expect(isAssetRef('asset:source-pdf-copy-1')).toBe(true);
    expect(isAssetRef('data:image/png;base64,AAAA')).toBe(false);
    expect(isAssetRef('https://ejemplo.com/tapa.png')).toBe(false);
    expect(isAssetRef('')).toBe(false);
    expect(isAssetRef(null)).toBe(false);
    expect(isAssetRef(undefined)).toBe(false);
  });

  it('el umbral de aviso de almacenamiento es ~1 GB', () => {
    expect(STORAGE_WARN_BYTES).toBe(1_000_000_000);
  });

  it('el manager exporta las operaciones esperadas sin tocar IndexedDB al importar', () => {
    expect(typeof bookAssetManager.putFile).toBe('function');
    expect(typeof bookAssetManager.putDataUrl).toBe('function');
    expect(typeof bookAssetManager.getBlobUrl).toBe('function');
    expect(typeof bookAssetManager.getThumbUrl).toBe('function');
    expect(typeof bookAssetManager.remove).toBe('function');
    expect(typeof bookAssetManager.estimateUsage).toBe('function');
    expect(typeof bookAssetManager.clearAll).toBe('function');
    expect(typeof bookAssetManager.pickSourcePdf).toBe('function');
    expect(typeof bookAssetManager.restoreSourcePdf).toBe('function');
    expect(typeof bookAssetManager.requestSourcePdfPermission).toBe('function');
    expect(typeof bookAssetManager.saveSourcePdfCopy).toBe('function');
    expect(typeof bookAssetManager.canUseNativeFilePicker).toBe('function');
  });

  it('en Node (sin showOpenFilePicker) pickSourcePdf devuelve fallback-required', async () => {
    const result = await bookAssetManager.pickSourcePdf();
    expect(result.status).toBe('fallback-required');
  });

  it('en Node (sin indexedDB) restaurar el PDF devuelve no-handle sin tirar', async () => {
    const result = await bookAssetManager.restoreSourcePdf();
    expect(result.status).toBe('no-handle');
  });
});
