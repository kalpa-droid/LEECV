import { describe, it, expect } from 'vitest';
import {
  resolveCanvasColor,
  CANVAS_FALLBACK_HEX,
  COVER_FALLBACK_BG,
  COVER_FALLBACK_TEXT,
} from '../../src/shared/kits/print-imposition/canvasColors';
import { COVER_PRESETS_CATALOG } from '../../src/shared/core/pdf-engine/layers/presets/coverPresetCatalog';

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const CSS_VAR_RE = /var\(\s*(--[a-zA-Z0-9_-]+)/g;

describe('resolveCanvasColor', () => {
  it('pasa un hex directo tal cual', () => {
    expect(resolveCanvasColor('#1a2b3c', COVER_FALLBACK_BG)).toBe('#1a2b3c');
    expect(resolveCanvasColor('#abc', COVER_FALLBACK_BG)).toBe('#abc');
  });

  it('pasa funciones rgb()/hsl() tal cual', () => {
    expect(resolveCanvasColor('rgb(10, 20, 30)', COVER_FALLBACK_BG)).toBe('rgb(10, 20, 30)');
    expect(resolveCanvasColor('hsla(120, 50%, 50%, 0.5)', COVER_FALLBACK_BG)).toBe('hsla(120, 50%, 50%, 0.5)');
  });

  it('pasa nombres de color seguros', () => {
    expect(resolveCanvasColor('white', COVER_FALLBACK_BG)).toBe('white');
    expect(resolveCanvasColor('transparent', COVER_FALLBACK_BG)).toBe('transparent');
  });

  it('string vacío o indefinido devuelve el fallback', () => {
    expect(resolveCanvasColor('', COVER_FALLBACK_BG)).toBe(COVER_FALLBACK_BG);
    expect(resolveCanvasColor('   ', COVER_FALLBACK_BG)).toBe(COVER_FALLBACK_BG);
    expect(resolveCanvasColor(null, COVER_FALLBACK_BG)).toBe(COVER_FALLBACK_BG);
    expect(resolveCanvasColor(undefined, COVER_FALLBACK_BG)).toBe(COVER_FALLBACK_BG);
  });

  it('basura que no es color devuelve el fallback (nunca negro implícito)', () => {
    expect(resolveCanvasColor('esto-no-es-un-color', COVER_FALLBACK_BG)).toBe(COVER_FALLBACK_BG);
    expect(resolveCanvasColor('12 34 56', COVER_FALLBACK_BG)).toBe(COVER_FALLBACK_BG);
  });

  it('resuelve una var() conocida con la tabla de respaldo (entorno sin getComputedStyle real)', () => {
    expect(resolveCanvasColor('var(--color-accent-amber)', COVER_FALLBACK_BG)).toBe('#FFC93C');
    expect(resolveCanvasColor('var(--color-accent-base)', COVER_FALLBACK_BG)).toBe('#FF2E63');
    expect(resolveCanvasColor('var(--ui-btn-outline-bg)', COVER_FALLBACK_BG)).toBe('#FFFFFF');
  });

  it('una var() desconocida devuelve el fallback', () => {
    expect(resolveCanvasColor('var(--color-inexistente-999)', COVER_FALLBACK_BG)).toBe(COVER_FALLBACK_BG);
  });

  it('var() con respaldo inline var(--token, #hex) no se cuela como texto inválido', () => {
    // var(--x, #hex): no matchea como color directo; se intenta resolver --x.
    // Si --x no existe en ninguna parte, cae al fallback (seguro para canvas).
    expect(resolveCanvasColor('var(--x, #abcdef)', COVER_FALLBACK_BG)).toBe(COVER_FALLBACK_BG);
  });
});

describe('Contrato: catálogo de presets de portada', () => {
  it('cada badgeBg/badgeTextColor resuelve a un hex válido y nunca a #000000', () => {
    for (const preset of COVER_PRESETS_CATALOG) {
      const bg = resolveCanvasColor(preset.badgeBg, COVER_FALLBACK_BG);
      const fg = resolveCanvasColor(preset.badgeTextColor, COVER_FALLBACK_TEXT);
      expect(HEX_RE.test(bg), `${preset.id} badgeBg`).toBe(true);
      expect(HEX_RE.test(fg), `${preset.id} badgeTextColor`).toBe(true);
      expect(bg.toLowerCase(), `${preset.id} badgeBg`).not.toBe('#000000');
      expect(fg.toLowerCase(), `${preset.id} badgeTextColor`).not.toBe('#000000');
    }
  });

  it('todas las variables var(--...) usadas por el catálogo tienen respaldo en CANVAS_FALLBACK_HEX', () => {
    const usedVars = new Set<string>();
    for (const preset of COVER_PRESETS_CATALOG) {
      for (const value of [preset.badgeBg, preset.badgeTextColor]) {
        for (const match of value.matchAll(CSS_VAR_RE)) {
          usedVars.add(match[1]);
        }
      }
    }
    for (const varName of usedVars) {
      expect(CANVAS_FALLBACK_HEX[varName], `falta respaldo para ${varName}`).toMatch(HEX_RE);
    }
  });
});
