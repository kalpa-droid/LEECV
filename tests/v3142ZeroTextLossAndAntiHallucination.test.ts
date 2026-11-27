// @vitest-environment jsdom
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import {
  reconstructEditorialSectionsFromAst,
  repairProposalToLosslessBijection,
  sanitizeHallucinatedSections,
  type CanonicalBlock,
  type DocumentAST,
  type StructureAnalysis,
} from '../src/shared/core/document-ast/documentAst';
import { AI_TASKS_CATALOG } from '../api/_lib/aiTasks/catalog';
import {
  extractDocxInClient,
  isTocSdtElement,
} from '../src/modules/editor-lee-studio/domain/docxClientExtractor';
import { hasUsableEditorialDigitalText } from '../src/modules/editor-lee-studio/domain/pdfEditorialExtractor';
import {
  detectTablesInPageLines,
  groupSpansIntoRichLines,
  normalizePdfRichSpans,
} from '../src/modules/editor-lee-studio/domain/pdfGeometryHelpers';
import { applyEditorialImportMergePlan } from '../src/modules/editor-lee-studio/ui/EditorialImportReviewModal';
import { hasEditorialSubstantiveContent } from '../src/modules/editor-lee-studio/ui/EditorialGlobalNormModal';
import { matchesDocumentTypeId } from '../src/shared/core/capabilities/capabilityRegistry';
import type { EditorialSection } from '../src/modules/editor-lee-studio/domain/editorialTypes';

function makeBlock(
  index: number,
  text: string,
  type: CanonicalBlock['type'] = 'paragraph',
  extra: Partial<CanonicalBlock> = {},
): CanonicalBlock {
  return {
    id: `blk_${String(index).padStart(5, '0')}`,
    order: index,
    type,
    text,
    plainText: text,
    ...extra,
  };
}

function makeAst(blocks: CanonicalBlock[]): DocumentAST {
  return {
    sourceFormat: 'docx',
    sourceName: 'manuscrito.docx',
    totalChars: blocks.reduce((acc, b) => acc + b.plainText.length, 0),
    blocks,
  };
}

