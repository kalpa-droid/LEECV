import { describe, expect, it } from 'vitest';
import {
  EDITORIAL_PRESET_CATALOG,
  EDITORIAL_PRESET_GROUPS,
  EDITORIAL_PRIMARY_PRESETS,
  applyEditorialPresetToDraft,
} from '../../src/modules/editor-lee-studio/domain/editorialPresetCatalog';
import {
  EDITORIAL_STRUCTURAL_NORMS,
  resolveEditorialNormMetrics,
} from '../../src/modules/editor-lee-studio/domain/editorialNormEngine';
import {
  BIBLIOGRAPHY_NORM_GUIDES,
  formatEditorialCitation,
} from '../../src/modules/editor-lee-studio/domain/editorialCitationFormatter';
import { EDITORIAL_PRESETS } from '../../src/modules/editor-lee-studio/pdf/editorialPresets';
import type { EditorialRecord } from '../../src/modules/editor-lee-studio/domain/editorialTypes';

describe('Catálogo de 12 Formatos Editoriales y Paridad PDF', () => {
  it('expone exactamente 12 formatos principales agrupados en 3 familias más los 3 alias heredados', () => {
    expect(EDITORIAL_PRESET_GROUPS.map((g) => g.id)).toEqual(['literario', 'academico', 'practico']);
    expect(EDITORIAL_PRIMARY_PRESETS).toHaveLength(12);
    expect(EDITORIAL_PRESET_CATALOG).toHaveLength(15);

    const legacyAliases = EDITORIAL_PRESET_CATALOG.filter((p) => p.isLegacyAlias);
    expect(legacyAliases.map((p) => p.id)).toEqual([
      'tp-secundaria',
      'cientifico-vancouver',
      'trabajo-practico-monografia-tesis',
    ]);
  });

  it('mantiene paridad 1-a-1 entre EDITORIAL_PRESET_CATALOG y el registro PDF EDITORIAL_PRESETS', () => {
    const pdfIds = new Set(EDITORIAL_PRESETS.map((p) => p.id));
    for (const preset of EDITORIAL_PRESET_CATALOG) {
      expect(pdfIds.has(preset.id)).toBe(true);
    }
    expect(EDITORIAL_PRESETS.every((p) => p.pageCategory === 'editorial')).toBe(true);
  });
});

describe('Normas Estructurales Exactas (APA 7 / Chicago / MLA / Libre)', () => {
  it('define márgenes exactos de 25.4 mm (1 pulgada) y sangría 36 pt en APA 7, Chicago y MLA con 0 pt tras párrafo', () => {
    for (const normId of ['apa7', 'chicago', 'mla'] as const) {
      const spec = EDITORIAL_STRUCTURAL_NORMS[normId];
      expect(spec.designDefaults.marginTop).toBe(25.4);
      expect(spec.designDefaults.marginBottom).toBe(25.4);
      expect(spec.designDefaults.marginRight).toBe(25.4);
      expect(spec.designDefaults.gutter).toBe(25.4);

      const metrics = resolveEditorialNormMetrics({
        design: { structuralNormId: normId, firstLineIndent: true },
      });
      expect(metrics.marginsMm.top).toBe(25.4);
      expect(metrics.firstLineIndentPt).toBe(36);
      expect(metrics.paragraphSpacingAfterPt).toBe(0);
      expect(metrics.hangingIndentPt).toBe(36);
      expect(metrics.suppressFirstParagraphIndent).toBe(false);
    }
  });

  it('diferencia reglas específicas entre APA 7, Chicago y MLA (citas en bloque, bibliografía y folios)', () => {
    const apa = resolveEditorialNormMetrics({ design: { structuralNormId: 'apa7' } });
    expect(apa.bibliographyHeading).toBe('Referencias');
    expect(apa.bibliographyHeadingCentered).toBe(true);
    expect(apa.bibliographyLineHeight).toBe(2.0);
    expect(apa.pageNumberPlacement).toBe('top-right');

    const chicago = resolveEditorialNormMetrics({ design: { structuralNormId: 'chicago' } });
    expect(chicago.blockQuoteLineHeight).toBe(1.0);
    expect(chicago.bibliographyLineHeight).toBe(1.0);
    expect(chicago.bibliographyEntryGapPt).toBe(10);
    expect(chicago.bibliographyHeading).toBe('Bibliografía');

    const mla = resolveEditorialNormMetrics({ design: { structuralNormId: 'mla' } });
    expect(mla.bibliographyHeading).toBe('Obras citadas');
    expect(mla.bibliographyHeadingCentered).toBe(true);
    expect(mla.mlaAuthorSurnameHeader).toBe(true);
    expect(mla.pageNumberPlacement).toBe('top-right');
  });

  it('en novela literaria aplica sangría clásica 14 pt y suprime sangría en primer párrafo tras encabezado', () => {
    const draft = applyEditorialPresetToDraft({ sections: [] }, 'novela-literaria', 'apply-design');
    const metrics = resolveEditorialNormMetrics(draft);
    expect(metrics.firstLineIndentPt).toBe(14);
    expect(metrics.suppressFirstParagraphIndent).toBe(true);
    expect(metrics.paragraphSpacingAfterPt).toBe(6);
  });
});

