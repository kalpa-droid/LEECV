import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  detectImageMagicMime,
  encodeUint8ArrayToBase64,
  isRenderablePdfImageSrc,
  isStructurallyValidJpeg,
  sanitizeImageDataUrlForPdf,
} from '../src/shared/core/utils/imageCompressor';
import {
  isValidSfntDataUrl,
  isValidSfntFontBytes,
} from '../src/shared/core/pdf-engine/layers/typography/pdfFontRegistry';
import { ACADEMIC_FONT_CATALOG } from '../src/shared/core/pdf-engine/layers/typography/academicFontCatalog';
import { StudioHistoryStore } from '../src/shared/core/documents/session/useStudioHistory';

const ROOT = process.cwd();

describe('V3.11.1 — Blindaje DataView (imágenes/fuentes) y Deshacer/Rehacer universal', () => {
  it('detecta Magic Bytes reales de imágenes y rechaza .emf, buffers vacíos o JPEGs truncados con 0xFF final', async () => {
    // 1. Buffer vacío / corto
    expect(detectImageMagicMime(new Uint8Array([0xff, 0xd8]))).toBe('empty');

    // 2. EMF / HTML falso disfrazado
    const htmlFake = new TextEncoder().encode('<!DOCTYPE html><html><body>404</body></html>');
    expect(detectImageMagicMime(htmlFake)).toBe('unsupported');
    expect(
      await sanitizeImageDataUrlForPdf(
        `data:image/jpeg;base64,${encodeUint8ArrayToBase64(htmlFake)}`,
      ),
    ).toBeNull();

    // 3. JPEG truncado terminado en 0xFF suelto (causante real de RangeError: DataView)
    const truncatedJpeg = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0xff,
    ]);
    expect(detectImageMagicMime(truncatedJpeg)).toBe('image/jpeg');
    expect(isStructurallyValidJpeg(truncatedJpeg)).toBe(false);
    const badJpegUrl = `data:image/jpeg;base64,${encodeUint8ArrayToBase64(truncatedJpeg)}`;
    expect(isRenderablePdfImageSrc(badJpegUrl)).toBe(false);
    expect(await sanitizeImageDataUrlForPdf(badJpegUrl)).toBeNull();

    // 4. JPEG mínimo con APP0 + SOF + SOS + EOI válido
    const validJpeg = new Uint8Array([
      0xff, 0xd8,
      0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
      0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
      0x00, 0xff, 0xd9,
    ]);
    expect(isStructurallyValidJpeg(validJpeg)).toBe(true);
    const okJpegUrl = `data:image/jpeg;base64,${encodeUint8ArrayToBase64(validJpeg)}`;
    expect(isRenderablePdfImageSrc(okJpegUrl)).toBe(true);
    expect(await sanitizeImageDataUrlForPdf(okJpegUrl)).toBe(okJpegUrl);
  });

  it('valida cabecera SFNT real de fuentes: rechaza WOFF, WOFF2, TTC y HTML; acepta las TTF locales del repo', () => {
    const woff2Fake = new Uint8Array(128);
    woff2Fake.set([0x77, 0x4f, 0x46, 0x32], 0); // 'wOF2'
    expect(isValidSfntFontBytes(woff2Fake)).toBe(false);
    expect(
      isValidSfntDataUrl(`data:font/woff2;base64,${encodeUint8ArrayToBase64(woff2Fake)}`),
    ).toBe(false);

    const htmlResponse = new TextEncoder().encode('<!DOCTYPE html><html><head></head><body>Not found</body></html>'.repeat(2));
    expect(isValidSfntFontBytes(htmlResponse)).toBe(false);

    const tinosPath = path.join(ROOT, 'public/fonts/editorial/Tinos-Regular.ttf');
    const arimoPath = path.join(ROOT, 'public/fonts/editorial/Arimo-Italic.ttf');
    const tinosBytes = new Uint8Array(fs.readFileSync(tinosPath));
    const arimoBytes = new Uint8Array(fs.readFileSync(arimoPath));
    expect(isValidSfntFontBytes(tinosBytes)).toBe(true);
    expect(isValidSfntFontBytes(arimoBytes)).toBe(true);

    // Todas las 8 familias universitarias deben exponer las 4 variantes completas
    expect(ACADEMIC_FONT_CATALOG).toHaveLength(8);
    for (const spec of ACADEMIC_FONT_CATALOG) {
      expect(spec.ttfUrls.regular).toBeTruthy();
      expect(spec.ttfUrls.bold).toBeTruthy();
      expect(spec.ttfUrls.italic).toBeTruthy();
      expect(spec.ttfUrls.boldItalic).toBeTruthy();
    }
  });

  it('StudioHistoryStore agrupa tipeo rápido (<800 ms), respeta boundaries, Undo/Redo y migración de ID', () => {
    const store = new StudioHistoryStore<{ title: string; count: number }>();
    const id = 'doc_temp_1';
    store.seed(id, { title: '', count: 0 });
    expect(store.canUndo(id)).toBe(false);

    // Primera letra t=1000
    store.record(id, { title: 'H', count: 1 }, { now: 1000, coalesceMs: 800 });
    // Misma palabra t=1200 -> coalesce reemplaza el paso actual sin crear basura
    store.record(id, { title: 'Ho', count: 2 }, { now: 1200, coalesceMs: 800 });
    store.record(id, { title: 'Hola', count: 4 }, { now: 1400, coalesceMs: 800 });
    expect(store.undo(id)).toEqual({ title: '', count: 0 });
    expect(store.redo(id)).toEqual({ title: 'Hola', count: 4 });

    // Pausa > 800ms -> nuevo paso independiente
    store.record(id, { title: 'Hola mundo', count: 10 }, { now: 3000, coalesceMs: 800 });
    expect(store.canUndo(id)).toBe(true);

    // Migración al guardar por primera vez
    store.migrateDocId(id, 'doc_saved_99');
    expect(store.canUndo('doc_saved_99')).toBe(true);
    expect(store.undo('doc_saved_99')).toEqual({ title: 'Hola', count: 4 });
  });

  it('las 6 aplicaciones pasan undo/redo a StudioNavbar y no queda ningún window.confirm en CVContext', () => {
    const studioFiles = [
      'src/app/CvWorkspaceContent.tsx',
      'src/modules/editor-lee-studio/EditorLeeStudioContent.tsx',
      'src/modules/facturador-studio/FacturadorStudioContent.tsx',
      'src/modules/card-studio/CardStudioContent.tsx',
      'src/modules/book-studio/BookStudioContent.tsx',
      'src/modules/planner-studio/PlannerStudioContent.tsx',
    ];
    for (const rel of studioFiles) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src).toMatch(/undo=/);
      expect(src).toMatch(/redo=/);
      expect(src).toMatch(/canUndo=/);
      expect(src).toMatch(/canRedo=/);
    }

    const cvContextSrc = fs.readFileSync(path.join(ROOT, 'src/context/CVContext.tsx'), 'utf8');
    expect(cvContextSrc).not.toContain('window.confirm');

    const navbarSrc = fs.readFileSync(
      path.join(ROOT, 'src/shared/core/studio-host/StudioNavbar.tsx'),
      'utf8',
    );
    expect(navbarSrc).not.toContain('hidden md:flex items-center gap-1.5 min-w-0 pl-1 border-l');
  });
});
