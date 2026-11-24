// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { extractDocxInClient } from '../../src/modules/editor-lee-studio/domain/docxClientExtractor';
import { buildSectionsFromDocxRichBlocks } from '../../src/modules/editor-lee-studio/domain/editorialManuscriptChunker';

async function buildRichTestDocx(bodyXml: string, footnotesXml?: string): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    'word/styles.xml',
    `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:style w:type="paragraph" w:styleId="Ttulo1"><w:name w:val="Título 1"/></w:style>
      <w:style w:type="paragraph" w:styleId="Ttulo2"><w:name w:val="Título 2"/></w:style>
      <w:style w:type="paragraph" w:styleId="TOC1"><w:name w:val="toc 1"/></w:style>
    </w:styles>`,
  );
  if (footnotesXml) {
    zip.file('word/footnotes.xml', footnotesXml);
  }
  zip.file(
    'word/document.xml',
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>${bodyXml}</w:body>
    </w:document>`,
  );
  return zip.generateAsync({ type: 'uint8array' });
}

describe('EditorLee Extractor OOXML v2 (docxClientExtractor + chunker)', () => {
  it('conserva negrita/cursiva, notas al pie, omite <w:del> e índices manuales (ÍNDICE GENERAL)', async () => {
    const bytes = await buildRichTestDocx(
      `
      <w:p><w:pPr><w:pStyle w:val="Ttulo1"/></w:pPr><w:r><w:t>ÍNDICE GENERAL</w:t></w:r></w:p>
      <w:p><w:r><w:t>Introducción .... 5</w:t></w:r></w:p>
      <w:p><w:r><w:t>Capítulo 1 .... 12</w:t></w:r></w:p>
      <w:p><w:pPr><w:pStyle w:val="Ttulo1"/></w:pPr><w:r><w:t>Capítulo 1: Fundamentos</w:t></w:r></w:p>
      <w:p>
        <w:r><w:t>Texto con </w:t></w:r>
        <w:r><w:rPr><w:b/></w:rPr><w:t>énfasis clave</w:t></w:r>
        <w:r><w:t> y </w:t></w:r>
        <w:r><w:rPr><w:i/></w:rPr><w:t>voz interna</w:t></w:r>
        <w:del><w:r><w:delText>texto borrado</w:delText></w:r></w:del>
        <w:r><w:footnoteReference w:id="2"/></w:r>
      </w:p>
      `,
      `<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:t>---</w:t></w:r></w:p></w:footnote>
        <w:footnote w:id="2"><w:p><w:r><w:t>Nota metodológica aclaratoria.</w:t></w:r></w:p></w:footnote>
      </w:footnotes>`,
    );

    const extracted = await extractDocxInClient(bytes);
    expect(extracted.stats.ignoredTocBlocks).toBe(3);
    expect(extracted.plainMarkdownText).not.toContain('texto borrado');
    expect(extracted.blocks.some((b) => b.kind === 'paragraph' && b.text?.includes('**énfasis clave**'))).toBe(true);
    expect(extracted.blocks.some((b) => b.kind === 'paragraph' && b.text?.includes('*voz interna*'))).toBe(true);
    expect(extracted.blocks.some((b) => b.kind === 'footnote_list' && b.footnotes?.[0]?.text === 'Nota metodológica aclaratoria.')).toBe(true);
  });

  it('convierte tabla de 1 columna y bloques sombreados CAJA N en callouts intactos sin vaciarlos', async () => {
    const bytes = await buildRichTestDocx(`
      <w:p><w:pPr><w:pStyle w:val="Ttulo1"/></w:pPr><w:r><w:t>Marco Normativo</w:t></w:r></w:p>
      <w:tbl>
        <w:tr><w:tc>
          <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Resguardo ético Ley 26.061</w:t></w:r></w:p>
          <w:p><w:r><w:t>Protección integral de derechos en entornos educativos.</w:t></w:r></w:p>
        </w:tc></w:tr>
      </w:tbl>
      <w:p><w:pPr><w:shd w:fill="F1F5F9"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>CAJA 2: Emociones de logro (Pekrun)</w:t></w:r></w:p>
      <w:p><w:pPr><w:shd w:fill="F1F5F9"/></w:pPr><w:r><w:t>• Alegría durante la comprensión.</w:t></w:r></w:p>
      <w:p><w:pPr><w:shd w:fill="F1F5F9"/></w:pPr><w:r><w:t>• Orgullo tras sostener el esfuerzo.</w:t></w:r></w:p>
    `);

    const extracted = await extractDocxInClient(bytes);
    const callouts = extracted.blocks.filter((b) => b.kind === 'callout');
    expect(callouts).toHaveLength(2);
    expect(callouts[0].calloutVariant).toBe('resguardo');
    expect(callouts[0].calloutTitle).toContain('Resguardo ético');
    expect(callouts[0].text).toContain('Protección integral');
    expect(callouts[1].calloutVariant).toBe('caja');
    expect(callouts[1].calloutTitle).toContain('CAJA 2');
    expect(callouts[1].calloutItems).toHaveLength(2);
  });

  it('fusiona H1 + ◆ + H2 en una sección con kickerLabel y conserva H2 internos como subtítulos + poemas + figuras', async () => {
    const bytes = await buildRichTestDocx(`
      <w:p><w:pPr><w:pStyle w:val="Ttulo1"/></w:pPr><w:r><w:t>BLOQUE I</w:t></w:r></w:p>
      <w:p><w:r><w:t>◆</w:t></w:r></w:p>
      <w:p><w:pPr><w:pStyle w:val="Ttulo2"/></w:pPr><w:r><w:t>La primera vez</w:t></w:r></w:p>
      <w:p><w:pPr><w:pStyle w:val="Ttulo2"/></w:pPr><w:r><w:t>1.1 Escena inicial</w:t></w:r></w:p>
      <w:p><w:r><w:t>Cuando abriste la puerta</w:t></w:r></w:p>
      <w:p><w:r><w:t>quedó el patio en silencio</w:t></w:r></w:p>
      <w:p><w:r><w:t>y el cuaderno esperaba</w:t></w:r></w:p>
      <w:p><w:r><w:t>su primera palabra</w:t></w:r></w:p>
      <w:p><w:r><w:t>[Insertar Figura 1: Mapa emocional del aula]</w:t></w:r></w:p>
    `);

    const extracted = await extractDocxInClient(bytes);
    const sections = buildSectionsFromDocxRichBlocks(extracted.blocks);
    expect(sections).toHaveLength(1);
    expect(sections[0].kickerLabel).toBe('BLOQUE I');
    expect(sections[0].title).toBe('La primera vez');

    const types = sections[0].records.map((r) => r.type);
    expect(types).toContain('subtitle');
    expect(types).toContain('poem');
    expect(types).toContain('figure_placeholder');

    const poem = sections[0].records.find((r) => r.type === 'poem');
    expect(poem?.content.split('\n')).toHaveLength(4);
    const fig = sections[0].records.find((r) => r.type === 'figure_placeholder');
    expect(fig?.figureNumber).toContain('1');
  });
});
