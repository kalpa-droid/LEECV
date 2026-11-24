import { describe, expect, it } from 'vitest';
import {
  detectUnsafeWinAnsiChars,
  parseInlineRichRuns,
  preventParagraphRunts,
  sanitizeEditorialText,
  stripTrailingHeaderPunctuation,
} from '../../src/modules/editor-lee-studio/domain/editorialTypographyEngine';

describe('EditorLee Motor Tipográfico (editorialTypographyEngine)', () => {
  it('preserva espacios duros (\\u00A0) y puntuación Unicode auténtica (©, «, », —, ·)', () => {
    const raw = 'Derechos\u00A0©\u00A02026 — <<< cita clásica >>> · nota';
    const clean = sanitizeEditorialText(raw, {
      preserveLineBreaks: false,
      targetFontIsUnicode: true,
      preserveDiamondGlyph: true,
    });
    expect(clean).toBe('Derechos\u00A0©\u00A02026 — «cita clásica» · nota');
  });

  it('conserva todos los saltos de verso y estrofas en poemas cuando preserveLineBreaks es true', () => {
    const poem = 'Primer verso del alba\nSegundo verso con   espacios\n\nEstrofa siguiente\nÚltima línea';
    const clean = sanitizeEditorialText(poem, {
      preserveLineBreaks: true,
      targetFontIsUnicode: true,
    });
    expect(clean).toBe('Primer verso del alba\nSegundo verso con espacios\n\nEstrofa siguiente\nÚltima línea');
  });

  it('limpia puntuación espuria en encabezados corrientes pero preserva abreviaturas y puntos suspensivos', () => {
    expect(stripTrailingHeaderPunctuation('Mi obra.')).toBe('Mi obra');
    expect(stripTrailingHeaderPunctuation('Capítulo 1: Marco teórico;')).toBe('Capítulo 1: Marco teórico');
    expect(stripTrailingHeaderPunctuation('Dr.')).toBe('Dr.');
    expect(stripTrailingHeaderPunctuation('etc.')).toBe('etc.');
    expect(stripTrailingHeaderPunctuation('Hacia el final...')).toBe('Hacia el final...');
  });

  it('previene palabras huérfanas al final del párrafo (runts) insertando \\u00A0', () => {
    const p = 'Este capítulo analiza en profundidad las emociones escolares hoy.';
    const shielded = preventParagraphRunts(p);
    expect(shielded).toBe('Este capítulo analiza en profundidad las emociones escolares\u00A0hoy.');
    // Un párrafo ya protegido mantiene su \u00A0 intacto tras sanitizeEditorialText(..., { preventRunts: false })
    expect(sanitizeEditorialText(shielded, { preventRunts: false })).toBe(shielded);
  });

  it('parsea negritas, cursivas, combinados, diamante ◆ y superíndices [^N]', () => {
    const runs = parseInlineRichRuns('Texto **negrita** y *cursiva* con ***ambas*** ◆ y nota[^2].');
    expect(runs).toEqual([
      { text: 'Texto ' },
      { text: 'negrita', bold: true },
      { text: ' y ' },
      { text: 'cursiva', italic: true },
      { text: ' con ' },
      { text: 'ambas', bold: true, italic: true },
      { text: ' ' },
      { text: '◆', isDiamond: true },
      { text: ' y nota' },
      { text: '2', footnoteNumber: 2 },
      { text: '.' },
    ]);
  });

  it('detecta caracteres problemáticos para WinAnsi y aplica respaldo seguro cuando no hay TTF Unicode', () => {
    const unsafe = detectUnsafeWinAnsiChars('Bloque ◆ ≥ 10 → ✓');
    expect(unsafe).toEqual(expect.arrayContaining(['◆', '≥', '→', '✓']));

    const winAnsiSafe = sanitizeEditorialText('Valor α ≥ 10 → ok', {
      targetFontIsUnicode: false,
    });
    expect(winAnsiSafe).toBe('Valor alpha >= 10 -> ok');
  });
});
