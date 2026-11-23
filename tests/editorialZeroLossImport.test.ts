// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { extractDocxInClient } from '../src/modules/editor-lee-studio/domain/docxClientExtractor';
import {
  buildSectionsFromDocxRichBlocks,
  countNonWhitespaceChars,
  countSectionRecordsChars,
} from '../src/modules/editor-lee-studio/domain/editorialManuscriptChunker';
import { buildEditorialDockTabs } from '../src/modules/editor-lee-studio/domain/editorialDockEngine';
import '../src/modules/editor-lee-studio/pdf/editorialPresets';
import { getPreset } from '../src/shared/core/pdf-engine/layers/presets/presetRegistry';

describe('EditorLee Fase 7 — Zero-Loss DOCX, Gráficos, Dock dinámico y Preset Registry', () => {
  it('registra EDITORIAL_PRESETS en presetRegistry para no exportar un CV en blanco', () => {
    const preset = getPreset('tesis-apa7');
    expect(preset.id).toBe('tesis-apa7');
    expect(preset.pageCategory).toBe('editorial');
  });

  it('extrae .docx con Headings, TOC ignorado, tabla y gráfico XML conservando el 100% del texto y generando botones del Dock', async () => {
    const zip = new JSZip();
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
        <Relationship Id="rChart1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="charts/chart1.xml"/>
      </Relationships>`,
    );
    zip.file(
      'word/charts/chart1.xml',
      `<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
        <c:chart>
          <c:title><c:tx><c:rich><a:p xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:r><a:t>Ventas Anuales</a:t></a:r></a:p></c:rich></c:tx></c:title>
          <c:plotArea>
            <c:barChart>
              <c:ser>
                <c:tx><c:v>2026</c:v></c:tx>
                <c:cat><c:strCache><c:pt idx="0"><c:v>Enero</c:v></c:pt><c:pt idx="1"><c:v>Febrero</c:v></c:pt></c:strCache></c:cat>
                <c:val><c:numCache><c:pt idx="0"><c:v>120</c:v></c:pt><c:pt idx="1"><c:v>185</c:v></c:pt></c:numCache></c:val>
              </c:ser>
            </c:barChart>
          </c:plotArea>
        </c:chart>
      </c:chartSpace>`,
    );
    zip.file(
      'word/document.xml',
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <w:body>
          <w:p><w:pPr><w:pStyle w:val="TOC1"/></w:pPr><w:r><w:t>Capítulo 1 ...... 3</w:t></w:r></w:p>
          <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Introducción</w:t></w:r></w:p>
          <w:p><w:r><w:t>Este texto introductorio completo nunca debe perderse al importar.</w:t></w:r></w:p>
          <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Capítulo 1: Marco Teórico</w:t></w:r></w:p>
          <w:p><w:r><w:t>Desarrollo detallado de las fuentes y resultados.</w:t></w:r></w:p>
          <w:p><w:r><c:chart r:id="rChart1"/></w:r></w:p>
          <w:tbl>
            <w:tr><w:tc><w:p><w:r><w:t>Año</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Valor</w:t></w:r></w:p></w:tc></w:tr>
            <w:tr><w:tc><w:p><w:r><w:t>2026</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>98%</w:t></w:r></w:p></w:tc></w:tr>
          </w:tbl>
        </w:body>
      </w:document>`,
    );

    const bytes = await zip.generateAsync({ type: 'uint8array' });
    const extracted = await extractDocxInClient(bytes);

    expect(extracted.stats.ignoredTocBlocks).toBe(1);
    expect(extracted.stats.headings).toBe(2);
    expect(extracted.stats.tables).toBe(1);
    expect(extracted.stats.chartsConverted).toBe(1);
    expect(extracted.plainMarkdownText).toContain('Este texto introductorio completo nunca debe perderse al importar.');

    const sections = buildSectionsFromDocxRichBlocks(extracted.blocks);
    expect(sections.length).toBe(2);
    expect(sections[0].title).toBe('Introducción');
    expect(sections[1].title).toBe('Capítulo 1: Marco Teórico');

    // Verificar 100% retención de caracteres de párrafos
    const kept = countSectionRecordsChars(sections);
    expect(kept).toBeGreaterThanOrEqual(
      countNonWhitespaceChars('Este texto introductorio completo nunca debe perderse al importar.Desarrollo detallado de las fuentes y resultados.'),
    );

    // Verificar generación de botones del Dock para los capítulos importados
    const dockTabs = buildEditorialDockTabs({ cvData: { sections } });
    const chapterTabs = dockTabs.filter((t) => t.id.startsWith('ed_'));
    expect(chapterTabs.length).toBe(2);
  });
});
