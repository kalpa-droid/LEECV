// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import {
  StructureAnalysisSchema,
  buildDeterministicProposalFromAst,
  buildPanoramicDocumentMap,
  detectSafeDocumentMime,
  expandSectionNodeBlockIds,
  repairProposalToLosslessBijection,
  type DocumentAST,
  type StructureAnalysis,
} from '../src/shared/core/document-ast/documentAst';
import {
  extractBitmapFromMetafile,
  serializeOmmlNodeToText,
} from '../src/modules/editor-lee-studio/domain/ooxmlMathAndDiagramParser';
import { extractDocxInClient } from '../src/modules/editor-lee-studio/domain/docxClientExtractor';
import { extractOdtInClient } from '../src/modules/editor-lee-studio/domain/odtClientExtractor';
import {
  detectTablesInPageLines,
  extractVisualRegionsFromOperatorList,
  groupSpansIntoRichLines,
  normalizePdfRichSpans,
  orderPageLinesXyCut,
  stripRepeatedHeadersAndFooters,
} from '../src/modules/editor-lee-studio/domain/pdfGeometryHelpers';
import {
  applyEditorialImportMergePlan,
  buildDefaultMergeDecisions,
} from '../src/modules/editor-lee-studio/ui/EditorialImportReviewModal';
import { buildCandidateContext } from '../api/_lib/aiTasks/candidateContext';
import {
  isStructurallyValidJpeg,
  isStructurallyValidPng,
  stripJpegApp1Exif,
} from '../src/shared/core/utils/imageCompressor';
import { EDITORIAL_STEP_SEQUENCE } from '../src/modules/editor-lee-studio/domain/editorialStepSequence';
import type { EditorialSection } from '../src/modules/editor-lee-studio/domain/editorialTypes';

function makeAstBlock(
  idx: number,
  text: string,
  opts: Partial<DocumentAST['blocks'][number]> = {},
): DocumentAST['blocks'][number] {
  const n = String(idx).padStart(5, '0');
  return {
    id: `blk_${n}`,
    type: opts.type || 'paragraph',
    page: opts.page ?? 1,
    order: idx,
    text,
    sha256: `hash_${n}`,
    ...opts,
  };
}

