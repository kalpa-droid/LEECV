// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { hasUsableEditorialDigitalText } from '../src/modules/editor-lee-studio/domain/pdfEditorialExtractor';
import {
  groupSpansIntoRichLines,
  normalizePdfRichSpans,
  type PdfRichLine,
} from '../src/modules/editor-lee-studio/domain/pdfGeometryHelpers';
import {
  reconstructEditorialSectionsFromAst,
  repairProposalToLosslessBijection,
  type CanonicalBlock,
  type DocumentAST,
  type StructureAnalysis,
} from '../src/shared/core/document-ast/documentAst';
import {
  sectionHasImportableRecords,
  structureManuscriptInChunks,
} from '../src/modules/editor-lee-studio/domain/editorialUniversalImporter';
import { StructuredImportReviewModal } from '../src/shared/core/ui/StructuredImportReviewModal';
import type { EditorialSection } from '../src/modules/editor-lee-studio/domain/editorialTypes';

afterEach(() => {
  cleanup();
});

function makeLinesFromStrings(entries: Array<{ str: string; y?: number }>): PdfRichLine[] {
  return groupSpansIntoRichLines(
    normalizePdfRichSpans(
      entries.map((entry, idx) => ({
        str: entry.str,
        transform: [12, 0, 0, 12, 72, entry.y ?? 700 - idx * 20],
        width: Math.max(40, entry.str.length * 6),
      })),
      {},
    ),
    595,
  );
}

function makeAstBlock(
  idx: number,
  text: string,
  type: CanonicalBlock['type'] = 'paragraph',
  page = 1,
): CanonicalBlock {
  return {
    id: `blk_${String(idx).padStart(5, '0')}`,
    type,
    page,
    order: idx - 1,
    text,
    sha256: `sha_${idx}`,
  };
}

