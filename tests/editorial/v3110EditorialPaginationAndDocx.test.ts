import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { getEditorialPreset } from '../../src/modules/editor-lee-studio/domain/editorialPresetCatalog';
import {
  computePaginationWithCourtesyBlanks,
  resolveEffectiveEditorialPagination,
} from '../../src/modules/editor-lee-studio/domain/editorialPaginationEngine';
import { formatEditorialGlobalPills } from '../../src/modules/editor-lee-studio/domain/editorialNormEngine';
import { buildEditorialDocxBlob } from '../../src/modules/editor-lee-studio/domain/editorialDocxExporter';
import { hasLeadingEmoji } from '../../src/shared/core/ui/topBarActionRegistry';
import type { EditorialSection } from '../../src/modules/editor-lee-studio/domain/editorialTypes';

describe('V3.11.0 — EditorLee: simple/doble faz, capítulos impares, presets Informe/Proyecto y Word (.docx)', () => {
  it('configura por defecto Informes y Proyectos para entregar en simple faz (A4, lomo 30 mm, Página X de Y)', () => {
    const informe = getEditorialPreset('informe-proyecto');
    const proyecto = getEditorialPreset('proyecto-tecnico');
    const ensayo = getEditorialPreset('ensayo-editorial');

    expect(informe?.pageSize).toBe('a4');
    expect(informe?.printSides).toBe('simplex');
    expect(informe?.chapterBreakMode).toBe('next_page');
    expect(informe?.margins.gutter).toBe(30);
    expect(informe?.margins.right).toBe(20);
    expect(informe?.footerMode).toBe('page_x_of_y');
    expect(informe?.defaultSections).toEqual(
      expect.arrayContaining(['resumen_ejecutivo', 'objetivos_alcance', 'diagnostico', 'recomendaciones']),
    );

    expect(proyecto?.pageSize).toBe('a4');
    expect(proyecto?.printSides).toBe('simplex');
    expect(proyecto?.chapterBreakMode).toBe('next_page');
    expect(proyecto?.margins.gutter).toBe(30);
    expect(proyecto?.footerMode).toBe('page_x_of_y');
    expect(proyecto?.defaultSections).toEqual(
      expect.arrayContaining(['propuesta_tecnica', 'cronograma', 'presupuesto', 'riesgos']),
    );

    expect(ensayo?.printSides).toBe('duplex');
    expect(ensayo?.chapterBreakMode).toBe('odd_page');
    expect(ensayo?.headerMode).toBe('mirror_book_chapter');
    expect(ensayo?.preliminaryRomanNumerals).toBe(true);
  });

  it('en Simple Faz (1 cara) jamás inserta hojas blancas ni fuerza página impar', () => {
    const draft = {
      design: {
        presetId: 'informe-proyecto',
        printSides: 'simplex',
        chapterBreakMode: 'odd_page',
      },
    };
    const pagination = resolveEffectiveEditorialPagination(draft);
    expect(pagination.printSides).toBe('simplex');
    expect(pagination.effectiveChapterBreakMode).toBe('next_page');

    const sections: EditorialSection[] = [
      { id: 'sec_a', title: 'Resumen', category: 'cuerpo', visible: true, includeInToc: true, startNewPage: true, position: 0, records: [] },
      { id: 'sec_b', title: 'Diagnóstico', category: 'cuerpo', visible: true, includeInToc: true, startNewPage: true, position: 1, records: [] },
    ];
    const result = computePaginationWithCourtesyBlanks(
      sections,
      { sec_a: 3, sec_b: 4 },
      {},
      pagination,
    );
    expect(result.courtesyBlankBeforeMap).toEqual({});
    expect(result.rawPageMap.sec_a).toBe(3);
    expect(result.rawPageMap.sec_b).toBe(4);
  });

  it('en Doble Faz + Página Impar inserta hojas blancas solo cuando cae en par, actualiza el índice y converge sin oscilar', () => {
    const pagination = resolveEffectiveEditorialPagination({
      design: {
        presetId: 'libro-ensayo-novela',
        printSides: 'duplex',
        chapterBreakMode: 'odd_page',
        preliminaryRomanNumerals: true,
      },
    });

    const sections: EditorialSection[] = [
      { id: 'sec_1', title: 'Capítulo 1', category: 'cuerpo', visible: true, includeInToc: true, startNewPage: true, position: 0, records: [] },
      { id: 'sec_2', title: 'Capítulo 2', category: 'cuerpo', visible: true, includeInToc: true, startNewPage: true, position: 1, records: [] },
      { id: 'sec_3', title: 'Capítulo 3', category: 'cuerpo', visible: true, includeInToc: true, startNewPage: true, position: 2, records: [] },
      { id: 'sec_4', title: 'Capítulo 4', category: 'cuerpo', visible: true, includeInToc: true, startNewPage: true, position: 3, records: [] },
    ];

    // Pasada 1 sin hojas de cortesía:
    // Cap 1 abre en p3 (impar, ok); Cap 2 cae en p4 (par -> necesita blanca -> p5);
    // Cap 2 dura 2 págs (5 y 6) así que Cap 3 intrínseca p6 + 1 = p7 (impar, no necesita);
    // Cap 3 dura 1 pág (7) así que Cap 4 intrínseca p7 + 1 = p8 (par -> necesita blanca -> p9).
    const pass1 = computePaginationWithCourtesyBlanks(
      sections,
      { sec_1: 3, sec_2: 4, 'sec_2-sub1': 5, sec_3: 6, sec_4: 7 },
      {},
      pagination,
    );

    expect(pass1.courtesyBlankBeforeMap).toEqual({ sec_2: true, sec_4: true });
    expect(pass1.rawPageMap).toEqual({
      sec_1: 3,
      sec_2: 5,
      'sec_2-sub1': 6,
      sec_3: 7,
      sec_4: 9,
    });
    // Con reinicio arábigo en sec_1 (pág física 3 => folio 1)
    expect(pass1.displayPageMap).toEqual({
      sec_1: '1',
      sec_2: '3',
      'sec_2-sub1': '4',
      sec_3: '5',
      sec_4: '7',
    });

    // Pasada 2 re-escaneando los números ya desplazados: debe converger al MISMO resultado
    const pass2 = computePaginationWithCourtesyBlanks(
      sections,
      pass1.rawPageMap,
      pass1.courtesyBlankBeforeMap,
      pagination,
    );
    expect(pass2.courtesyBlankBeforeMap).toEqual(pass1.courtesyBlankBeforeMap);
    expect(pass2.rawPageMap).toEqual(pass1.rawPageMap);
    expect(pass2.displayPageMap).toEqual(pass1.displayPageMap);
  });

  it('genera etiquetas limpias y compactas para las 3 píldoras de la TopBar en escritorio y móvil', () => {
    const informePills = formatEditorialGlobalPills({ design: { presetId: 'informe-proyecto' } });
    expect(informePills.presetShort).toBe('Informe');
    expect(informePills.printFlowShort).toBe('1 cara · Hoja aparte');
    expect(informePills.printFlowMobile).toBe('1 cara');
    expect(informePills.normsUnifiedShort).toBe('Formato obra');

    const libroPills = formatEditorialGlobalPills({ design: { presetId: 'libro-ensayo-novela' } });
    expect(libroPills.presetShort).toBe('Libro');
    expect(libroPills.printFlowShort).toBe('2 caras · Cap. impar');
    expect(libroPills.printFlowMobile).toBe('2 caras · Impar');

    for (const label of [
      informePills.presetShort,
      informePills.printFlowShort,
      informePills.normsUnifiedShort,
      libroPills.printFlowShort,
      libroPills.printFlowMobile,
    ]) {
      expect(hasLeadingEmoji(label)).toBe(false);
    }
  });

  it('exporta Word (.docx) fiel con mirrorMargins/oddPage en Doble Faz y sin espejado ni hojas impares en Simple Faz', async () => {
    const baseSections: EditorialSection[] = [
      {
        id: 'sec_1',
        title: 'Capítulo 1',
        sectionKey: 'capitulo',
        category: 'cuerpo',
        visible: true,
        includeInToc: true,
        startNewPage: true,
        position: 0,
        records: [
          { id: 'r1', type: 'paragraph', content: 'Texto principal con **negrita** y *cursiva*.' },
          { id: 'r2', type: 'subtitle', subtitleLevel: 2, content: 'Apartado interno' },
        ],
      },
      {
        id: 'sec_2',
        title: 'Capítulo 2',
        sectionKey: 'capitulo',
        category: 'cuerpo',
        visible: true,
        includeInToc: true,
        startNewPage: true,
        position: 1,
        records: [{ id: 'r3', type: 'paragraph', content: 'Contenido del segundo capítulo.' }],
      },
    ];

    const duplexOut = await buildEditorialDocxBlob({
      metadata: { title: 'Mi Libro Duplex', author: 'Autor Prueba', year: 2026 },
      cover: { mode: 'libro' },
      tocConfig: { enabled: true, title: 'Índice General', showSubtitles: true, position: 'tras-caratula' },
      design: {
        presetId: 'libro-ensayo-novela',
        printSides: 'duplex',
        chapterBreakMode: 'odd_page',
        headerMode: 'mirror_book_chapter',
        footerMode: 'folio_only',
        suppressHeaderOnChapterStart: true,
      },
      sections: baseSections,
    });

    const duplexZip = await JSZip.loadAsync(await duplexOut.blob.arrayBuffer());
    const duplexSettings = await duplexZip.file('word/settings.xml')!.async('string');
    const duplexDocXml = await duplexZip.file('word/document.xml')!.async('string');
    expect(duplexSettings).toContain('w:mirrorMargins');
    expect(duplexSettings).toContain('w:evenAndOddHeaders');
    expect(duplexDocXml).toContain('oddPage');

    const simplexOut = await buildEditorialDocxBlob({
      metadata: { title: 'Informe Anual', author: 'Equipo Técnico', year: 2026 },
      cover: { mode: 'ejecutiva' },
      tocConfig: { enabled: true, title: 'Índice General', showSubtitles: true, position: 'tras-caratula' },
      design: {
        presetId: 'informe-proyecto',
        printSides: 'simplex',
        chapterBreakMode: 'odd_page',
        footerMode: 'page_x_of_y',
      },
      sections: baseSections,
    });

    const simplexZip = await JSZip.loadAsync(await simplexOut.blob.arrayBuffer());
    const simplexSettings = await simplexZip.file('word/settings.xml')!.async('string');
    const simplexDocXml = await simplexZip.file('word/document.xml')!.async('string');
    expect(simplexSettings).not.toContain('w:mirrorMargins');
    expect(simplexDocXml).not.toContain('oddPage');
    expect(simplexDocXml).toContain('nextPage');
  });
});
