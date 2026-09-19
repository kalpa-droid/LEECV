import { describe, it, expect } from 'vitest';
import { findJargon, looksLikeProse } from '../src/shared/core/plainLanguage';
import { scanSource, scanPlainText, scanRepo } from '../scripts/check-plain-language';

/**
 * Lenguaje sencillo: LEECV es para gente común. La página habla de "imprimir en tu casa"
 * o "llevarlo a una imprenta"; nunca de vectorial, tamaños de hoja ni jerga de imprenta.
 */
describe('motor de lenguaje sencillo — reglas', () => {
  const jerga: Array<[string, string]> = [
    ['Exportación vectorial lista para imprenta', 'vectorial'],
    ['Diseños vectoriales', 'vectorial'],
    ['Calidad Imprenta Pro', 'imprenta-pro'],
    ['Estándar de Imprenta Profesional', 'imprenta-pro'],
    ['Creado con calidad de imprenta', 'imprenta-pro'],
    ['Tamaño de hoja de impresión', 'tamano-de-pagina'],
    ['Formato de papel', 'tamano-de-pagina'],
    ['Hojas físicas de papel', 'tamano-de-pagina'],
    ['Imprimí en hojas A4 y doblá al medio', 'a4-a3-a5'],
    ['Hoja A3 grande', 'a4-a3-a5'],
    ['Tarjeta de 85 × 55 mm', 'medidas-en-mm'],
    ['Sangrado de imprenta', 'sangrado'],
    ['Deja 3mm de sangría', 'sangrado'],
    ['Con marcas de corte incluidas', 'marcas-de-corte'],
    ['Imposición de pliegos', 'imposicion'],
    ['Descargá tu PDF nativo', 'pdf-tecnico'],
    ['Renderizado en tu navegador', 'pdf-tecnico'],
    ['Alta resolución a 300 DPI', 'resolucion'],
  ];
  it.each(jerga)('detecta la jerga en «%s»', (texto, regla) => {
    expect(findJargon(texto).map(v => v.ruleId)).toContain(regla);
  });

  const criollo = [
    'Imprimilo en tu casa, en tu impresora',
    'Llevalo a una imprenta',
    'Descargá tu PDF listo para imprimir',
    'Hoja común (la de tu impresora)',
    'Hoja grande (para imprenta)',
    'Margen extra para el corte',
    'Líneas guía para recortar',
    'Armá tu currículum, tus tarjetas y tus libros',
    'Se ve nítido al imprimir',
    'Tu nivel de inglés: A1, A2, B1 o C1',
  ];
  it.each(criollo)('deja pasar «%s»', texto => {
    expect(findJargon(texto)).toEqual([]);
  });

  it('cada regla dice cómo decirlo en criollo', () => {
    for (const v of findJargon('Exportación vectorial A4 con sangrado')) expect(v.say.length).toBeGreaterThan(10);
  });

  it('PAGE_SIZES diferencia label (Ámbito 1 - sin jerga) y appLabel (Ámbito 2 - con especificación técnica)', async () => {
    const { PAGE_SIZES } = await import('../src/shared/core/pdf-engine/layers/page/pageSizes');
    for (const size of Object.values(PAGE_SIZES)) {
      expect(findJargon(size.label)).toEqual([]);
      expect(size.appLabel).toContain('(');
    }
  });

  it('looksLikeProse distingue un texto de un código interno como A4', () => {
    expect(looksLikeProse('A4')).toBe(false);
    expect(looksLikeProse('Hoja A4')).toBe(true);
  });
});

describe('motor de lenguaje sencillo — escáner', () => {
  it('marca texto visible en JSX, props y catálogos, y respeta códigos internos, comentarios y consola', () => {
    expect(scanSource('a.tsx', '<p>Exportá tu archivo vectorial</p>')).toHaveLength(1);
    expect(scanSource('a.tsx', '<Modal title="Ajustar a Hoja A4" />')).toHaveLength(1);
    expect(scanSource('src/shared/i18n/catalog/x.ts', "export const c = { a: 'Hoja A4' };")).toHaveLength(1);
    expect(scanSource('a.ts', "const size = 'A4'; if (size === 'A3') {}")).toHaveLength(0);
    expect(scanSource('a.ts', '// motor vectorial\nconst x = 1;')).toHaveLength(0);
    expect(scanSource('a.ts', "console.log('render vectorial');")).toHaveLength(0);
    expect(scanSource('a.ts', "// plain-language:allow\nconst t = 'Bleed box interno';")).toHaveLength(0);
  });

  it('en archivos públicos ignora las URL (los slugs no son texto visible)', () => {
    expect(scanPlainText('x.html', '<title>PDF A4 vectorial</title>').length).toBeGreaterThan(0);
    expect(scanPlainText('x.xml', '<loc>https://leecv.app/blog/guia-imposicion-libros</loc>')).toHaveLength(0);
  });

  it('TODA la página está en lenguaje sencillo (0 palabras técnicas de imprenta en textos visibles)', () => {
    const { findings, fileCount } = scanRepo();
    expect(fileCount).toBeGreaterThan(100);
    const resumen = findings.map(f => `${f.file}:${f.line} «${f.violation.match}» (${f.violation.ruleId})`);
    expect(resumen).toEqual([]);
  }, 30000);
});
