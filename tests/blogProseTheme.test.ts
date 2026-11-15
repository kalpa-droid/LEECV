/**
 * Regresión: el blog pinta su prosa con los tokens del tema LEECV.
 * `dark:prose-invert` obedecía a prefers-color-scheme del SO (no a
 * data-ui-theme) y dejaba el texto ilegible en la mitad de las
 * combinaciones SO × tema. `.prose-leecv` re-mapea las variables de
 * @tailwindcss/typography a los tokens reales; este test impide que
 * el bug vuelva.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const css = fs.readFileSync(path.join(ROOT, 'src', 'index.css'), 'utf8');
const blog = fs.readFileSync(path.join(ROOT, 'src', 'modules', 'blog', 'BlogModule.tsx'), 'utf8');

describe('.prose-leecv — prosa del blog vinculada a los tokens de tema', () => {
  it('index.css define .prose-leecv mapeando las variables críticas de prose', () => {
    const match = css.match(/\.prose-leecv\s*\{([\s\S]*?)\}/);
    expect(match, '.prose-leecv no encontrada en index.css').toBeTruthy();
    const block = match![1];
    const required = [
      '--tw-prose-body',
      '--tw-prose-headings',
      '--tw-prose-bold',
      '--tw-prose-links',
      '--tw-prose-bullets',
      '--tw-prose-quotes',
      '--tw-prose-quote-borders',
      '--tw-prose-captions',
      '--tw-prose-code',
      '--tw-prose-pre-bg',
      '--tw-prose-th-borders',
      '--tw-prose-td-borders',
      '--tw-prose-hr',
      // Capa invert: nunca blanco sobre claro ni negro sobre oscuro.
      '--tw-prose-invert-body',
      '--tw-prose-invert-headings',
      '--tw-prose-invert-bold',
      '--tw-prose-invert-links',
      '--tw-prose-invert-pre-bg',
    ];
    for (const v of required) {
      expect(block, `falta ${v} en .prose-leecv`).toContain(v);
    }
  });

  it('la prosa usa los tokens del tema, no colores fijos', () => {
    const match = css.match(/\.prose-leecv\s*\{([\s\S]*?)\}/)!;
    const block = match[1];
    // Ninguna variable debe apuntar a hexes sueltos: sólo var(--*) o transparent.
    const assignments = block.split(';').map((s) => s.trim()).filter(Boolean);
    for (const a of assignments) {
      const [, value] = a.split(':');
      const v = (value || '').trim();
      expect(v === 'transparent' || v.startsWith('var(--'), `valor no vinculado a token: ${a}`).toBe(true);
    }
  });

  it('BlogModule no usa dark:prose-invert ni accent-base como texto sobre hover', () => {
    expect(blog).not.toContain('dark:prose-invert');
    expect(blog).toContain('prose-leecv');
    expect(blog).not.toContain('group-hover:text-[var(--color-accent-base)]');
    expect(blog).not.toContain('hover:text-[var(--color-accent-base)]');
  });

  it('el header del blog ofrece el selector de tema (ThemeToggleButton)', () => {
    expect(blog).toContain('ThemeToggleButton');
    expect(blog).toContain('cycleGlobalUiTheme');
  });
});
