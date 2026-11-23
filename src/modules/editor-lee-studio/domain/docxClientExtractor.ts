/**
 * Extractor OOXML determinístico en el navegador para archivos Word (`.docx`).
 * Usa `JSZip` de forma lazy (`await import('jszip')`) para no inflar el bundle inicial.
 * Conserva el 100% del texto, encabezados reales, tablas, imágenes y gráficos (convertidos a PNG).
 */

import { parseWordChartXml, renderParsedWordChartToPngDataUrl } from './docxChartRenderer';

export interface DocxExtractedRichBlock {
  kind: 'heading' | 'paragraph' | 'list' | 'table' | 'image' | 'callout';
  level?: number;
  text?: string;
  tableHeaders?: string[];
  tableRows?: string[][];
  imageDataUrl?: string;
  imageCaption?: string;
}

export interface DocxClientExtractionResult {
  plainMarkdownText: string;
  blocks: DocxExtractedRichBlock[];
  warnings: string[];
  stats: {
    headings: number;
    paragraphs: number;
    tables: number;
    images: number;
    chartsConverted: number;
    ignoredTocBlocks: number;
  };
}

function getLocalChildren(el: Element, localName: string): Element[] {
  const out: Element[] = [];
  for (let i = 0; i < el.children.length; i++) {
    if (el.children[i].localName === localName) out.push(el.children[i]);
  }
  return out;
}

function getAllByLocal(el: Document | Element, localName: string): Element[] {
  const all = el.getElementsByTagName('*');
  const out: Element[] = [];
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName === localName) out.push(all[i]);
  }
  return out;
}

function extractParagraphPlainText(p: Element): string {
  const parts: string[] = [];
  const all = p.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    const node = all[i];
    if (node.localName === 't') parts.push(node.textContent || '');
    else if (node.localName === 'tab') parts.push(' ');
    else if (node.localName === 'br') parts.push('\n');
  }
  return parts.join('').replace(/[ \t]+/g, ' ').trim();
}

function resolveHeadingLevel(p: Element, stylesById: Map<string, { name: string; outlineLvl?: number }>): number | null {
  const pPr = getLocalChildren(p, 'pPr')[0];
  if (!pPr) return null;

  const outlineNode = getLocalChildren(pPr, 'outlineLvl')[0];
  const outlineAttr = outlineNode?.getAttribute('w:val') ?? outlineNode?.getAttribute('val');
  if (outlineAttr !== null && outlineAttr !== undefined) {
    const n = Number(outlineAttr);
    if (Number.isFinite(n) && n >= 0 && n <= 3) return n + 1;
  }

  const pStyle = getLocalChildren(pPr, 'pStyle')[0];
  const styleId = pStyle?.getAttribute('w:val') ?? pStyle?.getAttribute('val') ?? '';
  if (!styleId) return null;

  const meta = stylesById.get(styleId);
  const candidate = `${styleId} ${meta?.name || ''}`.toLowerCase();
  if (candidate.includes('toc') || candidate.includes('indice') || candidate.includes('tdc')) {
    return null;
  }
  const match = candidate.match(/(?:heading|titulo|title)\s*([1-4])/i);
  if (match) return Number(match[1]);
  if (candidate === 'title' || candidate === 'titulo') return 1;
  if (meta?.outlineLvl !== undefined && meta.outlineLvl >= 0 && meta.outlineLvl <= 3) {
    return meta.outlineLvl + 1;
  }
  return null;
}

function isTocParagraph(p: Element, stylesById: Map<string, { name: string; outlineLvl?: number }>): boolean {
  const pPr = getLocalChildren(p, 'pPr')[0];
  const pStyle = pPr ? getLocalChildren(pPr, 'pStyle')[0] : null;
  const styleId = (pStyle?.getAttribute('w:val') ?? pStyle?.getAttribute('val') ?? '').toLowerCase();
  const metaName = (stylesById.get(styleId)?.name || '').toLowerCase();
  return (
    styleId.startsWith('toc') ||
    metaName.startsWith('toc') ||
    styleId.includes('tdc') ||
    metaName.includes('table of contents')
  );
}

function guessMimeFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
}

