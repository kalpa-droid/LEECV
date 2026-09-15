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
    expect(sanitizeFontFamily('Times New Roman', false, true)).toBe('Helvetica-Oblique'); // Times no registrado aún, cae a Helvetica
    expect(sanitizeFontFamily('Courier New', false, true)).toBe('Helvetica-Oblique'); // Courier no registrado aún, cae a Helvetica
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
