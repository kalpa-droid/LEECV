import { describe, it, expect } from 'vitest';
import {
  EDITORIAL_PRESET_CATALOG,
  getEditorialPreset,
  buildInitialSectionsForPreset,
  applyEditorialPresetToDraft,
} from '../src/modules/editor-lee-studio/domain/editorialPresetCatalog';
import {
  formatEditorialCitation,
  sortBibliographyRecords,
  BIBLIOGRAPHY_NORM_GUIDES,
} from '../src/modules/editor-lee-studio/domain/editorialCitationFormatter';
import { sanitizeEditorialData } from '../src/modules/editor-lee-studio/domain/sanitizeEditorialData';
import type { EditorialRecord } from '../src/modules/editor-lee-studio/domain/editorialTypes';

describe('EditorLee V3.1 — Presets Académicos/Literarios y Formateador APA 7 / Vancouver', () => {
  it('incluye los presets investigados de Secundaria, Terciario, Tesis APA 7, Científico Vancouver y Novela', () => {
    const ids = EDITORIAL_PRESET_CATALOG.map((p) => p.id);
    expect(ids).toContain('tp-secundaria');
    expect(ids).toContain('monografia-terciaria');
    expect(ids).toContain('tesis-apa7');
    expect(ids).toContain('cientifico-vancouver');
    expect(ids).toContain('libro-ensayo-novela');

    const apaPreset = getEditorialPreset('tesis-apa7');
    expect(apaPreset?.normId).toBe('apa7');
    expect(apaPreset?.typography.lineHeight).toBe(2.0);
    expect(apaPreset?.margins.top).toBe(25);
    expect(apaPreset?.firstLineIndent).toBe(true);
    expect(apaPreset?.defaultSections).toEqual([
      'resumen',
      'introduccion',
      'marco_teorico',
      'metodologia',
      'resultados',
      'discusion',
      'conclusiones',
      'bibliografia',
      'anexo',
    ]);

    const vancouverPreset = getEditorialPreset('cientifico-vancouver');
    expect(vancouverPreset?.normId).toBe('vancouver');
    expect(vancouverPreset?.bibliographyStyle).toBe('vancouver');
    expect(vancouverPreset?.defaultSections).toContain('metodologia');
    expect(vancouverPreset?.defaultSections).toContain('resultados');
    expect(vancouverPreset?.defaultSections).toContain('discusion');
  });

  it('arma secciones iniciales numeradas y conserva texto cuando aplica solo diseño', () => {
    const novelaSections = buildInitialSectionsForPreset('libro-ensayo-novela');
    expect(novelaSections.map((s) => s.title)).toEqual([
      'Prólogo',
      'Introducción',
      'Capítulo 1',
      'Capítulo 2',
      'Epílogo',
      'Anexo 1',
    ]);
    expect(novelaSections[2].sectionKey).toBe('capitulo');
    expect(novelaSections[2].category).toBe('cuerpo');

    const baseDraft = {
      id: 'editorial_test',
      type: 'editorial',
      metadata: { title: 'Mi Ensayo' },
      design: { pageSizeId: 'a4', typography: { fontFamily: 'Helvetica', fontSize: 10, lineHeight: 1.2 } },
      sections: [
        {
          id: 'ed_custom_1',
          title: 'Texto ya redactado',
          visible: true,
          includeInToc: true,
          startNewPage: true,
          position: 0,
          records: [{ id: 'r1', type: 'paragraph', content: 'Mi texto valioso intacto' }],
        },
      ],
    };

    const updatedDesignOnly = applyEditorialPresetToDraft(baseDraft, 'tesis-apa7', 'apply-design');
    expect(updatedDesignOnly.sections).toHaveLength(1);
    expect(updatedDesignOnly.sections[0].records[0].content).toBe('Mi texto valioso intacto');
    expect(updatedDesignOnly.design.normId).toBe('apa7');
    expect(updatedDesignOnly.design.typography.lineHeight).toBe(2.0);
  });

  it('formatea y ordena alfabéticamente según APA 7.ª edición (con segmento cursivo y margen francés)', () => {
    const records: EditorialRecord[] = [
      {
        id: 'b2',
        type: 'bibliography_item',
        content: '',
        bibSourceType: 'libro',
        bibAuthor: 'Zelaya, R.',
        bibYear: '2021',
        bibTitle: 'Psicología social aplicada',
        bibEditorial: 'Paidós',
        bibOrderNumber: 1,
      },
      {
        id: 'b1',
        type: 'bibliography_item',
        content: '',
        bibSourceType: 'articulo',
        bibAuthor: 'Álvarez, M.',
        bibYear: '2024',
        bibTitle: 'Impacto educativo digital',
        bibJournal: 'Revista Iberoamericana',
        bibVolume: '12',
        bibIssue: '3',
        bibPages: '44-59',
        bibDoiOrUrl: 'https://doi.org/10.1234/test',
        bibOrderNumber: 2,
      },
    ];

    const sorted = sortBibliographyRecords(records, 'apa7');
    // Álvarez debe preceder a Zelaya en APA 7 aunque haya llegado segundo (compara Unicode sin diacríticos)
    expect(sorted.map((r) => r.id)).toEqual(['b1', 'b2']);

    const citeArticle = formatEditorialCitation(sorted[0], 'apa7', 0);
    expect(citeArticle.style).toBe('apa7');
    expect(citeArticle.italicSegment).toBe('Revista Iberoamericana');
    expect(citeArticle.fullText).toContain('Álvarez, M. (2024). Impacto educativo digital.');
    expect(citeArticle.fullText).toContain('https://doi.org/10.1234/test');
    expect(citeArticle.usesHangingIndent).toBe(true);
  });

  it('enumera secuencialmente en orden de aparición según Vancouver (ICMJE) y expone guía', () => {
    const records: EditorialRecord[] = [
      {
        id: 'v1',
        type: 'bibliography_item',
        content: '',
        bibSourceType: 'articulo',
        bibAuthor: 'Zelaya, Rosa Maria',
        bibYear: '2023',
        bibTitle: 'Protocolo clínico temprano',
        bibJournal: 'Rev Med Argent',
        bibVolume: '80',
        bibIssue: '2',
        bibPages: '12-19',
        bibOrderNumber: 1,
      },
      {
        id: 'v2',
        type: 'bibliography_item',
        content: '',
        bibSourceType: 'libro',
        bibAuthor: 'Borges, Jorge',
        bibYear: '2022',
        bibTitle: 'Ensayos de epistemología',
        bibCity: 'Buenos Aires',
        bibEditorial: 'Eudeba',
        bibOrderNumber: 2,
      },
    ];

    const sorted = sortBibliographyRecords(records, 'vancouver');
    // Vancouver NO reordena alfabéticamente: respeta aparición (Zelaya = 1, Borges = 2)
    expect(sorted.map((r) => r.id)).toEqual(['v1', 'v2']);
    expect(sorted.map((r) => r.bibOrderNumber)).toEqual([1, 2]);

    const cite = formatEditorialCitation(sorted[0], 'vancouver', 0);
    expect(cite.citationNumber).toBe(1);
    expect(cite.fullText).toContain('1. Zelaya RM. Protocolo clínico temprano. Rev Med Argent. 2023;80(2):12-19.');
    expect(BIBLIOGRAPHY_NORM_GUIDES.vancouver.sortOrder).toBe('appearance');
    expect(BIBLIOGRAPHY_NORM_GUIDES.apa7.sortOrder).toBe('alphabetical');
  });

  it('sanitizeEditorialData preserva sectionKey, category y metadatos nuevos sin pérdida', () => {
    const raw = {
      id: 'doc_editorial_v31',
      type: 'editorial',
      metadata: { title: 'Tesis Bioquímica' },
      design: { presetId: 'tesis-apa7', normId: 'apa7', firstLineIndent: true },
      sections: [
        {
          id: 'ed_metodologia_1',
          title: 'Metodología',
          sectionKey: 'metodologia',
          category: 'cuerpo',
          visible: true,
          includeInToc: true,
          startNewPage: true,
          position: 0,
          records: [{ id: 'rec_1', type: 'paragraph', content: 'Diseño experimental.' }],
        },
      ],
    };

    const sanitized = sanitizeEditorialData(raw);
    expect(sanitized).not.toBeNull();
    expect(sanitized!.sections[0].sectionKey).toBe('metodologia');
    expect(sanitized!.sections[0].category).toBe('cuerpo');
    expect(sanitized!.design.normId).toBe('apa7');
  });
});