export async function extractDocxInClient(input: Blob | ArrayBuffer | Uint8Array): Promise<DocxClientExtractionResult> {
  const JSZip = (await import('jszip')).default;
  const bytes =
    input instanceof Uint8Array
      ? input
      : input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : new Uint8Array(await input.arrayBuffer());

  const zip = await JSZip.loadAsync(bytes);
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) {
    throw new Error('El archivo .docx no contiene word/document.xml.');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(docXml, 'application/xml');

  // 1. Estilos
  const stylesById = new Map<string, { name: string; outlineLvl?: number }>();
  const stylesXml = await zip.file('word/styles.xml')?.async('string');
  if (stylesXml) {
    const sDoc = parser.parseFromString(stylesXml, 'application/xml');
    for (const styleEl of getAllByLocal(sDoc, 'style')) {
      const id = styleEl.getAttribute('w:styleId') ?? styleEl.getAttribute('styleId') ?? '';
      if (!id) continue;
      const nameEl = getLocalChildren(styleEl, 'name')[0];
      const name = nameEl?.getAttribute('w:val') ?? nameEl?.getAttribute('val') ?? id;
      const pPr = getLocalChildren(styleEl, 'pPr')[0];
      const outlineEl = pPr ? getLocalChildren(pPr, 'outlineLvl')[0] : null;
      const oVal = outlineEl?.getAttribute('w:val') ?? outlineEl?.getAttribute('val');
      stylesById.set(id, {
        name,
        outlineLvl: oVal !== null && oVal !== undefined ? Number(oVal) : undefined,
      });
    }
  }

  // 2. Relaciones (media & charts)
  const relsById = new Map<string, string>();
  const relsXml = await zip.file('word/_rels/document.xml.rels')?.async('string');
  if (relsXml) {
    const rDoc = parser.parseFromString(relsXml, 'application/xml');
    for (const rel of getAllByLocal(rDoc, 'Relationship')) {
      const id = rel.getAttribute('Id') || '';
      const target = rel.getAttribute('Target') || '';
      if (id && target) {
        relsById.set(id, target.startsWith('word/') ? target : `word/${target.replace(/^\/+/, '')}`);
      }
    }
  }

  const body = getAllByLocal(doc, 'body')[0];
  if (!body) {
    throw new Error('No se encontró el cuerpo del documento Word.');
  }

  const blocks: DocxExtractedRichBlock[] = [];
  const markdownLines: string[] = [];
  const warnings: string[] = [];
  const stats = {
    headings: 0,
    paragraphs: 0,
    tables: 0,
    images: 0,
    chartsConverted: 0,
    ignoredTocBlocks: 0,
  };

  let warnedSmartArt = false;

  const processParagraph = async (p: Element) => {
    if (isTocParagraph(p, stylesById)) {
      stats.ignoredTocBlocks++;
      return;
    }

    // Imágenes embebidas (<a:blip r:embed="rId..."/>)
    const blips = getAllByLocal(p, 'blip');
    for (const blip of blips) {
      const rId = blip.getAttribute('r:embed') ?? blip.getAttribute('embed');
      const targetPath = rId ? relsById.get(rId) : undefined;
      if (targetPath && /\.(png|jpe?g|webp|gif)$/i.test(targetPath)) {
        const mediaFile = zip.file(targetPath);
        if (mediaFile) {
          const b64 = await mediaFile.async('base64');
          const mime = guessMimeFromPath(targetPath);
          blocks.push({
            kind: 'image',
            imageDataUrl: `data:${mime};base64,${b64}`,
            imageCaption: '',
          });
          stats.images++;
        }
      }
    }

    // Gráficos (<c:chart r:id="rId..."/>)
    const charts = getAllByLocal(p, 'chart');
    for (const ch of charts) {
      const rId = ch.getAttribute('r:id') ?? ch.getAttribute('id');
      const targetPath = rId ? relsById.get(rId) : undefined;
      if (targetPath) {
        const chartXml = await zip.file(targetPath)?.async('string');
        if (chartXml) {
          const parsed = parseWordChartXml(chartXml);
          if (parsed) {
            const png = renderParsedWordChartToPngDataUrl(parsed);
            if (png) {
              blocks.push({
                kind: 'image',
                imageDataUrl: png,
                imageCaption: parsed.title,
              });
              stats.chartsConverted++;
            } else {
              // Fallback en entorno headless sin canvas: conservar datos como tabla
              blocks.push({
                kind: 'table',
                tableHeaders: ['Categoría', ...parsed.series.map((s) => s.name)],
                tableRows: parsed.categories.map((cat, idx) => [
                  cat,
                  ...parsed.series.map((s) => String(s.values[idx] ?? 0)),
                ]),
                text: parsed.title,
              });
              stats.chartsConverted++;
            }
          }
        }
      }
    }

    // Detectar SmartArt / WordArt
    if (!warnedSmartArt && (getAllByLocal(p, 'relIds').length > 0 || getAllByLocal(p, 'textpath').length > 0)) {
      warnedSmartArt = true;
      warnings.push(
        'Se detectó un gráfico SmartArt o WordArt: su texto se conservó intacto. Si querés el dibujo exacto de Word, hacé clic derecho sobre él en Word → Guardar como imagen y pegalo como bloque de imagen.',
      );
    }

    const text = extractParagraphPlainText(p);
    if (!text) return;

    const headingLvl = resolveHeadingLevel(p, stylesById);
    if (headingLvl) {
      const prefix = '#'.repeat(Math.min(3, headingLvl));
      blocks.push({ kind: 'heading', level: headingLvl, text });
      markdownLines.push(`${prefix} ${text}`);
      stats.headings++;
      return;
    }

    const pPr = getLocalChildren(p, 'pPr')[0];
    const isList = Boolean(pPr && getLocalChildren(pPr, 'numPr').length > 0);
    if (isList) {
      blocks.push({ kind: 'list', text });
      markdownLines.push(`• ${text}`);
      stats.paragraphs++;
      return;
    }

    blocks.push({ kind: 'paragraph', text });
    markdownLines.push(text);
    stats.paragraphs++;
  };

  for (let i = 0; i < body.children.length; i++) {
    const child = body.children[i];
    if (child.localName === 'p') {
      await processParagraph(child);
    } else if (child.localName === 'tbl') {
      const trNodes = getLocalChildren(child, 'tr');
      const matrix: string[][] = trNodes.map((tr) =>
        getLocalChildren(tr, 'tc').map((tc) =>
          getLocalChildren(tc, 'p').map(extractParagraphPlainText).filter(Boolean).join(' '),
        ),
      );
      if (matrix.length > 0) {
        const tableHeaders = matrix[0];
        const tableRows = matrix.slice(1);
        blocks.push({ kind: 'table', tableHeaders, tableRows });
        stats.tables++;
      }
    } else if (child.localName === 'sdt') {
      // Ignorar TOC automático encapsulado en Structured Document Tag
      const sdtXml = child.outerHTML || '';
      if (/Table of Contents|TOC|Índice|Indice/i.test(sdtXml)) {
        stats.ignoredTocBlocks++;
      } else {
        for (const p of getAllByLocal(child, 'p')) {
          await processParagraph(p);
        }
      }
    }
  }

  return {
    plainMarkdownText: markdownLines.join('\n\n').trim(),
    blocks,
    warnings,
    stats,
  };
}
