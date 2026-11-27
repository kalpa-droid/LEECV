import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertLosslessIntegrity,
  buildCompactSkeleton,
  detectSafeDocumentMime,
  formatBlockId,
  reconstructEditorialSectionsFromAst,
  repairProposalToLosslessBijection,
  type DocumentAST,
  type StructureAnalysis,
} from '../../src/shared/core/document-ast/documentAst';
import {
  resolveSectionEffectiveStartNewPage,
} from '../../src/modules/editor-lee-studio/domain/editorialPaginationEngine';
import { resolveEditorialSectionCoverState } from '../../src/modules/editor-lee-studio/domain/sanitizeEditorialData';
import {
  createDefaultEditorialRecord,
  insertRecordAt,
  moveRecord,
  reorderRecord,
  splitParagraphRecord,
} from '../../src/modules/editor-lee-studio/domain/editorialBlockOperations';
import { EditorialPdfDocument } from '../../src/modules/editor-lee-studio/pdf/EditorialPdfDocument';

describe('EditorLee V3.12.0 — AST Lossless, Cascada Global-Sección y Lienzo Limpio', () => {
  it('detecta magic bytes reales y rechaza ejecutables o binarios con bytes NUL', () => {
    expect(detectSafeDocumentMime(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe('pdf');
    expect(detectSafeDocumentMime(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14]))).toBe('docx');
    expect(detectSafeDocumentMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe('png');
    expect(detectSafeDocumentMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
    expect(detectSafeDocumentMime(new TextEncoder().encode('Capítulo 1\nTexto limpio'))).toBe('text');
    expect(detectSafeDocumentMime(new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03]))).toBeNull();
  });

  it('construye esqueleto compacto por punteros, audita biyección 1:1 y recupera bloques perdidos o inventados', () => {
    const ast: DocumentAST = {
      docId: 'doc_test_1',
      sourceName: 'informe.docx',
      sourceMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      totalPages: 2,
      blocks: [
        {
          id: formatBlockId(0),
          type: 'heading',
          page: 1,
          order: 0,
          headingLevel: 1,
          text: 'Introducción',
          sha256: 'h1',
        },
        {
          id: formatBlockId(1),
          type: 'paragraph',
          page: 1,
          order: 1,
          text: 'Primer párrafo original completo que no debe perder ni una coma.',
          sha256: 'h2',
        },
        {
          id: formatBlockId(2),
          type: 'table',
          page: 1,
          order: 2,
          tableData: {
            headers: ['Año', 'Total'],
            rows: [['2025', '120'], ['2026', '180']],
            caption: 'Tabla 1',
            hasHeaderRow: true,
          },
          sha256: 'h3',
        },
        {
          id: formatBlockId(3),
          type: 'image',
          page: 2,
          order: 3,
          assetRef: {
            assetId: 'asset://sha256_fig1',
            mimeType: 'image/png',
            semanticSummary: 'Diagrama de flujo editorial',
          },
          sha256: 'h4',
        },
      ],
    };

    const skeleton = buildCompactSkeleton(ast);
    expect(skeleton).toContain('[blk_00001|P1|H1]');
    expect(skeleton).toContain('[blk_00003|P1|TABLE|2x2|headers:Año, Total]');
    expect(skeleton).toContain('[blk_00004|P2|IMAGE|asset:asset://sha256');

    const flawedProposal: StructureAnalysis = {
      documentType: 'business_report',
      currentStructureScore: 84,
      keepOriginalStructure: false,
      diagnosis: ['Orden claro'],
      improvementSuggestions: [],
      proposedSections: [
        {
          sectionId: 'sec_1',
          sectionKey: 'introduccion',
          category: 'preliminares',
          title: 'Introducción',
          level: 1,
          // Omite blk_00003 (tabla), duplica blk_00002 e inventa blk_99999
          blockIds: ['blk_00001', 'blk_00002', 'blk_00002', 'blk_99999', 'blk_00004'],
          rationale: 'Prueba',
        },
      ],
    };

    const preAudit = assertLosslessIntegrity(ast, flawedProposal);
    expect(preAudit.valid).toBe(false);
    expect(preAudit.missingIds).toEqual(['blk_00003']);
    expect(preAudit.extraIds).toEqual(['blk_99999']);
    expect(preAudit.duplicateIds).toEqual(['blk_00002']);

    const { repaired, recoveredCount, dedupedCount } = repairProposalToLosslessBijection(
      ast,
      flawedProposal,
    );
    expect(recoveredCount).toBe(1);
    expect(dedupedCount).toBe(2);
    expect(assertLosslessIntegrity(ast, repaired).valid).toBe(true);

    const sections = reconstructEditorialSectionsFromAst(ast, repaired, {
      sourceOrigin: 'docx',
      assetUrlMap: { 'asset://sha256_fig1': 'data:image/png;base64,AAA' },
    });
    expect(sections).toHaveLength(1);
    expect(sections[0].records.map((r) => r.type)).toEqual(['paragraph', 'table', 'image']);
    expect(sections[0].records[1].tableRows).toEqual([['2025', '120'], ['2026', '180']]);
    expect(sections[0].records[2].imagePath).toBe('data:image/png;base64,AAA');
  });

  it('respeta cascada global -> sección para saltos de página, carátulas separadoras y columnas de cuerpo', () => {
    const secHereditaria = { id: 's1', title: 'Capítulo 1', category: 'cuerpo' as const, records: [] };
    const secForzada = {
      id: 's2',
      title: 'Capítulo 2',
      category: 'cuerpo' as const,
      startNewPageOverride: false,
      sectionCover: { mode: 'on' as const },
      columnsOverride: 2 as const,
      records: [],
    };
    const designConCaratulas = {
      sectionDividers: { enabled: true, scope: 'body-chapters', inheritCoverStyle: true, blankBackPage: true },
    };

    expect(resolveSectionEffectiveStartNewPage(secHereditaria, 'continuous', {}, {})).toBe(false);
    expect(resolveSectionEffectiveStartNewPage(secHereditaria, 'next_page', {}, {})).toBe(true);
    expect(resolveSectionEffectiveStartNewPage(secHereditaria, 'continuous', designConCaratulas, {})).toBe(true);

    // Override explícito a falso sin carátula vs carátula activa
    expect(
      resolveSectionEffectiveStartNewPage(
        { id: 's3', title: 'Cap 3', category: 'cuerpo', startNewPageOverride: false },
        'next_page',
        {},
        {},
      ),
    ).toBe(false);
    expect(resolveEditorialSectionCoverState(secHereditaria, designConCaratulas, {}).enabled).toBe(true);
    expect(resolveEditorialSectionCoverState(secForzada, {}, {}).enabled).toBe(true);
    expect(
      resolveEditorialSectionCoverState(
        { ...secHereditaria, sectionCover: { mode: 'off' } },
        designConCaratulas,
        {},
      ).enabled,
    ).toBe(false);

    // El PDF renderiza correctamente con bodyColumns = 2 global y columnsOverride por sección
    const doc = EditorialPdfDocument({
      data: {
        design: { presetId: 'informe-tecnico', bodyColumns: 2 },
        metadata: { title: 'Obra Dos Columnas' },
        cover: { mode: 'sin-caratula' },
        tocConfig: { enabled: false },
        sections: [
          {
            id: 'c1',
            title: 'Capítulo 1',
            category: 'cuerpo',
            visible: true,
            includeInToc: true,
            position: 0,
            records: [
              { id: 'r1', type: 'paragraph', content: 'Párrafo A en dos columnas.' },
              { id: 'r2', type: 'paragraph', content: 'Párrafo B en dos columnas.' },
            ],
          },
        ],
      } as any,
    });
    expect(doc).toBeTruthy();
  });

  it('inserta, reordena y divide párrafos en la posición exacta sin corromper bloques vecinos', () => {
    const p1 = createDefaultEditorialRecord('paragraph', {
      id: 'p_1',
      content: 'Primera oración del ensayo. Segunda oración para partir aquí.',
    });
    const p2 = createDefaultEditorialRecord('paragraph', { id: 'p_2', content: 'Segundo bloque' });
    const q = createDefaultEditorialRecord('quote', { id: 'q_1', content: 'Cita intercalada' });

    const inserted = insertRecordAt([p1, p2], 1, q);
    expect(inserted.map((r) => r.id)).toEqual(['p_1', 'q_1', 'p_2']);

    const moved = moveRecord(inserted, 1, -1);
    expect(moved.map((r) => r.id)).toEqual(['q_1', 'p_1', 'p_2']);

    const reordered = reorderRecord(moved, 2, 0);
    expect(reordered.map((r) => r.id)).toEqual(['p_2', 'q_1', 'p_1']);

    const split = splitParagraphRecord([p1], 'p_1', 'Primera oración del ensayo.'.length);
    expect(split.records).toHaveLength(2);
    expect(split.records[0].content).toBe('Primera oración del ensayo.');
    expect(split.records[1].content).toBe('Segunda oración para partir aquí.');
    expect(split.createdId).toBe(split.records[1].id);
  });

  it('verifica limpieza de UI EditorLee V3.12.0 (sin banners repetidos, sin guías viejas ni paneles huérfanos)', () => {
    const root = resolve(__dirname, '../..');
    const studioContent = readFileSync(
      resolve(root, 'src/modules/editor-lee-studio/EditorLeeStudioContent.tsx'),
      'utf8',
    );
    const chapterPanel = readFileSync(
      resolve(root, 'src/modules/editor-lee-studio/ui/EditorialSectionFocusPanel.tsx'),
      'utf8',
    );

    expect(studioContent).not.toContain('LocalBackupShieldBanner');
    expect(chapterPanel).not.toContain('Orientación para esta parte');
    expect(
      existsSync(resolve(root, 'src/modules/editor-lee-studio/ui/EditorialPresetInicioPanel.tsx')),
    ).toBe(false);
    expect(
      existsSync(resolve(root, 'src/modules/editor-lee-studio/panels/EditorialImportAiPanel.tsx')),
    ).toBe(false);
  });
});
