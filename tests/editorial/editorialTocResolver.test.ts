import { describe, expect, it } from 'vitest';
import type { EditorialSection } from '../../src/modules/editor-lee-studio/domain/editorialTypes';
import {
  areTocMapsEqual,
  buildResolvedTocPageLabels,
  computeBodyStartPage,
  extractTocAnchorMapFromPageTexts,
  formatEditorialDisplayPageNumber,
  formatTocAnchorToken,
  toLowerRoman,
} from '../../src/modules/editor-lee-studio/domain/editorialTocResolver';

function makeSection(
  id: string,
  title: string,
  sectionKey: string,
  category: EditorialSection['category'],
): EditorialSection {
  return {
    id,
    title,
    sectionKey,
    category,
    visible: true,
    includeInToc: true,
    startNewPage: true,
    position: 0,
    records: [{ id: `${id}_r1`, type: 'paragraph', content: 'Contenido' }],
  };
}

describe('EditorLee Índice Exacto en 2 Pasadas (editorialTocResolver)', () => {
  it('convierte números a romanos en minúsculas correctamente', () => {
    expect(toLowerRoman(1)).toBe('i');
    expect(toLowerRoman(2)).toBe('ii');
    expect(toLowerRoman(4)).toBe('iv');
    expect(toLowerRoman(9)).toBe('ix');
    expect(toLowerRoman(14)).toBe('xiv');
  });

  it('extrae la primera página física exacta para cada marcador __TOC_ID:<id>__', () => {
    const pageTexts = {
      1: 'Portada de prueba',
      2: `Índice General`,
      3: `${formatTocAnchorToken('sec_prologo')} Prólogo breve`,
      5: `${formatTocAnchorToken('sec_cap1')} Capítulo 1 ${formatTocAnchorToken('sec_cap1-sub1')} Subapartado`,
      9: `${formatTocAnchorToken('sec_cap1-sub1')} continuación`,
    };
    const rawMap = extractTocAnchorMapFromPageTexts(pageTexts);
    expect(rawMap).toEqual({
      sec_prologo: 3,
      sec_cap1: 5,
      'sec_cap1-sub1': 5,
    });
  });

  it('asigna folios romanos en preliminares (ii, iii) y reinicia arábigo en 1 al iniciar el cuerpo', () => {
    const sections: EditorialSection[] = [
      makeSection('sec_prologo', 'Prólogo', 'prologo', 'preliminares'),
      makeSection('sec_cap1', 'Capítulo 1', 'capitulo', 'cuerpo'),
      makeSection('sec_cap2', 'Capítulo 2', 'capitulo', 'cuerpo'),
    ];
    const rawMap = {
      sec_prologo: 3,
      sec_cap1: 4,
      'sec_cap1-sub1': 6,
      sec_cap2: 12,
    };

    expect(computeBodyStartPage(sections, rawMap, true)).toBe(4);
    expect(formatEditorialDisplayPageNumber(2, 4, true)).toBe('ii');
    expect(formatEditorialDisplayPageNumber(4, 4, true)).toBe('1');
    expect(formatEditorialDisplayPageNumber(12, 4, true)).toBe('9');

    const resolved = buildResolvedTocPageLabels(sections, rawMap, true);
    expect(resolved.bodyStartPage).toBe(4);
    expect(resolved.map).toEqual({
      sec_prologo: 'iii',
      sec_cap1: '1',
      'sec_cap1-sub1': '3',
      sec_cap2: '9',
    });

    const arabicOnly = buildResolvedTocPageLabels(sections, rawMap, false);
    expect(arabicOnly.bodyStartPage).toBe(1);
    expect(arabicOnly.map.sec_prologo).toBe('3');
    expect(arabicOnly.map.sec_cap2).toBe('12');

    expect(areTocMapsEqual(resolved.map, { ...resolved.map })).toBe(true);
    expect(areTocMapsEqual(resolved.map, arabicOnly.map)).toBe(false);
  });
});
