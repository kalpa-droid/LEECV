/**
 * Extractor nativo en navegador para LibreOffice Writer (`.odt`) sin pérdidas.
 * Lee `content.xml`, `styles.xml` y `Pictures/*` directamente con `JSZip` + `DOMParser`,
 * preservando encabezados, listas, tablas, notas al pie, fórmulas MathML, imágenes e índice original.
 */

import type {
  DocxClientExtractionResult,
  DocxExtractedRichBlock,
  ImportedTocEntry,
} from './docxClientExtractor';

function normalizeNfdLower(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
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

function extractOdtMathText(mathEl: Element): string {
  const raw = (mathEl.textContent || '').replace(/\s+/g, ' ').trim();
  return raw;
}

function extractOdtParagraphText(
  node: Element,
  options: {
    collectedFootnotes?: { number: number; text: string }[];
    nextFnCounter: { value: number };
    boldStyleNames: Set<string>;
    italicStyleNames: Set<string>;
  },
): string {
  const parts: string[] = [];

  const walk = (el: Element) => {
    for (let i = 0; i < el.childNodes.length; i++) {
      const child = el.childNodes[i];
      if (child.nodeType === 3) {
        parts.push(child.textContent || '');
        continue;
      }
      if (child.nodeType !== 1) continue;
      const elem = child as Element;
      const local = elem.localName;

      if (local === 's') {
        const cnt = Number(elem.getAttribute('text:c') || elem.getAttribute('c') || 1);
        parts.push(' '.repeat(Math.min(16, Math.max(1, cnt))));
      } else if (local === 'tab') {
        parts.push(' ');
      } else if (local === 'line-break') {
        parts.push('\n');
      } else if (local === 'note') {
        const bodyEl = getLocalChildren(elem, 'note-body')[0];
        const fnText = bodyEl ? (bodyEl.textContent || '').replace(/\s+/g, ' ').trim() : '';
        if (fnText) {
          const num = options.nextFnCounter.value++;
          options.collectedFootnotes?.push({ number: num, text: fnText });
          parts.push(`[^${num}]`);
        }
      } else if (local === 'math') {
        const mText = extractOdtMathText(elem);
        if (mText) parts.push(mText);
      } else if (local === 'span') {
        const styleName = elem.getAttribute('text:style-name') || elem.getAttribute('style-name') || '';
        const beforeLen = parts.length;
        walk(elem);
        const spanText = parts.splice(beforeLen).join('');
        if (spanText.trim()) {
          const isBold = options.boldStyleNames.has(styleName);
          const isItalic = options.italicStyleNames.has(styleName);
          if (isBold && isItalic) parts.push(`***${spanText.trim()}***`);
          else if (isBold) parts.push(`**${spanText.trim()}**`);
          else if (isItalic) parts.push(`*${spanText.trim()}*`);
          else parts.push(spanText);
        } else {
          parts.push(spanText);
        }
      } else if (local === 'frame' || local === 'image' || local === 'object') {
        // Las imágenes se extraen aparte en el paso de frames para respetar su bloque propio
      } else {
        walk(elem);
      }
    }
  };

  walk(node);
  return parts
    .join('')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .trim();
}

export async function extractOdtInClient(
  input: Blob | ArrayBuffer | Uint8Array,
): Promise<DocxClientExtractionResult> {
  const { MAX_DOCX_UNCOMPRESSED_BYTES, MAX_DOCX_EMBEDDED_IMAGES } = await import(
    '../../../shared/core/document-ast/documentAst'
  );
  const {
    detectImageMagicMime,
    encodeUint8ArrayToBase64,
    sanitizeImageDataUrlForPdf,
  } = await import('../../../shared/core/utils/imageCompressor');

  const JSZip = (await import('jszip')).default;
  const bytes =
    input instanceof Uint8Array
      ? input
      : input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : new Uint8Array(await input.arrayBuffer());

  const zip = await JSZip.loadAsync(bytes);

  let estimatedUncompressed = 0;
  for (const entry of Object.values(zip.files)) {
    const rawSize = Number((entry as any)?._data?.uncompressedSize);
    if (Number.isFinite(rawSize) && rawSize > 0) {
      estimatedUncompressed += rawSize;
      if (estimatedUncompressed > MAX_DOCX_UNCOMPRESSED_BYTES) {
        throw new Error('El documento LibreOffice supera el límite seguro de tamaño interno (50 MB).');
      }
    }
  }

  const contentXml = await zip.file('content.xml')?.async('string');
  if (!contentXml) {
    throw new Error('El archivo LibreOffice (.odt) no contiene content.xml.');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(contentXml, 'application/xml');
  const boldStyleNames = new Set<string>();
  const italicStyleNames = new Set<string>();

  for (const st of getAllByLocal(doc, 'style')) {
    const name = st.getAttribute('style:name') || st.getAttribute('name') || '';
    if (!name) continue;
    const tp = getLocalChildren(st, 'text-properties')[0];
    if (!tp) continue;
    const weight = tp.getAttribute('fo:font-weight') || tp.getAttribute('font-weight') || '';
    const fontStyle = tp.getAttribute('fo:font-style') || tp.getAttribute('font-style') || '';
    if (weight === 'bold' || Number(weight) >= 600) boldStyleNames.add(name);
    if (fontStyle === 'italic' || fontStyle === 'oblique') italicStyleNames.add(name);
  }

  const officeText = getAllByLocal(doc, 'text')[0];
  if (!officeText) {
    throw new Error('No se encontró cuerpo legible en el documento LibreOffice.');
  }

  const blocks: DocxExtractedRichBlock[] = [];
  const markdownLines: string[] = [];
  const warnings: string[] = [];
  const importedTocEntries: ImportedTocEntry[] = [];
  let chapterFootnotes: { number: number; text: string }[] = [];
  const nextFnCounter = { value: 1 };

  const stats = {
    headings: 0,
    paragraphs: 0,
    tables: 0,
    images: 0,
    chartsConverted: 0,
    ignoredTocBlocks: 0,
    callouts: 0,
    poems: 0,
    footnotes: 0,
    figurePlaceholders: 0,
  };

  const flushFootnotes = () => {
    if (chapterFootnotes.length > 0) {
      blocks.push({
        kind: 'footnote_list',
        footnotes: chapterFootnotes,
        text: chapterFootnotes.map((f) => `[${f.number}] ${f.text}`).join('\n'),
      });
      stats.footnotes += chapterFootnotes.length;
      chapterFootnotes = [];
    }
  };

  const extractImagesFromElement = async (el: Element) => {
    for (const imgEl of getAllByLocal(el, 'image')) {
      const href = (imgEl.getAttribute('xlink:href') || imgEl.getAttribute('href') || '').replace(/^\/+/, '');
      if (!href || stats.images >= MAX_DOCX_EMBEDDED_IMAGES) continue;
      const mediaFile = zip.file(href);
      if (!mediaFile) continue;
      const mediaBytes = await mediaFile.async('uint8array');
      const magic = detectImageMagicMime(mediaBytes);
      if (magic === 'empty' || magic === 'unsupported') {
        blocks.push({
          kind: 'figure_placeholder',
          figureCaption: `Figura del documento (${href.split('/').pop() || 'imagen'})`,
        });
        stats.figurePlaceholders++;
        continue;
      }
      const rawUrl = `data:${magic};base64,${encodeUint8ArrayToBase64(mediaBytes)}`;
      const cleanUrl = await sanitizeImageDataUrlForPdf(rawUrl);
      if (!cleanUrl) continue;
      blocks.push({
        kind: 'image',
        imageDataUrl: cleanUrl,
        imageCaption: '',
      });
      stats.images++;
    }
  };

  const processChildren = async (container: Element) => {
    for (let i = 0; i < container.children.length; i++) {
      const child = container.children[i];
      const local = child.localName;

      if (local === 'table-of-content') {
        for (const p of getAllByLocal(child, 'p')) {
          const line = (p.textContent || '').replace(/\s+/g, ' ').trim();
          const m = line.match(/^(.+?)\s+(\d{1,4}|[ivxlcdm]+)$/i);
          if (m && m[1].trim().length >= 2) {
            importedTocEntries.push({
              title: m[1].replace(/\.+$/, '').trim(),
              pageLabel: m[2],
              level: 1,
            });
          }
          stats.ignoredTocBlocks++;
        }
        continue;
      }

      if (local === 'h') {
        await extractImagesFromElement(child);
        const text = extractOdtParagraphText(child, {
          collectedFootnotes: chapterFootnotes,
          nextFnCounter,
          boldStyleNames,
          italicStyleNames,
        }).replace(/^\*{1,3}|\*{1,3}$/g, '');
        if (!text) continue;
        const lvl = Math.min(3, Math.max(1, Number(child.getAttribute('text:outline-level') || 1) || 1));
        if (lvl === 1) flushFootnotes();
        blocks.push({ kind: 'heading', level: lvl, text });
        markdownLines.push(`${'#'.repeat(lvl)} ${text}`);
        stats.headings++;
        continue;
      }

      if (local === 'p') {
        await extractImagesFromElement(child);
        const text = extractOdtParagraphText(child, {
          collectedFootnotes: chapterFootnotes,
          nextFnCounter,
          boldStyleNames,
          italicStyleNames,
        });
        if (!text) continue;
        const styleNorm = normalizeNfdLower(child.getAttribute('text:style-name') || '');
        if (styleNorm.includes('heading') || styleNorm.includes('titulo')) {
          blocks.push({ kind: 'heading', level: 2, text: text.replace(/^\*{1,3}|\*{1,3}$/g, '') });
          markdownLines.push(`## ${text}`);
          stats.headings++;
        } else {
          blocks.push({ kind: 'paragraph', text });
          markdownLines.push(text);
          stats.paragraphs++;
        }
        continue;
      }

      if (local === 'list') {
        const items = getAllByLocal(child, 'list-item')
          .map((li) =>
            getLocalChildren(li, 'p')
              .map((p) =>
                extractOdtParagraphText(p, {
                  collectedFootnotes: chapterFootnotes,
                  nextFnCounter,
                  boldStyleNames,
                  italicStyleNames,
                }),
              )
              .filter(Boolean)
              .join(' '),
          )
          .filter(Boolean);
        if (items.length > 0) {
          blocks.push({ kind: 'list', listStyle: 'bullet', text: items.join('\n') });
          markdownLines.push(items.map((it) => `• ${it}`).join('\n'));
          stats.paragraphs += items.length;
        }
        continue;
      }

      if (local === 'table') {
        const rows: string[][] = [];
        for (const tr of getAllByLocal(child, 'table-row')) {
          const rowCells: string[] = [];
          for (const tc of getLocalChildren(tr, 'table-cell')) {
            await extractImagesFromElement(tc);
            const cellText = getLocalChildren(tc, 'p')
              .map((p) =>
                extractOdtParagraphText(p, {
                  collectedFootnotes: chapterFootnotes,
                  nextFnCounter,
                  boldStyleNames,
                  italicStyleNames,
                }),
              )
              .filter(Boolean)
              .join('\n');
            const span = Math.max(1, Number(tc.getAttribute('table:number-columns-spanned') || 1) || 1);
            rowCells.push(cellText);
            for (let s = 1; s < span; s++) rowCells.push('');
          }
          if (rowCells.some((c) => c.length > 0)) rows.push(rowCells);
        }
        if (rows.length > 0) {
          blocks.push({
            kind: 'table',
            tableHeaders: rows[0],
            tableRows: rows.slice(1),
            tableHasHeaderRow: rows.length > 1,
          });
          markdownLines.push(rows.map((r) => r.join(' | ')).join('\n'));
          stats.tables++;
        }
        continue;
      }

      if (local === 'section') {
        await processChildren(child);
      }
    }
  };

  await processChildren(officeText);
  flushFootnotes();

  return {
    plainMarkdownText: markdownLines.join('\n\n').trim(),
    blocks,
    warnings,
    stats,
    ...(importedTocEntries.length > 0 ? { importedTocEntries } : {}),
  };
}