describe('V3.14.2 — EditorLee cero pérdida de texto y guardas anti-alucinación', () => {
  it('1. Neutraliza anexos, bibliografías o capítulos vacíos alucinados por IA y conserva bibliografías reales', () => {
    const blocks: CanonicalBlock[] = [
      makeBlock(1, 'Introducción general', 'heading'),
      makeBlock(2, 'Este capítulo presenta los fundamentos teóricos de la investigación aplicada en campo.'),
      makeBlock(3, 'Conclusiones finales', 'heading'),
      makeBlock(4, 'Se comprobaron los resultados esperados en la población evaluada durante el año.'),
      makeBlock(5, 'García, M. (2022). Metodología de campo. Editorial Sur.', 'paragraph'),
    ];
    const ast = makeAst(blocks);

    const hallucinatedProposal: StructureAnalysis = {
      proposedSections: [
        {
          sectionId: 'sec_intro',
          sectionKey: 'introduccion',
          category: 'cuerpo',
          title: 'Introducción general',
          level: 1,
          blockIds: ['blk_00001', 'blk_00002'],
        },
        {
          sectionId: 'sec_halluc_anexo_a',
          sectionKey: 'anexo',
          category: 'cierre',
          title: 'Anexo A: Documentación complementaria',
          level: 1,
          blockIds: ['blk_00004'],
        },
        {
          sectionId: 'sec_halluc_empty',
          sectionKey: 'capitulo',
          category: 'cuerpo',
          title: 'Capítulo inventado vacío',
          level: 1,
          blockIds: ['blk_99999'],
        },
        {
          sectionId: 'sec_bib_real',
          sectionKey: 'bibliografia',
          category: 'cierre',
          title: 'Bibliografía',
          level: 1,
          blockIds: ['blk_00005'],
        },
      ],
      coverBlockIds: [],
      tocBlockIds: [],
      auditIssues: [],
      extractedMetadata: { title: 'Obra de prueba' },
    };

    const sanitized = sanitizeHallucinatedSections(ast, hallucinatedProposal.proposedSections);
    expect(sanitized.removedCount).toBe(2);
    expect(sanitized.sections.some((s) => /Anexo A/i.test(s.title))).toBe(false);
    expect(sanitized.sections.some((s) => /inventado/i.test(s.title))).toBe(false);
    expect(sanitized.sections.some((s) => s.sectionKey === 'bibliografia')).toBe(true);

    const { repaired } = repairProposalToLosslessBijection(ast, hallucinatedProposal);
    const assignedIds = repaired.proposedSections.flatMap((s) => s.blockIds || []);
    expect(assignedIds).toContain('blk_00003');
    expect(assignedIds).toContain('blk_00004');
    expect(assignedIds).toContain('blk_00005');

    // Los prompts de IA mantienen tier 'fast' y prohíben alucinar capítulos/anexos
    expect(AI_TASKS_CATALOG.editorial_analyze_ast_structure.tier).toBe('fast');
    expect(AI_TASKS_CATALOG.editorial_analyze_ast_structure_long.tier).toBe('fast');
    expect(AI_TASKS_CATALOG.editorial_analyze_ast_structure.buildSystemPrompt({})).toMatch(/Anexo A/);
    expect(AI_TASKS_CATALOG.editorial_analyze_ast_structure_long.buildSystemPrompt({})).toMatch(/Anexo A/);
  });

  it('2. Rescata prosa/tablas de coverBlockIds/tocBlockIds, expande rangos string y conserva secciones de 1 solo bloque', () => {
    const blocks: CanonicalBlock[] = [
      makeBlock(1, 'Tema: Política pública educativa'),
      makeBlock(
        2,
        'Este primer párrafo describe en detalle el problema histórico del sistema educativo nacional. Incluye antecedentes clave documentados durante tres décadas.',
      ),
      makeBlock(3, 'Capítulo 1', 'heading'),
      makeBlock(4, 'Párrafo A del capítulo 1.'),
      makeBlock(5, 'Párrafo B del capítulo 1.'),
      makeBlock(6, 'Capítulo 2: Marco normativo', 'heading'),
      makeBlock(7, 'Texto exclusivo del capítulo 2 bajo startBlockId sin endBlockId.'),
      makeBlock(8, 'Epílogo breve autónomo', 'heading'),
    ];
    const ast = makeAst(blocks);

    const trickyProposal: StructureAnalysis = {
      coverBlockIds: ['blk_00001', 'blk_00002'], // blk_00002 es prosa real larga (> 140 + 2 oraciones)
      tocBlockIds: ['blk_00004'], // blk_00004 no es entrada TOC ni título de índice
      proposedSections: [
        {
          sectionId: 'sec_1',
          sectionKey: 'capitulo',
          category: 'cuerpo',
          title: 'Capítulo 1',
          level: 1,
          blockIds: ['blk_00003..blk_00005'],
        },
        {
          sectionId: 'sec_2',
          sectionKey: 'capitulo',
          category: 'cuerpo',
          title: 'Capítulo 2: Marco normativo',
          level: 1,
          startBlockId: 'blk_00006',
          endBlockId: undefined,
          blockIds: [],
        },
        {
          sectionId: 'sec_3',
          sectionKey: 'epilogo',
          category: 'cierre',
          title: 'Epílogo breve autónomo',
          level: 1,
          blockIds: ['blk_00008'],
        },
      ],
      auditIssues: [],
    };

    const sections = reconstructEditorialSectionsFromAst(ast, trickyProposal);
    const allContents = sections.flatMap((s) => s.records.map((r) => r.content));

    expect(allContents.some((t) => t.includes('antecedentes clave documentados'))).toBe(true);
    expect(allContents).toContain('Párrafo A del capítulo 1.');
    expect(allContents).toContain('Párrafo B del capítulo 1.');
    expect(allContents).toContain('Texto exclusivo del capítulo 2 bajo startBlockId sin endBlockId.');
    // Sección de 1 solo bloque heading NO debe quedar vacía
    const epilogo = sections.find((s) => s.title === 'Epílogo breve autónomo');
    expect(epilogo?.records.length).toBeGreaterThanOrEqual(1);
    expect(epilogo?.records[0]?.content).toBe('Epílogo breve autónomo');
  });

  it('3. DOCX: conserva todo contenido y tablas dentro de <w:sdt> aunque el texto contenga la palabra "índice"', async () => {
    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:sdt>
            <w:sdtPr>
              <w:docPartObj><w:docPartGallery w:val="Table of Contents"/></w:docPartObj>
            </w:sdtPr>
            <w:sdtContent>
              <w:p><w:r><w:t>Índice general</w:t></w:r></w:p>
              <w:p><w:r><w:t>1. Introducción .... 3</w:t></w:r></w:p>
            </w:sdtContent>
          </w:sdt>
          <w:sdt>
            <w:sdtPr><w:tag w:val="bodySection"/></w:sdtPr>
            <w:sdtContent>
              <w:p><w:r><w:t>El índice de participación creció un 40% en el segundo semestre.</w:t></w:r></w:p>
              <w:tbl>
                <w:tr><w:tc><w:p><w:r><w:t>Indicador</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Valor</w:t></w:r></w:p></w:tc></w:tr>
                <w:tr><w:tc><w:p><w:r><w:t>Cobertura</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>94%</w:t></w:r></w:p></w:tc></w:tr>
              </w:tbl>
            </w:sdtContent>
          </w:sdt>
        </w:body>
      </w:document>`;

    const dom = new DOMParser().parseFromString(docXml, 'application/xml');
    const sdts = Array.from(dom.getElementsByTagNameNS('*', 'sdt'));
    expect(sdts).toHaveLength(2);
    expect(isTocSdtElement(sdts[0])).toBe(true);
    expect(isTocSdtElement(sdts[1])).toBe(false);

    const zip = new JSZip();
    zip.file(
      '[Content_Types].xml',
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>',
    );
    zip.file('word/document.xml', docXml);
    const docxBuffer = await zip.generateAsync({ type: 'uint8array' });
    const docxFile = new File([docxBuffer], 'con_sdt.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const result = await extractDocxInClient(docxFile);
    expect(result.blocks.some((b) => (b.text || '').includes('El índice de participación creció'))).toBe(true);
    expect(result.blocks.some((b) => b.kind === 'table' && b.tableHeaders?.includes('Indicador'))).toBe(true);
  });

  it('4. PDF: conserva páginas digitales cortas sin descartarlas y distingue prosa justificada de tablas reales', () => {
    const sparseSpans = normalizePdfRichSpans(
      [
        { str: 'CAPÍTULO 1', transform: [14, 0, 0, 14, 72, 700], width: 90 },
        { str: 'Introducción.', transform: [12, 0, 0, 12, 72, 675], width: 85 },
      ],
      {},
    );
    const sparseLines = groupSpansIntoRichLines(sparseSpans, 595);
    expect(hasUsableEditorialDigitalText(sparseLines)).toBe(true);
    expect(hasUsableEditorialDigitalText([])).toBe(false);

    // Prosa justificada con un espacio ensanchado de 23pt (< colGapMin 26.4pt) y >85 chars no debe convertirse en tabla
    const justifiedItems = [
      { str: 'El diagnóstico territorial contemporáneo exige considerar múltiples factores', transform: [11, 0, 0, 11, 60, 620], width: 320 },
      { str: 'históricos y estructurales en la región.', transform: [11, 0, 0, 11, 403, 620], width: 150 },
      { str: 'Asimismo las comunidades locales construyen redes de apoyo mutuo', transform: [11, 0, 0, 11, 60, 604], width: 315 },
      { str: 'fundamentales para sostener sus proyectos.', transform: [11, 0, 0, 11, 398, 604], width: 155 },
      { str: 'Finalmente los indicadores evaluados confirman la continuidad operativa', transform: [11, 0, 0, 11, 60, 588], width: 318 },
      { str: 'durante todo el ciclo escolar completo.', transform: [11, 0, 0, 11, 401, 588], width: 152 },
    ];
    const justifiedLines = groupSpansIntoRichLines(normalizePdfRichSpans(justifiedItems, {}), 595);
    expect(detectTablesInPageLines(justifiedLines, 11)).toHaveLength(0);
  });

  it('5. Limpia secciones semilla vacías al importar, detecta contenido real y reconoce prefijos ed_copy_', () => {
    const emptySeedExisting: EditorialSection[] = [
      {
        id: 'cap_1',
        sectionKey: 'capitulo',
        category: 'cuerpo',
        kind: 'chapter',
        title: 'Capítulo 1',
        position: 0,
        records: [{ id: 'rec_seed_intro', type: 'paragraph', content: '' }],
      },
    ];
    const incoming: EditorialSection[] = [
      {
        id: 'sec_imp_1',
        sectionKey: 'introduccion',
        category: 'cuerpo',
        kind: 'chapter',
        title: 'Introducción importada',
        position: 0,
        records: [{ id: 'rec_1', type: 'paragraph', content: 'Texto real del manuscrito.' }],
      },
    ];

    expect(hasEditorialSubstantiveContent(emptySeedExisting)).toBe(false);
    expect(
      hasEditorialSubstantiveContent([
        {
          id: 'cap_img',
          records: [{ id: 'r1', type: 'image', content: '', imagePath: 'asset_img_1' }],
        },
      ]),
    ).toBe(true);

    const merged = applyEditorialImportMergePlan({
      existingSections: emptySeedExisting,
      incomingSections: incoming,
      decisions: { sec_imp_1: { action: 'new' } },
      replaceAll: false,
    });
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe('Introducción importada');

    expect(matchesDocumentTypeId('ed_copy_1730000000', 'editorial')).toBe(true);
    expect(matchesDocumentTypeId('ed_teamcopy_1730000000', 'editorial')).toBe(true);
  });
});