describe('V3.14.3 — Importación PDF visible en EditorLee y auto-aplicación en borrador vacío', () => {
  it('1. hasUsableEditorialDigitalText rechaza glifos PUA/CID rotos, sellos de escáner y folios, pero acepta español real', () => {
    const puaLines = makeLinesFromStrings([
      { str: '\uE001\uE002\uE003\uE004\uE005\uE006\uE007\uE008\uE009\uE00A\uE00B\uE00C\uE00D\uE00E' },
    ]);
    expect(hasUsableEditorialDigitalText(puaLines, 842)).toBe(false);

    const replacementGlyphLines = makeLinesFromStrings([
      { str: '\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD' },
    ]);
    expect(hasUsableEditorialDigitalText(replacementGlyphLines, 842)).toBe(false);

    const fusedCidLines = makeLinesFromStrings([
      { str: 'EstacadenaesuncodigoCIDsintodoelespaciadorealentrepalabraslargasdeimprenta' },
    ]);
    expect(hasUsableEditorialDigitalText(fusedCidLines, 842)).toBe(false);

    const scannerAndFolioLines = makeLinesFromStrings([
      { str: 'Scanned with CamScanner', y: 40 },
      { str: 'Página 10 de 15', y: 30 },
    ]);
    expect(hasUsableEditorialDigitalText(scannerAndFolioLines, 842)).toBe(false);

    const validSpanishLines = makeLinesFromStrings([
      { str: 'Capítulo 1', y: 700 },
      { str: 'Introducción al diagnóstico territorial.', y: 675 },
    ]);
    expect(hasUsableEditorialDigitalText(validSpanishLines, 842)).toBe(true);
  });

  it('2. repairProposalToLosslessBijection limpia startBlockId/endBlockId residuales y reconstructEditorialSectionsFromAst omite secciones vacías', () => {
    const blocks: CanonicalBlock[] = [
      makeAstBlock(1, 'Introducción general', 'heading', 1),
      makeAstBlock(2, 'Primer párrafo real del documento PDF importado.', 'paragraph', 1),
      makeAstBlock(3, '   ', 'paragraph', 1),
      makeAstBlock(4, 'Capítulo 2: Desarrollo', 'heading', 2),
      makeAstBlock(5, 'Segundo párrafo con contenido relevante en la página dos.', 'paragraph', 2),
    ];

    const ast: DocumentAST = {
      docId: 'ast_v3143',
      sourceName: 'manuscrito.pdf',
      sourceMime: 'application/pdf',
      totalPages: 2,
      blocks,
    };

    const multiWindowProposal: StructureAnalysis = {
      documentType: 'book',
      currentStructureScore: 85,
      keepOriginalStructure: true,
      diagnosis: ['Estructura clara'],
      improvementSuggestions: [],
      proposedSections: [
        {
          sectionId: 'sec_1',
          sectionKey: 'introduccion',
          category: 'preliminares',
          title: 'Introducción general',
          level: 1,
          startBlockId: 'blk_00001',
          endBlockId: 'blk_00003',
          blockIds: [],
          rationale: 'Rango ventana 1',
        },
        {
          sectionId: 'sec_2',
          sectionKey: 'capitulo',
          category: 'cuerpo',
          title: 'Capítulo 2: Desarrollo',
          level: 1,
          startBlockId: 'blk_00004',
          endBlockId: 'blk_00005',
          blockIds: [],
          rationale: 'Rango ventana 2',
        },
        {
          sectionId: 'sec_only_empty_para',
          sectionKey: 'capitulo',
          category: 'cuerpo',
          title: 'Sección fantasma vacía',
          level: 1,
          blockIds: ['blk_00003'],
          rationale: 'Solo espacio en blanco',
        },
      ],
    };

    const { repaired } = repairProposalToLosslessBijection(ast, multiWindowProposal);
    for (const sec of repaired.proposedSections) {
      expect(sec.startBlockId).toBeUndefined();
      expect(sec.endBlockId).toBeUndefined();
      expect(sec.excludedBlockIds).toBeUndefined();
    }

    const reconstructed = reconstructEditorialSectionsFromAst(ast, repaired);
    expect(reconstructed.length).toBeGreaterThanOrEqual(2);
    expect(reconstructed.every((s) => s.records.length > 0)).toBe(true);
    expect(reconstructed.some((s) => s.title === 'Sección fantasma vacía')).toBe(false);
    const allTexts = reconstructed.flatMap((s) => s.records.map((r) => r.content));
    expect(allTexts).toContain('Primer párrafo real del documento PDF importado.');
    expect(allTexts).toContain('Segundo párrafo con contenido relevante en la página dos.');
  });

  it('3. structureManuscriptInChunks y sectionHasImportableRecords siempre devuelven secciones con contenido real visible', async () => {
    const emptySec: EditorialSection = {
      id: 'sec_empty',
      title: 'Vacía',
      category: 'cuerpo',
      visible: true,
      includeInToc: true,
      startNewPage: true,
      position: 0,
      records: [{ id: 'rec_0', type: 'paragraph', content: '   ' }],
    };
    const filledSec: EditorialSection = {
      ...emptySec,
      id: 'sec_filled',
      title: 'Con texto',
      records: [{ id: 'rec_1', type: 'paragraph', content: 'Párrafo importado visible.' }],
    };
    expect(sectionHasImportableRecords(emptySec)).toBe(false);
    expect(sectionHasImportableRecords(filledSec)).toBe(true);

    const blocks: CanonicalBlock[] = [
      makeAstBlock(1, 'Introducción', 'heading', 1),
      makeAstBlock(2, 'Este documento describe la arquitectura completa del proyecto editorial.', 'paragraph', 1),
    ];
    const ast: DocumentAST = {
      docId: 'ast_chunks_v3143',
      sourceName: 'manual.pdf',
      sourceMime: 'application/pdf',
      totalPages: 1,
      blocks,
    };

    const res = await structureManuscriptInChunks({
      fullText: 'Introducción\n\nEste documento describe la arquitectura completa del proyecto editorial.',
      sourceFormat: 'pdf',
      ast,
    });
    expect(res.sections.length).toBeGreaterThanOrEqual(1);
    expect(res.sections.every((s) => sectionHasImportableRecords(s))).toBe(true);
  });

  it('4. StructuredImportReviewModal bloquea el cierre accidental por clic en el fondo y solo cierra al pulsar Cancelar', () => {
    const onCancel = vi.fn();

    render(
      React.createElement(
        StructuredImportReviewModal,
        {
          isOpen: true,
          title: 'Revisar estructura detectada antes de aplicar',
          onCancel,
          scalarCount: 3,
          recordCount: 2,
          conflictCount: 0,
          activeFilter: 'all',
          onFilterChange: () => {},
          footer: React.createElement(
            'button',
            { type: 'button', onClick: onCancel },
            'Cancelar',
          ),
        },
        React.createElement('div', null, 'Contenido de revisión'),
      ),
    );

    const modalCard = screen.getByText('Revisar estructura detectada antes de aplicar').closest('[data-ui-modal="true"]');
    const backdrop = modalCard?.parentElement;
    expect(backdrop).toBeTruthy();

    if (backdrop) {
      fireEvent.click(backdrop);
    }
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
