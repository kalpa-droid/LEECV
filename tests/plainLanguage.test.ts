import { describe, it, expect } from 'vitest';
import { findJargon, looksLikeProse, zoneOfPath, stripParentheticals } from '../src/shared/core/plainLanguage';
import { PAGE_SIZES } from '../src/shared/core/pdf-engine/layers/page/pageSizes';
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

describe('dos zonas: pública (cero jerga) y app (nombre técnico entre paréntesis)', () => {
  it('zoneOfPath: landing, blog, SEO, share, cookies y archivos públicos son zona pública; el resto, app', () => {
    for (const p of [
      'src/modules/landing/LandingPage.tsx', 'src/modules/blog/BlogModule.tsx',
      'src/shared/i18n/catalog/landing.ts', 'src/shared/core/seo/seoIndexingEngine.ts',
      'src/shared/core/ui/marketing/HeroProductPreview.tsx', 'src/shared/core/ui/CookieConsentBanner.tsx',
      'src/modules/cv-builder/components/modals/ShareAppModal.tsx', 'index.html', 'public/manifest.json', 'metadata.json',
    ]) expect(zoneOfPath(p), p).toBe('public');
    for (const p of [
      'src/modules/cv-builder/components/editor/sections/DisenoSection.tsx',
      'src/modules/book-studio/BookPreviewExportStep.tsx', 'src/shared/i18n/catalog/bookStudio.ts', 'src/app/App.tsx',
    ]) expect(zoneOfPath(p), p).toBe('app');
  });

  it('stripParentheticals quita el contenido entre paréntesis, también anidado', () => {
    expect(stripParentheticals('Hoja común (A4)')).toBe('Hoja común ');
    expect(stripParentheticals('Libro (hoja (A4) doblada)')).toBe('Libro ');
  });

  it('APP: el nombre técnico entre paréntesis está permitido; suelto, no', () => {
    for (const ok of [
      'Hoja común (A4)', 'Hoja grande (A3)', 'Hoja carta (21,6 × 27,9 cm)',
      'Margen extra para el corte (sangrado)', 'Líneas guía para recortar (marcas de corte)',
      'Clásica, Argentina / EE. UU. (89 × 51 mm)', 'En una imprenta (hoja A3)', 'Armado del libro (imposición)',
    ]) expect(findJargon(ok, 'app'), ok).toEqual([]);
    for (const mal of ['Imprimí en hojas A4', 'Sangrado de imprenta', 'Tarjeta de 85 × 55 mm', 'Tamaño de hoja de impresión'])
      expect(findJargon(mal, 'app').length, mal).toBeGreaterThan(0);
  });

  it('APP: vectorial, "imprenta pro", PDF nativo y DPI siguen prohibidos incluso entre paréntesis', () => {
    for (const mal of ['Hoja común (vectorial)', 'Calidad Imprenta Pro', 'Descargá tu PDF nativo (A4)', 'Exportar a 300 DPI'])
      expect(findJargon(mal, 'app').length, mal).toBeGreaterThan(0);
  });

  it('APP: cada aviso trae un ejemplo de cómo escribirlo bien', () => {
    const v = findJargon('Imprimí en hojas A4', 'app')[0];
    expect(v.example).toBe('Hoja común (A4)');
  });

  it('PÚBLICA: ni siquiera entre paréntesis (la landing no explica tamaños)', () => {
    expect(findJargon('Hoja común (A4)', 'public').map(v => v.ruleId)).toContain('a4-a3-a5');
  });

  it('el escáner aplica la zona según el archivo', () => {
    const code = "const t = 'Hoja común (A4)';";
    expect(scanSource('src/modules/cv-builder/x.ts', code)).toHaveLength(0);
    expect(scanSource('src/modules/blog/x.ts', code)).toHaveLength(1);
  });

  it('doble ámbito en cada hoja/tarjeta: `label` (público) sin jerga y `appLabel` (app) con el nombre técnico entre paréntesis', () => {
    const sizes = Object.values(PAGE_SIZES) as Array<{ id: string; label: string; appLabel: string }>;
    for (const size of sizes) {
      expect(findJargon(size.label, 'public'), `label de ${size.id}`).toEqual([]);
      expect(findJargon(size.appLabel, 'app'), `appLabel de ${size.id}`).toEqual([]);
    }
    expect(sizes.find(x => x.id === 'a4')!.appLabel).toMatch(/^Hoja común \(A4/);
    expect(sizes.find(x => x.id === 'a3')!.appLabel).toMatch(/^Hoja grande \(A3/);
  });
});