describe('Los 7 Estilos Bibliográficos Exactos', () => {
  const sampleBook: EditorialRecord = {
    id: 'bib_1',
    type: 'bibliography_item',
    content: '',
    bibSourceType: 'libro',
    bibAuthor: 'Eco, Umberto',
    bibYear: '1977',
    bibTitle: 'Cómo se hace una tesis',
    bibEditorial: 'Gedisa',
    bibCity: 'Barcelona',
  };

  const sampleArticle: EditorialRecord = {
    id: 'bib_2',
    type: 'bibliography_item',
    content: '',
    bibSourceType: 'articulo',
    bibAuthor: 'Pekrun, Reinhard',
    bibYear: '2006',
    bibTitle: 'The Control-Value Theory of Achievement Emotions',
    bibJournal: 'Educational Psychology Review',
    bibVolume: '18',
    bibIssue: '4',
    bibPages: '315-341',
    bibDoiOrUrl: 'https://doi.org/10.1007/s10648-006-9029-9',
  };

  it('soporta los 7 estilos con segmento en cursiva en cada uno', () => {
    const styles = ['apa7', 'vancouver', 'ieee', 'harvard', 'chicago', 'mla', 'tradicional'] as const;
    expect(Object.keys(BIBLIOGRAPHY_NORM_GUIDES).sort()).toEqual([...styles].sort());

    for (const style of styles) {
      const formattedBook = formatEditorialCitation(sampleBook, style, 0);
      const formattedArticle = formatEditorialCitation(sampleArticle, style, 0);
      expect(formattedBook.italicSegment?.length).toBeGreaterThan(0);
      expect(formattedArticle.italicSegment?.length).toBeGreaterThan(0);
      expect(formattedBook.fullText.length).toBeGreaterThan(10);
      expect(formattedArticle.fullText.length).toBeGreaterThan(10);
    }
  });

  it('expone columna numérica tabulada en Vancouver (1.) e IEEE ([1])', () => {
    const vancouver = formatEditorialCitation(sampleArticle, 'vancouver', 0);
    expect(vancouver.usesTabulatedNumberIndent).toBe(true);
    expect(vancouver.citationMarkerLabel).toBe('1.');
    expect(vancouver.citationBodyWithoutNumber).not.toMatch(/^1\.\s/);

    const ieee = formatEditorialCitation(sampleArticle, 'ieee', 2);
    expect(ieee.usesTabulatedNumberIndent).toBe(true);
    expect(ieee.citationMarkerLabel).toBe('[3]');
    expect(ieee.citationBodyWithoutNumber).not.toMatch(/^\[3\]\s/);
  });
});