describe('V3.13.0 — Native Disassembly, Panoramic Map, Global AI Consciousness & Step Sequence', () => {
  it('1. StructureAnalysisSchema tolera campos null y expande rangos startBlockId..endBlockId en biyección 1:1', () => {
    const rawFromAi = {
      documentType: 'business_report',
      currentStructureScore: 82,
      keepOriginalStructure: true,
      coverBlockIds: ['blk_00001'],
      tocBlockIds: null,
      extractedMetadata: {
        title: 'Ancianos felices, comida saludable',
        subtitle: null,
        author: null,
      },
      extractedLegalFields: {
        tema: 'Comedor de adultos mayores',
        institucion: null,
        catedra: null,
        docente: null,
        integrantes: null,
      },
      auditIssues: [
        {
          type: 'duplicate_heading',
          title: 'Introducción',
          detail: 'Título repetido en bloque 5',
          sectionId: null,
        },
      ],
      proposedSections: [
        {
          sectionId: 'sec_1',
          sectionKey: 'introduccion',
          category: 'preliminares',
          title: 'Introducción',
          level: null,
          blockIds: null,
          startBlockId: 'blk_00002',
          endBlockId: 'blk_00003',
          excludedBlockIds: null,
          roleOverrides: null,
          rationale: null,
        },
        {
          sectionId: 'sec_2',
          sectionKey: null,
          category: null,
          title: 'Desarrollo',
          level: 1,
          startBlockId: 'blk_00004',
          endBlockId: 'blk_00005',
        },
      ],
    };

    const parsed = StructureAnalysisSchema.parse(rawFromAi);
    expect(parsed.proposedSections).toHaveLength(2);
    expect(parsed.proposedSections[0].level).toBe(1);
    expect(parsed.proposedSections[0].blockIds).toEqual([]);

    const ast: DocumentAST = {
      docId: 'doc_test',
      sourceName: 'proyecto.pdf',
      sourceMime: 'application/pdf',
      totalPages: 2,
      blocks: [
        makeAstBlock(1, 'Tema: Comedor de adultos mayores'),
        makeAstBlock(2, '2. INTRODUCCIÓN', { type: 'heading', headingLevel: 1 }),
        makeAstBlock(3, 'Texto introductorio del comedor comunitario.'),
        makeAstBlock(4, '3. DESARROLLO', { type: 'heading', headingLevel: 1, page: 2 }),
        makeAstBlock(5, 'Actividades semanales y menú nutricional.', { page: 2 }),
      ],
    };

    expect(expandSectionNodeBlockIds(ast, parsed.proposedSections[0])).toEqual(['blk_00002', 'blk_00003']);
    const { repaired, recoveredCount } = repairProposalToLosslessBijection(ast, parsed as StructureAnalysis);
    expect(recoveredCount).toBe(0);
    const placed = repaired.proposedSections.flatMap((s) => s.blockIds);
    expect(placed).toEqual(['blk_00002', 'blk_00003', 'blk_00004', 'blk_00005']);
  });

  it('2. Mapa Panorámico y respaldo determinista separan portada, capítulos numerados y auditan duplicados / vacíos / índice', () => {
    const ast: DocumentAST = {
      docId: 'doc_salta',
      sourceName: 'proyecto-limache.pdf',
      sourceMime: 'application/pdf',
      totalPages: 3,
      blocks: [
        makeAstBlock(1, 'Tema: Comedor de adultos mayores – barrio Limache, Salta Capital'),
        makeAstBlock(2, 'Proyecto: Ancianos felices, comida saludable'),
        makeAstBlock(3, '1. TÍTULO DEL PROYECTO', { type: 'heading', headingLevel: 1 }),
        makeAstBlock(4, 'ANCIANOS FELICES, COMIDA SALUDABLE'),
        makeAstBlock(5, '2. INTRODUCCIÓN', { type: 'heading', headingLevel: 1, page: 2 }),
        makeAstBlock(6, 'Este proyecto busca mejorar la alimentación diaria.', { page: 2 }),
        makeAstBlock(7, '3. OBJETIVOS', { type: 'heading', headingLevel: 1, page: 2 }),
        makeAstBlock(8, '2. INTRODUCCIÓN', { type: 'heading', headingLevel: 1, page: 3 }),
        makeAstBlock(9, 'Sección repetida que el auditor debe marcar.', { page: 3 }),
      ],
    };

    const importedToc = [
      { title: '1. TÍTULO DEL PROYECTO', level: 1, page: '1' },
      { title: '4. CRONOGRAMA FALTANTE', level: 1, page: '4' },
    ];

    const mapStr = buildPanoramicDocumentMap(ast, { importedTocEntries: importedToc });
    expect(mapStr).toContain('<imported_toc>');
    expect(mapStr).toContain('4. CRONOGRAMA FALTANTE');
    expect(mapStr).toContain('DUPLICADO');
    expect(mapStr).toContain('SIN_CONTENIDO');

    const proposal = buildDeterministicProposalFromAst(ast, { importedTocEntries: importedToc });
    expect(proposal.coverBlockIds).toEqual(['blk_00001', 'blk_00002']);
    expect(proposal.extractedMetadata?.title).toBe('Ancianos felices, comida saludable');
    expect(proposal.extractedLegalFields?.tema).toContain('Comedor de adultos mayores');
    expect(proposal.proposedSections.length).toBeGreaterThanOrEqual(4);
    expect(proposal.auditIssues?.some((i) => i.type === 'duplicate_heading')).toBe(true);
    expect(proposal.auditIssues?.some((i) => i.type === 'empty_section')).toBe(true);
    expect(proposal.auditIssues?.some((i) => i.type === 'toc_mismatch')).toBe(true);
  });

  it('3. detectSafeDocumentMime reconoce PDF con BOM o desplazamiento inicial', () => {
    const padded = new Uint8Array(64);
    padded[0] = 0xef;
    padded[1] = 0xbb;
    padded[2] = 0xbf;
    const header = '%PDF-1.7\n';
    for (let i = 0; i < header.length; i++) {
      padded[12 + i] = header.charCodeAt(i);
    }
    expect(detectSafeDocumentMime(padded)).toBe('pdf');
  });

  it('4. OOXML parser serializa fórmulas OMML (<m:oMath>) y recupera BMP desde EMF/EMR_STRETCHDIBITS', () => {
    const doc = new DOMParser().parseFromString(
      `<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <m:f><m:num><m:r><m:t>a+b</m:t></m:r></m:num><m:den><m:r><m:t>c</m:t></m:r></m:den></m:f>
        <m:sSup><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sup><m:r><m:t>2</m:t></m:r></m:sup></m:sSup>
      </m:oMath>`,
      'application/xml',
    );
    const serialized = serializeOmmlNodeToText(doc.documentElement);
    expect(serialized).toContain('(a+b)/c');
    expect(serialized).toContain('x^2');

    // EMF sintético con EMR_HEADER (88 bytes) + EMR_STRETCHDIBITS (81) + DIB + EMR_EOF (14)
    const recOffset = 88;
    const recSize = 132; // >= 80, offBmi=80, cbBmi=40, offBits=120, cbBits=12
    const emf = new Uint8Array(recOffset + recSize + 8);
    const view = new DataView(emf.buffer);
    view.setUint32(0, 1, true); // EMR_HEADER
    view.setUint32(4, recOffset, true); // headerSize
    view.setUint32(40, 0x464d4520, true); // " EMF"
    view.setUint32(recOffset, 81, true); // EMR_STRETCHDIBITS
    view.setUint32(recOffset + 4, recSize, true);
    view.setUint32(recOffset + 48, 80, true); // offBmi
    view.setUint32(recOffset + 52, 40, true); // cbBmi
    view.setUint32(recOffset + 56, 120, true); // offBits
    view.setUint32(recOffset + 60, 12, true); // cbBits
    emf[recOffset + 80] = 40; // BITMAPINFOHEADER.biSize
    view.setUint32(recOffset + recSize, 14, true); // EMR_EOF
    view.setUint32(recOffset + recSize + 4, 8, true);

    const extracted = extractBitmapFromMetafile(emf);
    expect(extracted).not.toBeNull();
    expect(extracted?.mime).toBe('image/bmp');
    expect(extracted?.bytes[0]).toBe(0x42); // 'B'
    expect(extracted?.bytes[1]).toBe(0x4d); // 'M'
  });

  it('5. docxClientExtractor deduplica mc:Fallback y extrae txbxContent, oMath, imágenes en tabla, endnotes e índice original', async () => {
    const zip = new JSZip();
    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    zip.file(
      'word/styles.xml',
      `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style>
        <w:style w:type="paragraph" w:styleId="TOC1"><w:name w:val="toc 1"/></w:style>
      </w:styles>`,
    );
    zip.file(
      'word/_rels/document.xml.rels',
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/img1.png"/>
      </Relationships>`,
    );
    zip.file('word/media/img1.png', tinyPng);
    zip.file(
      'word/endnotes.xml',
      `<w:endnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:endnote w:id="1"><w:p><w:r><w:t>Nota final normativa APA.</w:t></w:r></w:p></w:endnote>
      </w:endnotes>`,
    );
    zip.file(
      'word/document.xml',
      `<w:document
        xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
        xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
        xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
        xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
        xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
        xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <w:body>
          <w:p><w:pPr><w:pStyle w:val="TOC1"/></w:pPr><w:r><w:t>Capítulo 1 ...... 1</w:t></w:r></w:p>
          <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Capítulo 1: Ecuaciones y Tablas</w:t></w:r></w:p>
          <w:p>
            <mc:AlternateContent>
              <mc:Choice Requires="wps"><w:r><w:t>Texto Choice único.</w:t></w:r></mc:Choice>
              <mc:Fallback><w:r><w:t>Texto Choice único.</w:t></w:r></mc:Fallback>
            </mc:AlternateContent>
          </w:p>
          <w:p>
            <m:oMath><m:r><m:t>E=mc^2</m:t></m:r></m:oMath>
            <w:r><w:endnoteReference w:id="1"/></w:r>
          </w:p>
          <w:p>
            <w:r><w:drawing><w:txbxContent><w:p><w:r><w:t>Recuadro destacado lateral.</w:t></w:r></w:p></w:txbxContent></w:drawing></w:r>
          </w:p>
          <w:tbl>
            <w:tr>
              <w:tc><w:p><w:r><w:t>Celda A</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:drawing><a:blip r:embed="rImg1"/></w:drawing></w:r></w:p></w:tc>
            </w:tr>
          </w:tbl>
        </w:body>
      </w:document>`,
    );

    const bytes = await zip.generateAsync({ type: 'uint8array' });
    const extracted = await extractDocxInClient(bytes);

    expect(extracted.importedTocEntries?.length).toBe(1);
    expect(extracted.importedTocEntries?.[0].title).toContain('Capítulo 1');
    const occurrencesOfChoice = extracted.plainMarkdownText.split('Texto Choice único.').length - 1;
    expect(occurrencesOfChoice).toBe(1);
    expect(extracted.plainMarkdownText).toContain('E=mc^2');
    expect(
      extracted.blocks.some(
        (b) =>
          b.kind === 'callout' &&
          (b.text?.includes('Recuadro destacado lateral') ||
            b.calloutTitle?.includes('Recuadro destacado lateral') ||
            b.calloutItems?.some((it) => it.includes('Recuadro destacado lateral'))),
      ),
    ).toBe(true);
    expect(extracted.blocks.some((b) => b.kind === 'image')).toBe(true);
    expect(extracted.blocks.some((b) => b.kind === 'paragraph' && b.text?.includes('[^1]'))).toBe(true);
    expect(
      extracted.blocks.some(
        (b) =>
          b.kind === 'footnote_list' &&
          (b.text?.includes('Nota final normativa APA.') ||
            b.footnotes?.some((fn) => fn.text.includes('Nota final normativa APA.'))),
      ),
    ).toBe(true);
  });

  it('6. odtClientExtractor extrae encabezados, tablas, notas al pie e imágenes desde un .odt real', async () => {
    const zip = new JSZip();
    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    zip.file('Pictures/logo.png', tinyPng);
    zip.file(
      'content.xml',
      `<office:document-content
        xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
        xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
        xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
        xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
        xmlns:xlink="http://www.w3.org/1999/xlink">
        <office:body>
          <office:text>
            <text:h text:outline-level="1">1. Diagnóstico Inicial</text:h>
            <text:p>Descripción de campo<text:note text:note-class="footnote"><text:note-body><text:p>Fuente propia 2026.</text:p></text:note-body></text:note>.</text:p>
            <text:p><draw:frame><draw:image xlink:href="Pictures/logo.png"/></draw:frame></text:p>
            <table:table>
              <table:table-row>
                <table:table-cell><text:p>Barrio</text:p></table:table-cell>
                <table:table-cell><text:p>Beneficiarios</text:p></table:table-cell>
              </table:table-row>
              <table:table-row>
                <table:table-cell><text:p>Limache</text:p></table:table-cell>
                <table:table-cell><text:p>85</text:p></table:table-cell>
              </table:table-row>
            </table:table>
          </office:text>
        </office:body>
      </office:document-content>`,
    );

    const bytes = await zip.generateAsync({ type: 'uint8array' });
    const odt = await extractOdtInClient(bytes);
    expect(odt.stats.headings).toBe(1);
    expect(odt.stats.tables).toBe(1);
    expect(odt.stats.images).toBe(1);
    expect(odt.blocks.some((b) => b.kind === 'heading' && b.text === '1. Diagnóstico Inicial')).toBe(true);
    expect(odt.plainMarkdownText).toContain('[^1]');
    expect(
      odt.blocks.some(
        (b) =>
          b.kind === 'footnote_list' &&
          (b.text?.includes('Fuente propia 2026.') ||
            b.footnotes?.some((fn) => fn.text.includes('Fuente propia 2026.'))),
      ),
    ).toBe(true);
  });

  it('7. pdfGeometryHelpers limpia encabezados repetidos, ordena 2 columnas XY-Cut, detecta tablas y CTM de imágenes', () => {
    const spanItems = [
      { str: 'Encabezado Repetido', transform: [1, 0, 0, 1, 60, 770], width: 120, height: 10 },
      { str: 'Columna Izq 1', transform: [1, 0, 0, 1, 50, 600], width: 100, height: 11 },
      { str: 'Columna Der 1', transform: [1, 0, 0, 1, 330, 600], width: 100, height: 11 },
      { str: 'Columna Izq 2', transform: [1, 0, 0, 1, 50, 580], width: 100, height: 11 },
      { str: 'Columna Der 2', transform: [1, 0, 0, 1, 330, 580], width: 100, height: 11 },
      { str: 'Página 1 de 3', transform: [1, 0, 0, 1, 260, 30], width: 60, height: 9 },
    ];
    const spans = normalizePdfRichSpans(spanItems);
    const lines = groupSpansIntoRichLines(spans, 595);
    const cleaned = stripRepeatedHeadersAndFooters([
      { page: 1, heightPt: 800, lines },
      { page: 2, heightPt: 800, lines },
      { page: 3, heightPt: 800, lines },
    ]);
    expect(cleaned[0].lines.some((l) => l.text.includes('Encabezado Repetido'))).toBe(false);
    expect(cleaned[0].lines.some((l) => l.text.includes('Página 1 de 3'))).toBe(false);

    // Probar XY-Cut 2 columnas (>= 3 líneas por columna)
    const twoColSpans = normalizePdfRichSpans([
      { str: 'Izq 1', transform: [1, 0, 0, 1, 50, 620], width: 90, height: 11, hasEOL: true },
      { str: 'Der 1', transform: [1, 0, 0, 1, 340, 620], width: 90, height: 11, hasEOL: true },
      { str: 'Izq 2', transform: [1, 0, 0, 1, 50, 600], width: 90, height: 11, hasEOL: true },
      { str: 'Der 2', transform: [1, 0, 0, 1, 340, 600], width: 90, height: 11, hasEOL: true },
      { str: 'Izq 3', transform: [1, 0, 0, 1, 50, 580], width: 90, height: 11, hasEOL: true },
      { str: 'Der 3', transform: [1, 0, 0, 1, 340, 580], width: 90, height: 11, hasEOL: true },
    ]);
    const twoColLines = groupSpansIntoRichLines(twoColSpans, 595);
    const ordered = orderPageLinesXyCut(twoColLines, 595);
    expect(ordered.map((l) => l.text)).toEqual([
      'Izq 1',
      'Izq 2',
      'Izq 3',
      'Der 1',
      'Der 2',
      'Der 3',
    ]);

    // Tabla con 3 filas alineadas
    const tableLines = groupSpansIntoRichLines(
      normalizePdfRichSpans([
        { str: 'Mes', transform: [1, 0, 0, 1, 60, 500], width: 30, height: 10 },
        { str: 'Raciones', transform: [1, 0, 0, 1, 240, 500], width: 55, height: 10, hasEOL: true },
        { str: 'Enero', transform: [1, 0, 0, 1, 60, 480], width: 35, height: 10 },
        { str: '120', transform: [1, 0, 0, 1, 240, 480], width: 25, height: 10, hasEOL: true },
        { str: 'Febrero', transform: [1, 0, 0, 1, 60, 460], width: 45, height: 10 },
        { str: '140', transform: [1, 0, 0, 1, 240, 460], width: 25, height: 10, hasEOL: true },
      ]),
      595,
    );
    const tables = detectTablesInPageLines(tableLines, 11);
    expect(tables.length).toBe(1);
    expect(tables[0].headers).toEqual(['Mes', 'Raciones']);
    expect(tables[0].rows).toEqual([
      ['Enero', '120'],
      ['Febrero', '140'],
    ]);

    // CTM operator list
    const ops = { save: 10, restore: 11, transform: 12, paintImageXObject: 85 };
    const boxes = extractVisualRegionsFromOperatorList(
      {
        fnArray: [10, 12, 85, 11],
        argsArray: [[], [200, 0, 0, 150, 100, 200], [], []],
      },
      ops,
      { width: 600, height: 800 },
    );
    expect(boxes.length).toBe(1);
    expect(boxes[0].kind).toBe('image');
  });

  it('8. buildCandidateContext genera EditorialDocumentDigest con índice, cifras y bibliografía para todas las IAs', () => {
    const context = buildCandidateContext({
      type: 'editorial',
      metadata: {
        title: 'Ancianos felices, comida saludable',
        author: 'Comedor Limache',
      },
      design: {
        presetId: 'informe-proyecto',
        structuralNormId: 'apa7',
        bibliographyStyle: 'apa7',
      },
      sections: [
        {
          id: 'sec_intro',
          title: 'Introducción',
          sectionKey: 'introduccion',
          records: [{ id: 'r1', type: 'paragraph', content: 'Atendemos a 85 adultos mayores en Salta Capital.' }],
        },
        {
          id: 'sec_res',
          title: 'Resultados',
          sectionKey: 'resultados',
          records: [
            { id: 'r2', type: 'table', content: 'Tabla 1: Menú semanal', tableHeaders: ['Día'], tableRows: [['Lunes']] },
            { id: 'r3', type: 'image', content: '', imagePath: 'asset://abc', imageCaption: 'Figura 1: Cocina' },
          ],
        },
      ],
      bibliography: [{ id: 'b1', author: 'OMS', year: '2025', title: 'Nutrición en adultos mayores' }],
    });

    expect(context).toContain('Ancianos felices, comida saludable');
    expect(context).toContain('Introducción');
    expect(context).toContain('Tabla 1');
    expect(context).toContain('Figura 1');
    expect(context).toContain('OMS (2025)');
  });

  it('9. EditorialImportReviewModal mezcla por capítulo: agregar debajo, sobreescribir, omitir y sección nueva', () => {
    const existing: EditorialSection[] = [
      {
        id: 'ex_1',
        title: 'Introducción',
        sectionKey: 'introduccion',
        category: 'preliminares',
        visible: true,
        includeInToc: true,
        startNewPage: true,
        position: 0,
        records: [{ id: 'r_ex', type: 'paragraph', content: 'Párrafo existente.' }],
      },
      {
        id: 'ex_2',
        title: 'Metodología',
        sectionKey: 'metodologia',
        category: 'cuerpo',
        visible: true,
        includeInToc: true,
        startNewPage: true,
        position: 1,
        records: [{ id: 'r_m_ex', type: 'paragraph', content: 'Vieja metodología.' }],
      },
    ];

    const incoming: EditorialSection[] = [
      {
        id: 'in_1',
        title: 'Introducción',
        sectionKey: 'introduccion',
        category: 'preliminares',
        visible: true,
        includeInToc: true,
        startNewPage: true,
        position: 0,
        records: [{ id: 'r_in_1', type: 'paragraph', content: 'Párrafo sumado debajo.' }],
      },
      {
        id: 'in_2',
        title: 'Metodología',
        sectionKey: 'metodologia',
        category: 'cuerpo',
        visible: true,
        includeInToc: true,
        startNewPage: true,
        position: 1,
        records: [{ id: 'r_in_2', type: 'paragraph', content: 'Nueva metodología.' }],
      },
      {
        id: 'in_3',
        title: 'Descartar',
        sectionKey: 'capitulo',
        category: 'cuerpo',
        visible: true,
        includeInToc: true,
        startNewPage: true,
        position: 2,
        records: [{ id: 'r_in_3', type: 'paragraph', content: 'No importar.' }],
      },
      {
        id: 'in_4',
        title: 'Conclusiones',
        sectionKey: 'conclusiones',
        category: 'cierre',
        visible: true,
        includeInToc: true,
        startNewPage: true,
        position: 3,
        records: [{ id: 'r_in_4', type: 'paragraph', content: 'Cierre nuevo.' }],
      },
    ];

    const defaults = buildDefaultMergeDecisions(incoming, existing);
    expect(defaults.in_1.action).toBe('append_into');
    expect(defaults.in_4.action).toBe('new');

    const merged = applyEditorialImportMergePlan({
      existingSections: existing,
      incomingSections: incoming,
      replaceAll: false,
      decisions: {
        in_1: { action: 'append_into', targetSectionId: 'ex_1' },
        in_2: { action: 'overwrite', targetSectionId: 'ex_2' },
        in_3: { action: 'skip' },
        in_4: { action: 'new' },
      },
    });

    expect(merged.map((s) => s.title)).toEqual(['Introducción', 'Metodología', 'Conclusiones']);
    expect(merged[0].records.map((r) => r.content)).toEqual(['Párrafo existente.', 'Párrafo sumado debajo.']);
    expect(merged[1].records.map((r) => r.content)).toEqual(['Nueva metodología.']);
  });

  it('10. Validador de PNG/JPEG rechaza archivos truncados o EXIF corrupto y stripJpegApp1Exif lo recupera', () => {
    const truncatedPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    expect(isStructurallyValidPng(truncatedPng)).toBe(false);

    const validPng = new Uint8Array(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ),
    );
    expect(isStructurallyValidPng(validPng)).toBe(true);

    // JPEG con segmento APP1 EXIF corrupto seguido de SOF0 + SOS + EOI válidos
    const badExifJpeg = new Uint8Array([
      0xff, 0xd8, // SOI
      0xff, 0xe1, 0x00, 0x10, // APP1 length=16 (14 bytes payload)
      0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
      0x49, 0x49, 0x2a, 0x00, // Little endian TIFF
      0x7f, 0xff, 0xff, 0xff, // ifdOffset absurdo fuera del segmento
      0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, // SOF0
      0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, // SOS
      0xff, 0xd9, // EOI
    ]);
    expect(isStructurallyValidJpeg(badExifJpeg)).toBe(false);

    const stripped = stripJpegApp1Exif(badExifJpeg);
    expect(isStructurallyValidJpeg(stripped)).toBe(true);
  });

  it('11. Secuencia lógica de 7 pasos ubica Word/Exportar PDF en el paso 7 y nunca junto a Paso 1 de 7', () => {
    expect(EDITORIAL_STEP_SEQUENCE.map((s) => s.id)).toEqual([
      'editorial_inicio',
      'editorial_portada',
      'editorial_secciones',
      'editorial_bibliografia',
      'editorial_estructura',
      'editorial_diseño',
      'editorial_toc',
    ]);
    expect(EDITORIAL_STEP_SEQUENCE[6].label).toBe('Índice y Exportación');

    const studioSrc = fs.readFileSync(
      path.join(process.cwd(), 'src/modules/editor-lee-studio/EditorLeeStudioContent.tsx'),
      'utf8',
    );
    expect(studioSrc).toContain("activeStepTab === 'editorial_toc'");
    expect(studioSrc).not.toContain('{/* Acciones de Exportación PDF & Word */}');
  });
});
