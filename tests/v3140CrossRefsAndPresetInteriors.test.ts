// @vitest-environment jsdom
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { describe, expect, it } from 'vitest';
import {
  buildEditorialCrossRefGraph,
  buildInlineRefToken,
  enrichImportedSectionsWithReferences,
  formatAnnexSectionDisplayTitle,
  formatNormativeElementCaption,
  resolveAllEditorialInlineTokens,
  resolveCrossRefsInText,
} from '../src/modules/editor-lee-studio/domain/editorialCrossRefEngine';
import { buildInlineCiteToken } from '../src/modules/editor-lee-studio/domain/editorialCitationFormatter';
import { runEditorialPreflight } from '../src/modules/editor-lee-studio/domain/editorialPreflightEngine';
import {
  resolveEditorialInteriorArchetype,
  resolveEditorialInteriorTheme,
} from '../src/modules/editor-lee-studio/pdf/editorialInteriorTheme';
import { EditorialPdfDocument } from '../src/modules/editor-lee-studio/pdf/EditorialPdfDocument';
import { buildEditorialDocxBlob } from '../src/modules/editor-lee-studio/domain/editorialDocxExporter';
import { getContrastRatio } from '../src/shared/core/pdf-engine/layers/colors/colorSystem';
import type { EditorialSection } from '../src/modules/editor-lee-studio/domain/editorialTypes';

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('V3.14.0 — Grafo de Referencias Cruzadas, Auto-Citas e Interiores Diferenciados por Plantilla', () => {
  it('1. Numera dinámicamente Tablas, Figuras y Anexos (A, B) y actualiza textos al reordenar secciones', () => {
    const secA: EditorialSection = {
      id: 'sec_a',
      title: 'Diagnóstico',
      sectionKey: 'diagnostico',
      category: 'cuerpo',
      visible: true,
      includeInToc: true,
      startNewPage: true,
      position: 0,
      records: [
        {
          id: 'tbl_diag',
          type: 'table',
          content: '',
          tableCaption: 'Tabla 1: Beneficiarios por franja',
          tableHeaders: ['Franja', 'Cantidad'],
          tableRows: [['60-75', '42']],
        },
        {
          id: 'img_diag',
          type: 'image',
          content: '',
          imagePath: TINY_PNG,
          imageCaption: 'Figura 1: Comedor Limache',
        },
      ],
    };

    const secB: EditorialSection = {
      id: 'sec_b',
      title: 'Propuesta',
      sectionKey: 'propuesta_tecnica',
      category: 'cuerpo',
      visible: true,
      includeInToc: true,
      startNewPage: true,
      position: 1,
      records: [
        {
          id: 'tbl_prop',
          type: 'table',
          content: '',
          tableCaption: 'Cronograma semanal',
          tableHeaders: ['Día', 'Menú'],
          tableRows: [['Lunes', 'Guiso nutritivo']],
        },
        {
          id: 'p_ref',
          type: 'paragraph',
          content: `Según ${buildInlineRefToken('tbl_prop')} y el detalle en ${buildInlineRefToken('anx_encuesta')}.`,
        },
      ],
    };

    const annexSec: EditorialSection = {
      id: 'anx_encuesta',
      title: 'Planillas de asistencia',
      sectionKey: 'anexo',
      category: 'cierre',
      visible: true,
      includeInToc: true,
      startNewPage: true,
      position: 2,
      records: [{ id: 'r_anx', type: 'paragraph', content: 'Planilla adjunta.' }],
    };

    const g1 = buildEditorialCrossRefGraph([secA, secB, annexSec]);
    expect(g1.tables.map((t) => t.label)).toEqual(['Tabla 1', 'Tabla 2']);
    expect(g1.figures.map((f) => f.label)).toEqual(['Figura 1']);
    expect(g1.annexes.map((a) => a.label)).toEqual(['Anexo A']);
    expect(formatAnnexSectionDisplayTitle(annexSec.title, g1.annexes[0])).toBe(
      'Anexo A — Planillas de asistencia',
    );
    expect(resolveCrossRefsInText(secB.records[1].content || '', g1, 'apa7')).toBe(
      'Según Tabla 2 y el detalle en Anexo A.',
    );

    // Al invertir secB antes de secA, tbl_prop pasa automáticamente a ser Tabla 1 sin editar el texto
    const gReordered = buildEditorialCrossRefGraph([secB, secA, annexSec]);
    expect(resolveCrossRefsInText(secB.records[1].content || '', gReordered, 'apa7')).toBe(
      'Según Tabla 1 y el detalle en Anexo A.',
    );
    expect(resolveCrossRefsInText('Ver [[ref:inexistente]].', gReordered, 'apa7')).toBe(
      'Ver [Ref. pendiente].',
    );
  });

  it('2. formatNormativeElementCaption adapta rótulos APA 7 (2 líneas arriba) vs Vancouver/IEEE (Figura debajo) sin duplicar prefijos', () => {
    const graph = buildEditorialCrossRefGraph([
      {
        id: 'cap1',
        title: 'Resultados',
        sectionKey: 'resultados',
        category: 'cuerpo',
        visible: true,
        includeInToc: true,
        startNewPage: true,
        position: 0,
        records: [
          { id: 't1', type: 'table', content: '', tableCaption: 'Tabla 1: Menú mensual', tableHeaders: ['A'], tableRows: [['1']] },
          { id: 'f1', type: 'image', content: '', imagePath: TINY_PNG, imageCaption: 'Figura 1. Curva glucémica' },
        ],
      },
    ]);

    const apaTable = formatNormativeElementCaption('table', graph.byTargetId.get('t1'), 'Tabla 1: Menú mensual', {
      structuralNormId: 'apa7',
      bibliographyStyle: 'apa7',
      interiorArchetype: 'academico_formal',
    });
    expect(apaTable.placement).toBe('above');
    expect(apaTable.layout).toBe('two-line-apa');
    expect(apaTable.boldPrefix).toBe('Tabla 1');
    expect(apaTable.titleText).toBe('Menú mensual');

    const apaFig = formatNormativeElementCaption('figure', graph.byTargetId.get('f1'), 'Figura 1. Curva glucémica', {
      structuralNormId: 'apa7',
      bibliographyStyle: 'apa7',
      interiorArchetype: 'academico_formal',
    });
    expect(apaFig.placement).toBe('above');
    expect(apaFig.layout).toBe('two-line-apa');
    expect(apaFig.boldPrefix).toBe('Figura 1');
    expect(apaFig.titleText).toBe('Curva glucémica');

    const ieeeFig = formatNormativeElementCaption('figure', graph.byTargetId.get('f1'), 'Figura 1. Curva glucémica', {
      structuralNormId: 'apa7',
      bibliographyStyle: 'ieee',
      interiorArchetype: 'cientifico_imryd',
    });
    expect(ieeeFig.placement).toBe('below');
    expect(ieeeFig.boldPrefix).toBe('Fig. 1.');
    expect(ieeeFig.titleText).toBe('Curva glucémica');
  });

  it('3. enrichImportedSectionsWithReferences convierte referencias importadas y vincula (Autor, Año), [N], Tabla/Figura/Anexo', () => {
    const rawSections: EditorialSection[] = [
      {
        id: 'sec_intro',
        title: 'Introducción',
        sectionKey: 'introduccion',
        category: 'cuerpo',
        visible: true,
        includeInToc: true,
        startNewPage: true,
        position: 0,
        records: [
          {
            id: 'p1',
            type: 'paragraph',
            content: 'Estudios previos (García, 2024, p. 12) y los datos de Tabla 1 junto al Anexo A muestran mejoras en Figura 1[^1].',
          },
          {
            id: 'tbl1',
            type: 'table',
            content: '',
            tableCaption: 'Ingesta diaria',
            tableHeaders: ['Nutriente'],
            tableRows: [['Calcio']],
          },
          {
            id: 'fig1',
            type: 'image',
            content: '',
            imagePath: TINY_PNG,
            imageCaption: 'Distribución por horario',
          },
        ],
      },
      {
        id: 'sec_anx',
        title: 'Anexo A: Encuestas',
        sectionKey: 'anexo',
        category: 'cierre',
        visible: true,
        includeInToc: true,
        startNewPage: true,
        position: 1,
        records: [{ id: 'ra1', type: 'paragraph', content: 'Formulario completo.' }],
      },
      {
        id: 'sec_bib',
        title: 'Referencias',
        sectionKey: 'bibliografia',
        category: 'cierre',
        visible: true,
        includeInToc: true,
        startNewPage: true,
        position: 2,
        records: [
          {
            id: 'rb1',
            type: 'paragraph',
            content: 'García, M. (2024). Nutrición comunitaria en adultos mayores. Eudeba. https://doi.org/10.1000/test',
          },
        ],
      },
    ];

    const res = enrichImportedSectionsWithReferences(rawSections, 'apa7');
    expect(res.parsedBibCount).toBe(1);
    expect(res.linkedCitationsCount).toBe(1);
    expect(res.linkedCrossRefsCount).toBe(3);

    const bibSec = res.sections.find((s) => s.id === 'sec_bib');
    expect(bibSec?.records[0].type).toBe('bibliography_item');
    expect(bibSec?.records[0].bibAuthor).toBe('García, M');
    expect(bibSec?.records[0].bibYear).toBe('2024');
    expect(bibSec?.records[0].bibDoiOrUrl).toBe('https://doi.org/10.1000/test');

    const introContent = res.sections[0].records[0].content || '';
    expect(introContent).toContain('[[cite:');
    expect(introContent).toContain('[[ref:tbl1]]');
    expect(introContent).toContain('[[ref:sec_anx]]');
    expect(introContent).toContain('[[ref:fig1]]');
    expect(introContent).toContain('[^1]');

    const bibMap = new Map([[bibSec!.records[0].id, bibSec!.records[0]]]);
    const graph = buildEditorialCrossRefGraph(res.sections);
    const renderedApa = resolveAllEditorialInlineTokens(introContent, {
      bibMap,
      bibStyle: 'apa7',
      crossRefGraph: graph,
    });
    expect(renderedApa).toContain('(García, 2024, p. 12)');
    expect(renderedApa).toContain('Tabla 1');
    expect(renderedApa).toContain('Anexo A');
    expect(renderedApa).toContain('Figura 1');
  });

  it('4. runEditorialPreflight detecta citas o referencias rotas y fuentes sin citar en normas académicas', () => {
    const report = runEditorialPreflight({
      metadata: { title: 'Investigación Aplicada 2026' },
      design: { structuralNormId: 'apa7', bibliographyStyle: 'apa7' },
      sections: [
        {
          id: 'cap1',
          title: 'Marco Teórico',
          visible: true,
          includeInToc: true,
          startNewPage: true,
          position: 0,
          records: [
            {
              id: 'p1',
              type: 'paragraph',
              content: `Ver ${buildInlineCiteToken('bib_used')} y ${buildInlineCiteToken('bib_deleted')} en [[ref:tbl_missing]].`,
            },
          ],
        },
        {
          id: 'bib',
          title: 'Referencias',
          sectionKey: 'bibliografia',
          visible: true,
          includeInToc: true,
          startNewPage: true,
          position: 1,
          records: [
            { id: 'bib_used', type: 'bibliography_item', content: '', bibAuthor: 'López, A.', bibYear: '2025', bibTitle: 'Salud' },
            { id: 'bib_unused', type: 'bibliography_item', content: '', bibAuthor: 'Zeta, R.', bibYear: '2020', bibTitle: 'Extra' },
          ],
        },
      ],
    });

    expect(report.errors.filter((e) => e.code === 'broken_cross_reference').length).toBe(2);
    expect(report.warnings.some((w) => w.code === 'uncited_bibliography_item')).toBe(true);
  });

  it('5. resolveEditorialInteriorTheme diferencia los 5 arquetipos, respeta contraste WCAG AA y exporta PDF + DOCX sin errores', async () => {
    expect(resolveEditorialInteriorArchetype('novela-literaria')).toBe('literario');
    expect(resolveEditorialInteriorArchetype('tesis-apa7')).toBe('academico_formal');
    expect(resolveEditorialInteriorArchetype('articulo-academico')).toBe('cientifico_imryd');
    expect(resolveEditorialInteriorArchetype('informe-proyecto')).toBe('ejecutivo_proyecto');
    expect(resolveEditorialInteriorArchetype('manual-apunte-guia')).toBe('didactico_guia');

    const litTheme = resolveEditorialInteriorTheme({ presetId: 'novela-literaria', structuralNormId: 'libre' });
    const apaTheme = resolveEditorialInteriorTheme({ presetId: 'tesis-apa7', structuralNormId: 'apa7' });
    const execTheme = resolveEditorialInteriorTheme({
      presetId: 'informe-proyecto',
      design: { coverPaletteKey: 'joven' },
      structuralNormId: 'libre',
    });

    expect(litTheme.chapterHeaderVariant).toBe('literary_centered_diamond');
    expect(apaTheme.chapterHeaderVariant).toBe('apa_centered_clean');
    expect(execTheme.chapterHeaderVariant).toBe('executive_left_bar');
    expect(getContrastRatio('#FFFFFF', execTheme.headingColor)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(execTheme.tableHeaderBg, execTheme.tableHeaderText)).toBeGreaterThanOrEqual(4.5);

    const sampleDraft = {
      metadata: { title: 'Comedor Limache Saludable', author: 'Equipo Salta', year: 2026 },
      design: {
        presetId: 'informe-proyecto',
        coverPaletteKey: 'marino',
        pageSize: 'a4',
        structuralNormId: 'libre',
        bibliographyStyle: 'apa7',
        typography: { fontFamily: 'Helvetica', fontSize: 10.5, lineHeight: 1.45 },
      },
      cover: { mode: 'ejecutiva', coverPaletteKey: 'marino', title: 'Comedor Limache Saludable' },
      tocConfig: { enabled: true, title: 'Índice General', showSubtitles: true, position: 'tras-caratula' },
      manifestRules: {
        preserveScenes: true,
        preservePoems: true,
        preserveCitations: true,
        typographyCleanup: true,
        qrQuietZone: 4,
        qrMinSize: 20,
      },
      sections: [
        {
          id: 'cap_1',
          title: 'Diagnóstico',
          sectionKey: 'diagnostico',
          category: 'cuerpo' as const,
          visible: true,
          includeInToc: true,
          startNewPage: true,
          position: 0,
          records: [
            {
              id: 'p_intro',
              type: 'paragraph' as const,
              content: `Resultados resumidos en ${buildInlineRefToken('tbl_res')} según ${buildInlineCiteToken('bib_1')}.`,
            },
            {
              id: 'tbl_res',
              type: 'table' as const,
              content: '',
              tableCaption: 'Raciones semanales',
              tableHeaders: ['Día', 'Menú'],
              tableRows: [['Lunes', 'Sopa y fruta']],
            },
          ],
        },
        {
          id: 'bib_sec',
          title: 'Referencias',
          sectionKey: 'bibliografia',
          category: 'cierre' as const,
          visible: true,
          includeInToc: true,
          startNewPage: true,
          position: 1,
          records: [
            {
              id: 'bib_1',
              type: 'bibliography_item' as const,
              content: '',
              bibAuthor: 'Salta Nutrición',
              bibYear: '2026',
              bibTitle: 'Guía de comedores comunitarios',
              bibEditorial: 'Ed. Regional',
            },
          ],
        },
      ],
    };

    const blob = await pdf(
      React.createElement(EditorialPdfDocument, {
        data: sampleDraft as any,
        preset: 'informe-proyecto',
      }),
    ).toBlob();
    expect(blob.size).toBeGreaterThan(800);

    const docxOut = await buildEditorialDocxBlob(sampleDraft);
    expect(docxOut.blob.size).toBeGreaterThan(1000);
  });
});
