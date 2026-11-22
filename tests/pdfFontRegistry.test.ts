import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { sanitizeFontFamily } from '../src/shared/core/pdf-engine/layers/typography/pdfFontRegistry';
import { resolveUnifiedTextSpec } from '../src/shared/core/pdf-engine/layers/typography/unifiedTextHierarchyEngine';

const PDF_ENGINE_DIR = join(__dirname, '../src/shared/core/pdf-engine');

function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walkFiles(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe('pdfFontRegistry — resolución de fuentes itálicas', () => {
  it('1. sanitizeFontFamily con isItalic=true devuelve la variante Oblique/Italic correcta, nunca la familia base + un flag aparte', () => {
    expect(sanitizeFontFamily('Helvetica', false, true)).toBe('Helvetica-Oblique');
    expect(sanitizeFontFamily('Helvetica', true, true)).toBe('Helvetica-BoldOblique');
    expect(sanitizeFontFamily('Times New Roman', false, false)).toBe('Times-Roman');
    expect(sanitizeFontFamily('Times New Roman', true, false)).toBe('Times-Bold');
    expect(sanitizeFontFamily('Times New Roman', false, true)).toBe('Times-Italic');
    expect(sanitizeFontFamily('Times New Roman', true, true)).toBe('Times-BoldItalic');
    expect(sanitizeFontFamily('Georgia', false, false)).toBe('Times-Roman');
    expect(sanitizeFontFamily('Arial', true, false)).toBe('Helvetica-Bold');
    expect(sanitizeFontFamily('Courier New', false, true)).toBe('Helvetica-Oblique'); // Courier cae a Helvetica segura
  });

  it('1b. EditorialPdfDocument genera PDF sin error de fuente no registrada incluso con Times New Roman o Arial', async () => {
    const React = await import('react');
    const { pdf } = await import('@react-pdf/renderer');
    const { EditorialPdfDocument } = await import('../src/modules/editor-lee-studio/pdf/EditorialPdfDocument');

    const docEl = React.createElement(EditorialPdfDocument, {
      data: {
        metadata: { title: 'Obra de Prueba', author: 'Valeria' },
        design: {
          pageSize: 'a5',
          margins: { top: 20, bottom: 20, left: 20, right: 20, gutter: 20 },
          typography: { fontFamily: 'Times New Roman', fontSize: 11, lineHeight: 1.5 },
          pageNumbers: true,
          headersEvenOdd: true,
          coverMode: 'libro',
        },
        sections: [
          {
            id: 'sec_1',
            title: 'Capítulo 1',
            visible: true,
            includeInToc: true,
            startNewPage: true,
            position: 0,
            records: [{ id: 'r1', type: 'paragraph', content: 'Texto inicial de prueba.' }],
          },
        ],
        cover: { mode: 'libro', title: 'Obra de Prueba' },
        tocConfig: { enabled: true, title: 'Índice', showSubtitles: true, position: 'tras-caratula' },
        manifestRules: {
          preserveScenes: true,
          preservePoems: true,
          preserveCitations: true,
          typographyCleanup: true,
          qrQuietZone: 4,
          qrMinSize: 20,
        },
      },
      preset: 'libro-ensayo-novela',
      interactiveAnchors: true,
    });

    const blob = await pdf(docEl as any).toBlob();
    expect(blob.size).toBeGreaterThan(200);
  });

  it('2. resolveUnifiedTextSpec en nivel "meta" resuelve fontFamily a una variante itálica real', () => {
    const spec = resolveUnifiedTextSpec('meta', '#ffffff', { text: '#000000', primary: '#000', background: '#fff' } as any, { fontFamily: 'Helvetica' } as any, 'test-meta');
    expect(spec.fontFamily).toMatch(/Oblique|Italic/);
    expect(spec.fontStyle).toBe('italic');
  });

  it('3. REGRESIÓN — ningún archivo del motor de PDF vuelve a escribir fontStyle: \'italic\' a mano en un objeto de estilo. Causa real confirmada del error "Could not resolve font for Helvetica-Oblique, fontWeight 400, fontStyle italic": una familia YA resuelta a su variante itálica (vía sanitizeFontFamily/resolveUnifiedTextSpec) combinada con un fontStyle: \'italic\' hardcodeado aparte — @react-pdf/renderer no tiene registrada esa combinación. La corrección es siempre resolver la itálica a través de la familia (sanitizeFontFamily(..., true) o un spec en nivel "meta"), nunca escribir fontStyle a mano.', () => {
    const files = walkFiles(PDF_ENGINE_DIR);
    const offenders: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      if (/fontStyle:\s*'italic'/.test(content)) {
        offenders.push(file.replace(PDF_ENGINE_DIR, 'pdf-engine'));
      }
    }

    expect(offenders).toEqual([]);
  });
});
