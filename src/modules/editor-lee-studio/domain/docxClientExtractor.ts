/**
 * Extractor OOXML determinístico en el navegador para archivos Word (`.docx`) — v2 Pro.
 * Usa `JSZip` de forma lazy (`await import('jszip')`) para no inflar el bundle inicial.
 * Conserva el 100% del texto, énfasis en línea (**negrita**, *cursiva*), saltos de verso,
 * encabezados bilingües (NFD), notas al pie, tablas multi-columna y cajas didácticas (CAJA N /
 * tablas de 1 columna / párrafos sombreados), poemas, marcadores de figura y filtros de TOC.
 */

import type { EditorialCalloutVariant } from './editorialTypes';
import { parseWordChartXml, renderParsedWordChartToPngDataUrl } from './docxChartRenderer';
import {
  extractBitmapFromMetafile,
  extractSmartArtDiagram,
  rasterizeSvgOrBmpDataUrl,
  serializeOmmlNodeToText,
} from './ooxmlMathAndDiagramParser';

export interface ImportedTocEntry {
  title: string;
  pageLabel?: string;
  level: number;
}

export interface DocxExtractedRichBlock {
  kind:
    | 'heading'
    | 'paragraph'
    | 'list'
    | 'table'
    | 'image'
    | 'callout'
    | 'poem'
    | 'figure_placeholder'
    | 'footnote_list'
    | 'epigraph';
  level?: number;
  text?: string;
  listStyle?: 'bullet' | 'numbered';
  calloutTitle?: string;
  calloutItems?: string[];
  calloutVariant?: EditorialCalloutVariant;
  keepTogether?: boolean;
  tableHeaders?: string[];
  tableRows?: string[][];
  tableCaption?: string;
  tableHasHeaderRow?: boolean;
  imageDataUrl?: string;
  imageCaption?: string;
  figureNumber?: string;
  figureCaption?: string;
  figureHint?: string;
  footnotes?: { number: number; text: string }[];
}

export interface DocxClientExtractionResult {
  plainMarkdownText: string;
  blocks: DocxExtractedRichBlock[];
  warnings: string[];
  importedTocEntries?: ImportedTocEntry[];
  stats: {
    headings: number;
    paragraphs: number;
    tables: number;
    images: number;
    chartsConverted: number;
    ignoredTocBlocks: number;
    callouts: number;
    poems: number;
    footnotes: number;
    figurePlaceholders: number;
  };
}

interface StyleMeta {
  name: string;
  outlineLvl?: number;
  basedOn?: string;
}

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
    const item = all[i];
    if (item.localName !== localName) continue;
    // Evitar duplicar contenido dentro de <mc:Fallback> cuando existe <mc:Choice> hermano
    let ancestor: Element | null = item.parentElement;
    let insideSkippedFallback = false;
    while (ancestor) {
      if (
        ancestor.localName === 'Fallback' &&
        ancestor.parentElement?.localName === 'AlternateContent' &&
        getLocalChildren(ancestor.parentElement, 'Choice').length > 0
      ) {
        insideSkippedFallback = true;
        break;
      }
      ancestor = ancestor.parentElement;
    }
    if (!insideSkippedFallback) out.push(item);
  }
  return out;
}

function isRunFlagEnabled(rPr: Element | undefined, tagName: 'b' | 'i'): boolean {
  if (!rPr) return false;
  const node = getLocalChildren(rPr, tagName)[0];
  if (!node) return false;
  const val = node.getAttribute('w:val') ?? node.getAttribute('val');
  if (!val) return true;
  const lower = val.toLowerCase();
  return lower !== '0' && lower !== 'false' && lower !== 'off';
}

function wrapInlineFormatting(raw: string, bold: boolean, italic: boolean): string {
  if (!raw || (!bold && !italic)) return raw;
  // Evitar envolver espacios sueltos o saltos de línea puros
  const lead = raw.match(/^[ \t]*/)?.[0] || '';
  const trail = raw.match(/[ \t]*$/)?.[0] || '';
  const core = raw.slice(lead.length, raw.length - trail.length);
  if (!core || /^[\n]+$/.test(core)) return raw;

  // Envolver línea por línea si el run contiene `\n` para que cada línea conserve formato independiente
  if (core.includes('\n')) {
    const wrappedLines = core
      .split('\n')
      .map((line) => (line.trim() ? wrapInlineFormatting(line, bold, italic) : line))
      .join('\n');
    return `${lead}${wrappedLines}${trail}`;
  }

  const marker = bold && italic ? '***' : bold ? '**' : '*';
  return `${lead}${marker}${core}${marker}${trail}`;
}

interface ExtractTextOptions {
  preserveFormatting?: boolean;
  footnoteNumberByRawId?: Map<string, number>;
  collectedFootnotes?: { number: number; text: string }[];
  footnotesByRawId?: Map<string, string>;
  endnoteNumberByRawId?: Map<string, number>;
  endnotesByRawId?: Map<string, string>;
  relsById?: Map<string, string>;
}

const SUPERSCRIPT_CHAR_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ', i: 'ⁱ',
};
const SUBSCRIPT_CHAR_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
};

function convertScriptText(raw: string, kind: 'superscript' | 'subscript'): string {
  const map = kind === 'superscript' ? SUPERSCRIPT_CHAR_MAP : SUBSCRIPT_CHAR_MAP;
  let allMapped = true;
  let out = '';
  for (const ch of raw) {
    if (map[ch]) out += map[ch];
    else {
      allMapped = false;
      break;
    }
  }
  if (allMapped && out) return out;
  return kind === 'superscript' ? `^${raw}` : `_${raw}`;
}

function extractNodeRichParts(
  node: Element,
  outParts: string[],
  options: ExtractTextOptions,
): void {
  const local = node.localName;
  if (
    local === 'pPr' ||
    local === 'rPr' ||
    local === 'del' ||
    local === 'moveFrom' ||
    local === 'instrText' ||
    local === 'fldChar' ||
    local === 'bookmarkStart' ||
    local === 'bookmarkEnd' ||
    local === 'proofErr' ||
    local === 'txbxContent' ||
    local === 'textbox'
  ) {
    return;
  }

  if (
    local === 'Fallback' &&
    node.parentElement?.localName === 'AlternateContent' &&
    getLocalChildren(node.parentElement, 'Choice').length > 0
  ) {
    return;
  }

  if (local === 'oMathPara' || local === 'oMath') {
    const mathText = serializeOmmlNodeToText(node);
    if (mathText) outParts.push(mathText);
    return;
  }

  if (local === 'hyperlink') {
    const rId = node.getAttribute('r:id') ?? node.getAttribute('id') ?? '';
    const targetUrl = rId ? options.relsById?.get(rId) : undefined;
    const innerParts: string[] = [];
    for (let i = 0; i < node.children.length; i++) {
      extractNodeRichParts(node.children[i], innerParts, options);
    }
    const label = innerParts.join('').trim();
    if (label) {
      outParts.push(label);
      if (
        targetUrl &&
        /^https?:\/\//i.test(targetUrl) &&
        !label.includes(targetUrl) &&
        !/^(?:ver|aquí|link|enlace)$/i.test(label)
      ) {
        // Solo agregar URL si no está ya visible en el texto del enlace (útil en bibliografía/DOIs)
        if (/doi\.org|http/i.test(targetUrl) && label.length < 100 && !label.includes(' ')) {
          // Mantener compacto
        }
      } else if (targetUrl && /^https?:\/\//i.test(targetUrl) && /^(?:link|enlace|ver|fuente)$/i.test(label)) {
        outParts.push(` (${targetUrl})`);
      }
    } else if (targetUrl && /^https?:\/\//i.test(targetUrl)) {
      outParts.push(targetUrl);
    }
    return;
  }

  if (local === 'r') {
    const rPr = getLocalChildren(node, 'rPr')[0];
    const bold = Boolean(options.preserveFormatting && isRunFlagEnabled(rPr, 'b'));
    const italic = Boolean(options.preserveFormatting && isRunFlagEnabled(rPr, 'i'));
    const vertAlignEl = rPr ? getLocalChildren(rPr, 'vertAlign')[0] : undefined;
    const vertVal = (vertAlignEl?.getAttribute('w:val') ?? vertAlignEl?.getAttribute('val') ?? '').toLowerCase();
    const runPieces: string[] = [];

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const cLocal = child.localName;
      if (cLocal === 't' || cLocal === 'delText') {
        if (cLocal === 't') runPieces.push(child.textContent || '');
      } else if (cLocal === 'tab') {
        runPieces.push(' ');
      } else if (cLocal === 'br' || cLocal === 'cr') {
        runPieces.push('\n');
      } else if (cLocal === 'noBreakHyphen') {
        runPieces.push('-');
      } else if (cLocal === 'softHyphen') {
        // Omitir guion blando invisible
      } else if (cLocal === 'footnoteReference') {
        const rawId = child.getAttribute('w:id') ?? child.getAttribute('id') ?? '';
        const mappedNum = rawId ? options.footnoteNumberByRawId?.get(rawId) : undefined;
        const fnText = rawId ? options.footnotesByRawId?.get(rawId) : undefined;
        if (mappedNum !== undefined && fnText) {
          outParts.push(`[^${mappedNum}]`);
          if (
            options.collectedFootnotes &&
            !options.collectedFootnotes.some((f) => f.number === mappedNum)
          ) {
            options.collectedFootnotes.push({ number: mappedNum, text: fnText });
          }
        }
      } else if (cLocal === 'endnoteReference') {
        const rawId = child.getAttribute('w:id') ?? child.getAttribute('id') ?? '';
        const mappedNum = rawId ? options.endnoteNumberByRawId?.get(rawId) : undefined;
        const enText = rawId ? options.endnotesByRawId?.get(rawId) : undefined;
        if (mappedNum !== undefined && enText) {
          outParts.push(`[^${mappedNum}]`);
          if (
            options.collectedFootnotes &&
            !options.collectedFootnotes.some((f) => f.number === mappedNum)
          ) {
            options.collectedFootnotes.push({ number: mappedNum, text: enText });
          }
        }
      } else if (cLocal === 'sym') {
        const charHex = child.getAttribute('w:char') ?? child.getAttribute('char');
        if (charHex) {
          const cp = parseInt(charHex, 16);
          if (Number.isFinite(cp) && cp >= 32) {
            runPieces.push(String.fromCodePoint(cp));
          }
        }
      }
    }

    let joined = runPieces.join('');
    if (joined) {
      if (vertVal === 'superscript' || vertVal === 'subscript') {
        joined = convertScriptText(joined, vertVal);
      }
      outParts.push(wrapInlineFormatting(joined, bold, italic));
    }
    return;
  }

  for (let i = 0; i < node.children.length; i++) {
    extractNodeRichParts(node.children[i], outParts, options);
  }
}

export function extractParagraphRichText(
  p: Element,
  options: ExtractTextOptions = {},
): string {
  const parts: string[] = [];
  extractNodeRichParts(p, parts, {
    ...options,
    preserveFormatting: options.preserveFormatting !== false,
  });
  return parts
    .join('')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractParagraphPlainText(p: Element): string {
  return extractParagraphRichText(p, { preserveFormatting: false });
}

function resolveHeadingLevel(p: Element, stylesById: Map<string, StyleMeta>): number | null {
  const pPr = getLocalChildren(p, 'pPr')[0];
  if (!pPr) return null;

  const pStyle = getLocalChildren(pPr, 'pStyle')[0];
  const styleId = pStyle?.getAttribute('w:val') ?? pStyle?.getAttribute('val') ?? '';
  const meta = styleId ? stylesById.get(styleId) : undefined;
  const candidateNorm = normalizeNfdLower(`${styleId} ${meta?.name || ''}`);

  if (
    candidateNorm.includes('toc') ||
    candidateNorm.includes('indice') ||
    candidateNorm.includes('tdc') ||
    candidateNorm.includes('table of contents')
  ) {
    return null;
  }

  const outlineNode = getLocalChildren(pPr, 'outlineLvl')[0];
  const outlineAttr = outlineNode?.getAttribute('w:val') ?? outlineNode?.getAttribute('val');
  if (outlineAttr !== null && outlineAttr !== undefined) {
    const n = Number(outlineAttr);
    if (Number.isFinite(n) && n >= 0 && n <= 3) return n + 1;
  }

  if (!styleId) return null;

  const match = candidateNorm.match(/(?:heading|titulo|encabezado|chapter|capitulo)\s*([1-4])/);
  if (match) return Number(match[1]);
  if (/(?:subtitulo|subtitle)/.test(candidateNorm)) return 2;
  if (candidateNorm === 'title' || candidateNorm === 'titulo') return 1;
  if (meta?.outlineLvl !== undefined && meta.outlineLvl >= 0 && meta.outlineLvl <= 3) {
    return meta.outlineLvl + 1;
  }
  return null;
}

function isTocParagraph(p: Element, stylesById: Map<string, StyleMeta>): boolean {
  const pPr = getLocalChildren(p, 'pPr')[0];
  const pStyle = pPr ? getLocalChildren(pPr, 'pStyle')[0] : null;
  const styleId = normalizeNfdLower(pStyle?.getAttribute('w:val') ?? pStyle?.getAttribute('val') ?? '');
  const metaName = normalizeNfdLower(stylesById.get(pStyle?.getAttribute('w:val') ?? pStyle?.getAttribute('val') ?? '')?.name || '');
  return (
    styleId.startsWith('toc') ||
    metaName.startsWith('toc') ||
    styleId.includes('tdc') ||
    metaName.includes('table of contents') ||
    metaName.includes('tabla de contenido') ||
    styleId.startsWith('indice') ||
    metaName.startsWith('indice')
  );
}

function isManualTocHeadingText(text: string): boolean {
  const norm = normalizeNfdLower(text).replace(/[:.]+$/g, '').trim();
  return /^(?:indice(?:\s+general)?|tabla\s+de\s+contenidos?|sumario|contenido\s+general)$/.test(norm);
}

function isManualTocLineText(text: string): boolean {
  const clean = (text || '').trim();
  if (!clean || clean.length > 140) return false;
  // Líneas con puntos conductores + número o título corto + número al final ("Capítulo 1 .... 14")
  if (/\.{2,}\s*(?:[ivxlcdm]+|\d{1,4})$/i.test(clean)) return true;
  if (/^[^\n]{2,110}\s+\d{1,4}$/.test(clean) && !/[.!?]$/.test(clean.replace(/\s+\d+$/, ''))) {
    return true;
  }
  return false;
}

function hasParagraphShadingOrBorder(p: Element): boolean {
  const pPr = getLocalChildren(p, 'pPr')[0];
  if (!pPr) return false;
  const shd = getLocalChildren(pPr, 'shd')[0];
  if (shd) {
    const fill = (shd.getAttribute('w:fill') ?? shd.getAttribute('fill') ?? '').toLowerCase();
    if (fill && fill !== 'auto' && fill !== 'ffffff') return true;
  }
  return getLocalChildren(pPr, 'pBdr').length > 0;
}

function hasBoldRunFormatting(p: Element): boolean {
  for (const r of getLocalChildren(p, 'r')) {
    const rPr = getLocalChildren(r, 'rPr')[0];
    if (isRunFlagEnabled(rPr, 'b')) return true;
  }
  return false;
}

function isParagraphPredominantlyItalic(p: Element): boolean {
  const runs = getLocalChildren(p, 'r');
  if (runs.length === 0) return false;
  let italicChars = 0;
  let totalChars = 0;
  for (const r of runs) {
    const txt = extractParagraphPlainText(r);
    if (!txt) continue;
    totalChars += txt.length;
    const rPr = getLocalChildren(r, 'rPr')[0];
    if (isRunFlagEnabled(rPr, 'i')) italicChars += txt.length;
  }
  return totalChars > 0 && italicChars / totalChars >= 0.7;
}

function getParagraphStyleMeta(p: Element, stylesById: Map<string, StyleMeta>): StyleMeta | undefined {
  const pPr = getLocalChildren(p, 'pPr')[0];
  const pStyle = pPr ? getLocalChildren(pPr, 'pStyle')[0] : null;
  const styleId = pStyle?.getAttribute('w:val') ?? pStyle?.getAttribute('val') ?? '';
  return styleId ? stylesById.get(styleId) : undefined;
}

function detectCalloutVariant(titleOrBody: string): EditorialCalloutVariant {
  const norm = normalizeNfdLower(titleOrBody);
  if (/resguardo|etica|ley\b|normativa|confidencial/.test(norm)) return 'resguardo';
  if (/definicion|glosario|concepto/.test(norm)) return 'definicion';
  if (/importante|atencion|alerta|cuidado/.test(norm)) return 'importante';
  if (/testimonio|relato|caso|voz/.test(norm)) return 'testimonio';
  if (/clave|esencial|sintesis|idea/.test(norm)) return 'clave';
  if (/consigna|actividad|ejercicio|guia/.test(norm)) return 'consigna';
  if (/caja\s*\d*/.test(norm)) return 'caja';
  return 'nota';
}

function parseCalloutParagraphsToStructured(paragraphs: string[]): {
  calloutTitle?: string;
  calloutItems?: string[];
  text: string;
  calloutVariant: EditorialCalloutVariant;
} {
  const lines = paragraphs
    .flatMap((p) => p.split('\n'))
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return { text: '', calloutVariant: 'nota' };
  }

  let calloutTitle: string | undefined;
  let bodyLines = lines;

  const firstRaw = lines[0].replace(/^\*{1,3}|\*{1,3}$/g, '').trim();
  const isExplicitBoxTitle =
    /^(?:CAJA\s*\d+|RESGUARDO|NOTA|IMPORTANTE|CLAVE|DEFINICI[OÓ]N|CONSIGNA|EJERCICIO)\b/i.test(firstRaw) ||
    (lines.length >= 2 && firstRaw.length <= 95 && (lines[0].startsWith('**') || firstRaw.endsWith(':')));

  if (isExplicitBoxTitle) {
    calloutTitle = firstRaw.replace(/:$/, '').trim();
    bodyLines = lines.slice(1);
  }

  const bulletLines = bodyLines.filter((l) => /^(?:[•\-–—*]|\d+[.)])\s+/.test(l));
  const calloutItems =
    bulletLines.length >= 2
      ? bulletLines.map((l) => l.replace(/^(?:[•\-–—*]|\d+[.)])\s+/, '').trim())
      : undefined;

  const remainingText = calloutItems
    ? bodyLines
        .filter((l) => !/^(?:[•\-–—*]|\d+[.)])\s+/.test(l))
        .join('\n')
        .trim()
    : bodyLines.join('\n').trim();

  const text = remainingText || bodyLines.join('\n').trim() || firstRaw;
  const calloutVariant = detectCalloutVariant(`${calloutTitle || ''} ${text}`);
  return { calloutTitle, calloutItems, text, calloutVariant };
}

function detectFigurePlaceholder(plainText: string): {
  figureNumber: string;
  figureCaption: string;
  figureHint?: string;
} | null {
  const clean = plainText.trim();
  if (!clean || clean.length > 260) return null;

  // Ejemplos: "[Insertar Figura 1: Mapa conceptual...]", "[Espacio reservado para esquema...]", "FIGURA 2 — [espacio para imagen]"
  const bracketMatch = clean.match(
    /^\[?\s*(?:(?:espacio(?:\s+reservado)?\s+(?:para|de)|insertar|aqui\s+va(?:\s+la)?)\s+)?(figura|grafico|gráfico|ilustracion|ilustración|esquema|cuadro|imagen)(?:\s+(?:n[°º]?\s*)?(\d+(?:\.\d+)?))?\s*(?:[:.\-–—]\s*([^\]]+))?\]?$/i,
  );
  if (!bracketMatch) {
    const inlinePlaceholder = /^\[(?:figura|imagen|esquema|grafico|gráfico|espacio\s+para\s+figura)[^\]]+\]$/i.test(clean);
    if (!inlinePlaceholder) return null;
    const inner = clean.slice(1, -1).trim();
    const numM = inner.match(/\b(\d+(?:\.\d+)?)\b/);
    return {
      figureNumber: numM ? `Figura ${numM[1]}` : 'Figura',
      figureCaption: inner,
      figureHint: 'Imagen o esquema pendiente de insertar',
    };
  }

  const label = bracketMatch[1];
  const num = bracketMatch[2];
  const rest = (bracketMatch[3] || '').trim();
  const hasExplicitPlaceholderCue =
    clean.startsWith('[') ||
    /\b(?:espacio(?:\s+reservado)?|insertar|pendiente|aqui\s+va|colocar)\b/i.test(clean);

  if (!hasExplicitPlaceholderCue) return null;

  const figureNumber = num ? `${label.charAt(0).toUpperCase()}${label.slice(1).toLowerCase()} ${num}` : label;
  return {
    figureNumber,
    figureCaption: rest || clean.replace(/^\[|\]$/g, '').trim(),
    figureHint: 'Podés reemplazar este recuadro por una imagen desde el editor.',
  };
}

function isLikelyPoemParagraph(
  p: Element,
  richText: string,
  plainText: string,
  stylesById: Map<string, StyleMeta>,
): boolean {
  const lines = plainText.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 3) return false;
  if (lines.some((l) => /^(?:•|\d+[.)]\s)/.test(l) || /\t/.test(l))) return false;
  const styleNorm = normalizeNfdLower(getParagraphStyleMeta(p, stylesById)?.name || '');
  const avgLen = lines.reduce((acc, l) => acc + l.length, 0) / lines.length;
  const isVerseStyle = /\b(?:poema|verso|verse|estrofa|stanza|poetry)\b/.test(styleNorm);
  if (isVerseStyle) return true;
  // Un solo párrafo con >= 4 versos cortos separados por <w:br/>
  if (lines.length >= 4 && avgLen <= 58 && !richText.startsWith('CAJA ')) {
    const periodEnds = lines.filter((l) => /[.!?]$/.test(l)).length;
    return periodEnds < lines.length * 0.7;
  }
  return false;
}

function shouldTreatMultiColTableWithoutHeader(
  firstRowEl: Element | undefined,
  matrix: string[][],
): boolean {
  if (!firstRowEl || matrix.length === 0) return false;
  const trPr = getLocalChildren(firstRowEl, 'trPr')[0];
  if (trPr && getLocalChildren(trPr, 'tblHeader').length > 0) return false;

  const firstRowCells = getLocalChildren(firstRowEl, 'tc');
  const hasBoldOrShade = firstRowCells.some((tc) => {
    const tcPr = getLocalChildren(tc, 'tcPr')[0];
    const shd = tcPr ? getLocalChildren(tcPr, 'shd')[0] : null;
    const fill = (shd?.getAttribute('w:fill') ?? shd?.getAttribute('fill') ?? '').toLowerCase();
    if (fill && fill !== 'auto' && fill !== 'ffffff') return true;
    return getLocalChildren(tc, 'p').some(hasBoldRunFormatting);
  });
  if (hasBoldOrShade) return false;

  // Ficha clave:valor de 2 columnas (ej. "Autor: ..." / "Nivel: ...")
  if (matrix[0].length === 2 && matrix.every((r) => (r[0] || '').trim().endsWith(':'))) {
    return true;
  }
  // Fila 0 con texto narrativo largo (> 75 caracteres) sin encabezado explícito
  if (matrix[0].some((cell) => cell.length > 75)) return true;

  return false;
}

function mergeConsecutiveVerseBlocks(
  rawBlocks: DocxExtractedRichBlock[],
): { blocks: DocxExtractedRichBlock[]; mergedPoemCount: number; replacedParagraphs: number } {
  const out: DocxExtractedRichBlock[] = [];
  let mergedPoemCount = 0;
  let replacedParagraphs = 0;

  const isVerseCandidate = (b: DocxExtractedRichBlock | undefined): boolean => {
    if (!b || b.kind !== 'paragraph' || !b.text) return false;
    if (b.text.includes('\n')) return false;
    const stripped = b.text.replace(/\*{1,3}/g, '').trim();
    if (!stripped || stripped.length > 62) return false;
    // Excluir fichas "Campo: valor" o líneas de diálogo enumerado
    if (/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s]{1,24}:\s+\S/.test(stripped) && stripped.length > 35) {
      return false;
    }
    return true;
  };

  let idx = 0;
  while (idx < rawBlocks.length) {
    if (!isVerseCandidate(rawBlocks[idx])) {
      out.push(rawBlocks[idx]);
      idx++;
      continue;
    }

    let end = idx + 1;
    while (end < rawBlocks.length && isVerseCandidate(rawBlocks[end])) {
      end++;
    }

    const slice = rawBlocks.slice(idx, end);
    if (slice.length >= 4) {
      const strippedLines = slice.map((b) => (b.text || '').replace(/\*{1,3}/g, '').trim());
      const avgLen = strippedLines.reduce((sum, s) => sum + s.length, 0) / slice.length;
      const periodEnds = strippedLines.filter((s) => /\.$/.test(s)).length;

      if (avgLen <= 48 && periodEnds / slice.length < 0.65) {
        const joined = slice.map((b) => (b.text || '').trim()).join('\n');
        out.push({
          kind: 'poem',
          text: joined,
          keepTogether: joined.length < 1100,
        });
        mergedPoemCount++;
        replacedParagraphs += slice.length;
        idx = end;
        continue;
      }
    }

    for (let k = idx; k < end; k++) {
      out.push(rawBlocks[k]);
    }
    idx = end;
  }

  return { blocks: out, mergedPoemCount, replacedParagraphs };
}

export function isTocSdtElement(
  sdtEl: Element,
  stylesById?: Map<string, StyleMeta>,
): boolean {
  const sdtPr = getLocalChildren(sdtEl, 'sdtPr')[0];
  if (sdtPr) {
    const gallery = getAllByLocal(sdtPr, 'docPartGallery')[0];
    const galleryVal = String(
      gallery?.getAttribute('w:val') ?? gallery?.getAttribute('val') ?? '',
    ).trim();
    if (/^(?:Table of Contents|TOC|Tabla de contenido|Índice|Indice)$/i.test(galleryVal)) {
      return true;
    }
    const tagOrAlias = [
      ...getAllByLocal(sdtPr, 'alias'),
      ...getAllByLocal(sdtPr, 'tag'),
    ];
    for (const el of tagOrAlias) {
      const val = String(el.getAttribute('w:val') ?? el.getAttribute('val') ?? '').trim();
      if (/^(?:Table of Contents|TOC|Tabla de contenido|Índice|Indice)$/i.test(val)) {
        return true;
      }
    }
  }

  // Fallback conservador: solo tratar el SDT como índice si no tiene tablas/imágenes
  // y al menos 2 párrafos son entradas TOC reales sin prosa larga.
  const sdtContent = getLocalChildren(sdtEl, 'sdtContent')[0];
  if (!sdtContent) return false;
  if (getAllByLocal(sdtContent, 'tbl').length > 0 || getAllByLocal(sdtContent, 'drawing').length > 0) {
    return false;
  }
  const paragraphs = getAllByLocal(sdtContent, 'p');
  if (paragraphs.length === 0) return false;
  let tocCount = 0;
  let nonEmptyCount = 0;
  for (const p of paragraphs) {
    const plain = extractParagraphPlainText(p);
    if (!plain) continue;
    nonEmptyCount++;
    if (stylesById && isTocParagraph(p, stylesById)) {
      tocCount++;
    } else if (isManualTocHeadingText(plain) || isManualTocLineText(plain)) {
      tocCount++;
    } else if (plain.length > 120) {
      return false;
    }
  }
  return nonEmptyCount > 0 && tocCount === nonEmptyCount && tocCount >= 2;
}

export async function extractDocxInClient(input: Blob | ArrayBuffer | Uint8Array): Promise<DocxClientExtractionResult> {
  const {
    detectSafeDocumentMime,
    MAX_DOCX_UNCOMPRESSED_BYTES,
    MAX_DOCX_EMBEDDED_IMAGES,
  } = await import('../../../shared/core/document-ast/documentAst');
  const JSZip = (await import('jszip')).default;
  const bytes =
    input instanceof Uint8Array
      ? input
      : input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : new Uint8Array(await input.arrayBuffer());

  if (detectSafeDocumentMime(bytes) !== 'docx') {
    throw new Error('El archivo no tiene firma binaria válida de documento Word (.docx).');
  }

  const zip = await JSZip.loadAsync(bytes);

  // Escudo Anti Zip-Bomb: verificar tamaño descomprimido acumulado declarado y real
  let estimatedUncompressed = 0;
  let declaredMediaCount = 0;
  for (const [entryName, entry] of Object.entries(zip.files)) {
    const rawSize = Number((entry as any)?._data?.uncompressedSize);
    if (Number.isFinite(rawSize) && rawSize > 0) {
      estimatedUncompressed += rawSize;
      if (estimatedUncompressed > MAX_DOCX_UNCOMPRESSED_BYTES) {
        throw new Error('El documento Word supera el límite seguro de tamaño interno (50 MB).');
      }
    }
    if (!entry.dir && /^word\/media\//i.test(entryName)) {
      declaredMediaCount++;
    }
  }
  if (declaredMediaCount > MAX_DOCX_EMBEDDED_IMAGES * 2) {
    throw new Error('El documento contiene demasiadas imágenes embebidas para procesarse en navegador.');
  }

  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) {
    throw new Error('El archivo .docx no contiene word/document.xml.');
  }
  let unpackedBytesAcc = docXml.length * 2;
  if (unpackedBytesAcc > MAX_DOCX_UNCOMPRESSED_BYTES) {
    throw new Error('El documento Word supera el límite seguro de tamaño interno (50 MB).');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(docXml, 'application/xml');

  // 1. Estilos
  const stylesById = new Map<string, StyleMeta>();
  const stylesXml = await zip.file('word/styles.xml')?.async('string');
  if (stylesXml) {
    const sDoc = parser.parseFromString(stylesXml, 'application/xml');
    for (const styleEl of getAllByLocal(sDoc, 'style')) {
      const id = styleEl.getAttribute('w:styleId') ?? styleEl.getAttribute('styleId') ?? '';
      if (!id) continue;
      const nameEl = getLocalChildren(styleEl, 'name')[0];
      const name = nameEl?.getAttribute('w:val') ?? nameEl?.getAttribute('val') ?? id;
      const basedOnEl = getLocalChildren(styleEl, 'basedOn')[0];
      const basedOn = basedOnEl?.getAttribute('w:val') ?? basedOnEl?.getAttribute('val') ?? undefined;
      const pPr = getLocalChildren(styleEl, 'pPr')[0];
      const outlineEl = pPr ? getLocalChildren(pPr, 'outlineLvl')[0] : null;
      const oVal = outlineEl?.getAttribute('w:val') ?? outlineEl?.getAttribute('val');
      stylesById.set(id, {
        name,
        basedOn,
        outlineLvl: oVal !== null && oVal !== undefined ? Number(oVal) : undefined,
      });
    }
  }

  // 2. Notas al pie (word/footnotes.xml) y al final (word/endnotes.xml)
  const footnotesByRawId = new Map<string, string>();
  const footnoteNumberByRawId = new Map<string, number>();
  let nextFnNumber = 1;
  const footnotesXml = await zip.file('word/footnotes.xml')?.async('string');
  if (footnotesXml) {
    const fnDoc = parser.parseFromString(footnotesXml, 'application/xml');
    for (const fnEl of getAllByLocal(fnDoc, 'footnote')) {
      const fnId = fnEl.getAttribute('w:id') ?? fnEl.getAttribute('id') ?? '';
      const fnType = (fnEl.getAttribute('w:type') ?? fnEl.getAttribute('type') ?? '').toLowerCase();
      if (!fnId || fnType === 'separator' || fnType === 'continuationseparator' || fnId === '-1' || fnId === '0') {
        continue;
      }
      const fnText = getLocalChildren(fnEl, 'p')
        .map((fp) => extractParagraphPlainText(fp))
        .filter(Boolean)
        .join(' ')
        .trim();
      if (fnText) {
        footnotesByRawId.set(fnId, fnText);
        footnoteNumberByRawId.set(fnId, nextFnNumber++);
      }
    }
  }

  const endnotesByRawId = new Map<string, string>();
  const endnoteNumberByRawId = new Map<string, number>();
  const endnotesXml = await zip.file('word/endnotes.xml')?.async('string');
  if (endnotesXml) {
    const enDoc = parser.parseFromString(endnotesXml, 'application/xml');
    for (const enEl of getAllByLocal(enDoc, 'endnote')) {
      const enId = enEl.getAttribute('w:id') ?? enEl.getAttribute('id') ?? '';
      const enType = (enEl.getAttribute('w:type') ?? enEl.getAttribute('type') ?? '').toLowerCase();
      if (!enId || enType === 'separator' || enType === 'continuationseparator' || enId === '-1' || enId === '0') {
        continue;
      }
      const enText = getLocalChildren(enEl, 'p')
        .map((ep) => extractParagraphPlainText(ep))
        .filter(Boolean)
        .join(' ')
        .trim();
      if (enText) {
        endnotesByRawId.set(enId, enText);
        endnoteNumberByRawId.set(enId, nextFnNumber++);
      }
    }
  }

  // 3. Relaciones (media, hipervínculos, charts y diagramas SmartArt)
  const relsById = new Map<string, string>();
  const relsXml = await zip.file('word/_rels/document.xml.rels')?.async('string');
  if (relsXml) {
    const rDoc = parser.parseFromString(relsXml, 'application/xml');
    for (const rel of getAllByLocal(rDoc, 'Relationship')) {
      const id = rel.getAttribute('Id') || '';
      const target = rel.getAttribute('Target') || '';
      const targetMode = (rel.getAttribute('TargetMode') || '').toLowerCase();
      if (id && target) {
        if (targetMode === 'external' || /^https?:\/\//i.test(target)) {
          relsById.set(id, target);
        } else {
          relsById.set(id, target.startsWith('word/') ? target : `word/${target.replace(/^\/+/, '')}`);
        }
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
  const importedTocEntries: ImportedTocEntry[] = [];
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

  let chapterFootnotes: { number: number; text: string }[] = [];
  let inManualTocBlock = false;
  let lastHeadingWasLevel = 0;

  const parseTocLine = (line: string, level = 1) => {
    const m = line.trim().match(/^(.+?)(?:\.{2,}|\s{2,}|\s+)(\d{1,4}|[ivxlcdm]+)$/i);
    if (m && m[1].trim().length >= 2) {
      importedTocEntries.push({
        title: m[1].replace(/[.·\s]+$/, '').trim(),
        pageLabel: m[2],
        level,
      });
    } else if (line.trim().length >= 3) {
      importedTocEntries.push({ title: line.trim(), level });
    }
  };

  const flushChapterFootnotes = () => {
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

  // Agrupador temporal para bloques consecutivos con sombreado / CAJA N / versos de poema
  const bodyChildren = Array.from(body.children);
  let i = 0;

  const processEmbeddedMediaByRelId = async (rId: string | null | undefined) => {
    const targetPath = rId ? relsById.get(rId) : undefined;
    if (!targetPath || !/\.(png|jpe?g|webp|gif|bmp|tiff?|emf|wmf|svg|avif|heic)$/i.test(targetPath)) {
      return;
    }
    if (stats.images >= MAX_DOCX_EMBEDDED_IMAGES) {
      warnings.push(
        `Se alcanzó el límite máximo de ${MAX_DOCX_EMBEDDED_IMAGES} imágenes por documento; las restantes se marcaron como espacio de figura.`,
      );
      blocks.push({
        kind: 'figure_placeholder',
        figureCaption: `Figura adicional (${targetPath.split('/').pop() || 'límite por documento'})`,
      });
      stats.figurePlaceholders++;
      return;
    }
    const mediaFile = zip.file(targetPath);
    if (!mediaFile) return;
    let mediaBytes = await mediaFile.async('uint8array');
    unpackedBytesAcc += mediaBytes.byteLength;
    if (unpackedBytesAcc > MAX_DOCX_UNCOMPRESSED_BYTES) {
      throw new Error('El documento Word supera el límite seguro de tamaño interno (50 MB).');
    }

    const {
      detectImageMagicMime,
      encodeUint8ArrayToBase64,
      sanitizeImageDataUrlForPdf,
    } = await import('../../../shared/core/utils/imageCompressor');

    // Soporte nativo para .svg y metafiles .emf/.wmf (extracción de bitmap o rasterizado)
    if (/\.svg$/i.test(targetPath)) {
      const pngUrl = await rasterizeSvgOrBmpDataUrl(mediaBytes, 'image/svg+xml');
      if (pngUrl) {
        blocks.push({ kind: 'image', imageDataUrl: pngUrl, imageCaption: '' });
        stats.images++;
        return;
      }
    }

    let magic = detectImageMagicMime(mediaBytes);
    if ((magic === 'empty' || magic === 'unsupported') && /\.(emf|wmf)$/i.test(targetPath)) {
      const extracted = extractBitmapFromMetafile(mediaBytes);
      if (extracted) {
        if (extracted.mime === 'image/bmp') {
          const bmpPng = await rasterizeSvgOrBmpDataUrl(extracted.bytes, 'image/bmp');
          if (bmpPng) {
            blocks.push({ kind: 'image', imageDataUrl: bmpPng, imageCaption: '' });
            stats.images++;
            return;
          }
        } else {
          mediaBytes = extracted.bytes;
          magic = detectImageMagicMime(mediaBytes);
        }
      }
    }

    if (magic === 'empty' || magic === 'unsupported') {
      blocks.push({
        kind: 'figure_placeholder',
        figureCaption: `Figura del documento original (${targetPath.split('/').pop() || 'imagen no compatible'}, reemplazar por PNG o JPG)`,
        figureHint: 'Formato de dibujo interno de Word no compatible directo con PDF',
      });
      stats.figurePlaceholders++;
      warnings.push(
        `Se detectó "${targetPath.split('/').pop()}" en formato no compatible directo; se preservó como espacio de figura editable.`,
      );
      return;
    }

    const rawDataUrl = `data:${magic};base64,${encodeUint8ArrayToBase64(mediaBytes)}`;
    const sanitizedDataUrl = await sanitizeImageDataUrlForPdf(rawDataUrl);
    if (!sanitizedDataUrl) {
      blocks.push({
        kind: 'figure_placeholder',
        figureCaption: `Figura del documento original (${targetPath.split('/').pop() || 'imagen dañada'}, volver a cargar)`,
      });
      stats.figurePlaceholders++;
      warnings.push(
        `La imagen "${targetPath.split('/').pop()}" tenía datos binarios dañados; se convirtió en espacio de figura para no romper la vista previa.`,
      );
      return;
    }

    blocks.push({
      kind: 'image',
      imageDataUrl: sanitizedDataUrl,
      imageCaption: '',
    });
    stats.images++;
  };

  const processedDiagramIds = new Set<string>();
  const extractMediaFromNode = async (node: Element) => {
    const seenRelIds = new Set<string>();
    // Imágenes modernas (<a:blip>), SVG (<asvg:svgBlip>) y clásicas VML (<v:imagedata>)
    for (const blip of [...getAllByLocal(node, 'blip'), ...getAllByLocal(node, 'svgBlip')]) {
      const rId = blip.getAttribute('r:embed') ?? blip.getAttribute('embed');
      if (rId && !seenRelIds.has(rId)) {
        seenRelIds.add(rId);
        await processEmbeddedMediaByRelId(rId);
      }
    }
    for (const vmlImg of getAllByLocal(node, 'imagedata')) {
      const rId = vmlImg.getAttribute('r:id') ?? vmlImg.getAttribute('id');
      if (rId && !seenRelIds.has(rId)) {
        seenRelIds.add(rId);
        await processEmbeddedMediaByRelId(rId);
      }
    }

    // Gráficos (<c:chart r:id="rId..."/>)
    for (const ch of getAllByLocal(node, 'chart')) {
      const rId = ch.getAttribute('r:id') ?? ch.getAttribute('id');
      const targetPath = rId ? relsById.get(rId) : undefined;
      if (targetPath) {
        const chartXml = await zip.file(targetPath)?.async('string');
        if (chartXml) {
          const parsed = parseWordChartXml(chartXml);
          if (parsed) {
            const png = renderParsedWordChartToPngDataUrl(parsed);
            if (png) {
              blocks.push({ kind: 'image', imageDataUrl: png, imageCaption: parsed.title });
              stats.chartsConverted++;
            } else {
              blocks.push({
                kind: 'table',
                tableHeaders: ['Categoría', ...parsed.series.map((s) => s.name)],
                tableRows: parsed.categories.map((cat, idx) => [
                  cat,
                  ...parsed.series.map((s) => String(s.values[idx] ?? 0)),
                ]),
                tableHasHeaderRow: true,
                text: parsed.title,
              });
              stats.chartsConverted++;
            }
          }
        }
      }
    }

    // Diagramas SmartArt (<dgm:relIds r:dm="rId..." r:lo="rId..."/>)
    for (const relIdsNode of getAllByLocal(node, 'relIds')) {
      const dmId = relIdsNode.getAttribute('r:dm') ?? relIdsNode.getAttribute('dm') ?? '';
      if (!dmId || processedDiagramIds.has(dmId)) continue;
      processedDiagramIds.add(dmId);
      const dataPath = relsById.get(dmId);
      const numMatch = dataPath?.match(/data(\d+)\.xml$/i);
      const drawingPath = numMatch ? `word/diagrams/drawing${numMatch[1]}.xml` : undefined;
      const dataXml = dataPath ? await zip.file(dataPath)?.async('string') : undefined;
      const drawingXml = drawingPath ? await zip.file(drawingPath)?.async('string') : undefined;
      const smartArt = await extractSmartArtDiagram({ dataXml, drawingXml });
      if (smartArt) {
        if (smartArt.imageDataUrl) {
          blocks.push({
            kind: 'image',
            imageDataUrl: smartArt.imageDataUrl,
            imageCaption: smartArt.summaryText,
          });
          stats.chartsConverted++;
        } else {
          blocks.push({
            kind: 'callout',
            calloutTitle: 'Diagrama del documento',
            calloutItems: smartArt.items,
            calloutVariant: 'nota',
            text: smartArt.summaryText,
          });
          stats.callouts++;
        }
      }
    }
  };

  const seenTextBoxes = new Set<Element>();
  const extractTextBoxesFromNode = (node: Element) => {
    const txbxs = [...getAllByLocal(node, 'txbxContent'), ...getAllByLocal(node, 'textbox')];
    for (const tb of txbxs) {
      if (seenTextBoxes.has(tb)) continue;
      seenTextBoxes.add(tb);
      const boxParas = getLocalChildren(tb, 'p')
        .map((tp) =>
          extractParagraphRichText(tp, {
            preserveFormatting: true,
            footnoteNumberByRawId,
            collectedFootnotes: chapterFootnotes,
            footnotesByRawId,
            endnoteNumberByRawId,
            endnotesByRawId,
            relsById,
          }),
        )
        .filter(Boolean);
      if (boxParas.length > 0) {
        const structured = parseCalloutParagraphsToStructured(boxParas);
        blocks.push({
          kind: 'callout',
          calloutTitle: structured.calloutTitle,
          calloutItems: structured.calloutItems,
          calloutVariant: structured.calloutVariant,
          text: structured.text,
          keepTogether: structured.text.length < 450,
        });
        markdownLines.push(boxParas.join('\n'));
        stats.callouts++;
      }
    }
  };

  const processSingleParagraph = async (
    p: Element,
    lookaheadIndex: number,
    siblingList: Element[] = bodyChildren,
  ): Promise<number> => {
    if (isTocParagraph(p, stylesById)) {
      const tocText = extractParagraphPlainText(p);
      if (tocText) parseTocLine(tocText);
      stats.ignoredTocBlocks++;
      return lookaheadIndex + 1;
    }

    await extractMediaFromNode(p);
    extractTextBoxesFromNode(p);

    const plainText = extractParagraphPlainText(p);
    if (!plainText) {
      return lookaheadIndex + 1;
    }

    const headingLvl = resolveHeadingLevel(p, stylesById);
    if (headingLvl) {
      // Omitir encabezado de índice manual ("ÍNDICE GENERAL") guardando sus entradas como mapa de referencia
      if (isManualTocHeadingText(plainText)) {
        let k = lookaheadIndex + 1;
        let tocMatches = 0;
        while (k < siblingList.length && k < lookaheadIndex + 40 && siblingList[k].localName === 'p') {
          const nextPlain = extractParagraphPlainText(siblingList[k]);
          if (!nextPlain) {
            k++;
            continue;
          }
          if (isTocParagraph(siblingList[k], stylesById) || isManualTocLineText(nextPlain)) {
            parseTocLine(nextPlain);
            tocMatches++;
            k++;
            continue;
          }
          break;
        }
        if (tocMatches >= 2) {
          inManualTocBlock = false;
          stats.ignoredTocBlocks += 1 + tocMatches;
          return k;
        }
        inManualTocBlock = true;
        stats.ignoredTocBlocks++;
        return lookaheadIndex + 1;
      }

      inManualTocBlock = false;
      if (headingLvl === 1) {
        flushChapterFootnotes();
      }
      lastHeadingWasLevel = headingLvl;
      const prefix = '#'.repeat(Math.min(3, headingLvl));
      blocks.push({ kind: 'heading', level: headingLvl, text: plainText });
      markdownLines.push(`${prefix} ${plainText}`);
      stats.headings++;
      return lookaheadIndex + 1;
    }

    if (inManualTocBlock && isManualTocLineText(plainText)) {
      parseTocLine(plainText);
      stats.ignoredTocBlocks++;
      return lookaheadIndex + 1;
    }
    inManualTocBlock = false;

    const richText = extractParagraphRichText(p, {
      preserveFormatting: true,
      footnoteNumberByRawId,
      collectedFootnotes: chapterFootnotes,
      footnotesByRawId,
      endnoteNumberByRawId,
      endnotesByRawId,
      relsById,
    });

    // Placeholder de figura ([Insertar Figura 1...])
    const placeholder = detectFigurePlaceholder(plainText);
    if (placeholder) {
      blocks.push({
        kind: 'figure_placeholder',
        figureNumber: placeholder.figureNumber,
        figureCaption: placeholder.figureCaption,
        figureHint: placeholder.figureHint,
        text: plainText,
        keepTogether: true,
      });
      markdownLines.push(plainText);
      stats.figurePlaceholders++;
      return lookaheadIndex + 1;
    }

    // Bloque CAJA N o párrafos sombreados / con borde agrupados en un único callout
    const startsExplicitCaja = /^(?:\*{1,3})?CAJA\s+\d+\b/i.test(plainText);
    const hasBoxStyle = hasParagraphShadingOrBorder(p);
    if (startsExplicitCaja || hasBoxStyle) {
      const boxParts: string[] = [richText];
      let k = lookaheadIndex + 1;
      while (k < siblingList.length && siblingList[k].localName === 'p') {
        const nextP = siblingList[k];
        if (resolveHeadingLevel(nextP, stylesById) || isTocParagraph(nextP, stylesById)) break;
        const nextPlain = extractParagraphPlainText(nextP);
        if (!nextPlain) {
          // Terminar grupo tras línea vacía si ya pasó el primer párrafo y el siguiente no tiene sombreado
          const peek = siblingList[k + 1];
          if (!peek || peek.localName !== 'p' || !hasParagraphShadingOrBorder(peek)) break;
          k++;
          continue;
        }
        if (/^(?:\*{1,3})?CAJA\s+\d+\b/i.test(nextPlain)) break;
        const nextShaded = hasParagraphShadingOrBorder(nextP);
        const isBulletLine = /^(?:[•\-–—*]|\d+[.)])\s+/.test(nextPlain);
        const looksInsideSameBox =
          (hasBoxStyle && nextShaded) ||
          (startsExplicitCaja && (nextShaded || isBulletLine || nextPlain.length <= 260));
        if (!looksInsideSameBox) break;
        const nextRich = extractParagraphRichText(nextP, {
          preserveFormatting: true,
          footnoteNumberByRawId,
          collectedFootnotes: chapterFootnotes,
          footnotesByRawId,
          endnoteNumberByRawId,
          endnotesByRawId,
          relsById,
        });
        boxParts.push(nextRich);
        k++;
        if (boxParts.length >= 16) break;
      }

      const structured = parseCalloutParagraphsToStructured(boxParts);
      const itemsList = Array.isArray(structured.calloutItems) ? structured.calloutItems : [];
      const totalBoxChars =
        structured.text.length + itemsList.reduce((acc, it) => acc + it.length, 0);
      blocks.push({
        kind: 'callout',
        calloutTitle: structured.calloutTitle,
        calloutItems: structured.calloutItems,
        calloutVariant: structured.calloutVariant,
        text: structured.text,
        keepTogether: totalBoxChars < 450 && itemsList.length <= 5,
      });
      markdownLines.push(boxParts.join('\n'));
      stats.callouts++;
      lastHeadingWasLevel = 0;
      return k;
    }

    const pPr = getLocalChildren(p, 'pPr')[0];
    const numPr = pPr ? getLocalChildren(pPr, 'numPr')[0] : null;
    const isList = Boolean(numPr);
    if (isList) {
      const listStyle: 'bullet' | 'numbered' = /^(?:\d+[.)]|[a-z][)])\s/i.test(plainText)
        ? 'numbered'
        : 'bullet';
      blocks.push({ kind: 'list', listStyle, text: richText });
      markdownLines.push(`• ${plainText}`);
      stats.paragraphs++;
      lastHeadingWasLevel = 0;
      return lookaheadIndex + 1;
    }

    // Poema en un párrafo con saltos <w:br/>
    if (isLikelyPoemParagraph(p, richText, plainText, stylesById)) {
      blocks.push({ kind: 'poem', text: richText, keepTogether: richText.length < 1100 });
      markdownLines.push(plainText);
      stats.poems++;
      lastHeadingWasLevel = 0;
      return lookaheadIndex + 1;
    }

    // Epígrafe corto en cursiva inmediatamente posterior a encabezado de capítulo
    const styleNameNorm = normalizeNfdLower(getParagraphStyleMeta(p, stylesById)?.name || '');
    if (
      lastHeadingWasLevel > 0 &&
      plainText.length <= 320 &&
      (styleNameNorm.includes('epigraf') ||
        styleNameNorm.includes('quote') ||
        styleNameNorm.includes('cita') ||
        isParagraphPredominantlyItalic(p))
    ) {
      blocks.push({ kind: 'epigraph', text: richText });
      markdownLines.push(plainText);
      stats.paragraphs++;
      lastHeadingWasLevel = 0;
      return lookaheadIndex + 1;
    }

    lastHeadingWasLevel = 0;
    blocks.push({ kind: 'paragraph', text: richText });
    markdownLines.push(plainText);
    stats.paragraphs++;
    return lookaheadIndex + 1;
  };

  const processContainerChildren = async (childrenList: Element[]): Promise<void> => {
    let idx = 0;
    while (idx < childrenList.length) {
      const child = childrenList[idx];
      if (child.localName === 'p') {
        idx = await processSingleParagraph(child, idx, childrenList);
        continue;
      }

      if (child.localName === 'tbl') {
        const trNodes = getLocalChildren(child, 'tr');
        const matrix: string[][] = [];
        for (const tr of trNodes) {
          const rowCells: string[] = [];
          for (const tc of getLocalChildren(tr, 'tc')) {
            // Extraer imágenes/gráficos/cuadros alojados dentro de celdas antes de leer texto
            await extractMediaFromNode(tc);
            const cellText = getLocalChildren(tc, 'p')
              .map((tp) =>
                extractParagraphRichText(tp, {
                  preserveFormatting: true,
                  footnoteNumberByRawId,
                  collectedFootnotes: chapterFootnotes,
                  footnotesByRawId,
                  endnoteNumberByRawId,
                  endnotesByRawId,
                  relsById,
                }),
              )
              .filter(Boolean)
              .join('\n');
            const tcPr = getLocalChildren(tc, 'tcPr')[0];
            const gridSpanEl = tcPr ? getLocalChildren(tcPr, 'gridSpan')[0] : undefined;
            const span = Math.max(
              1,
              Number(gridSpanEl?.getAttribute('w:val') ?? gridSpanEl?.getAttribute('val') ?? 1) || 1,
            );
            rowCells.push(cellText);
            for (let sp = 1; sp < span; sp++) rowCells.push('');
          }
          matrix.push(rowCells);
        }

        if (matrix.length > 0) {
          const maxCols = matrix.reduce((m, row) => Math.max(m, row.length), 0);
          const hasTextContent = matrix.some((row) => row.some((c) => c.trim().length > 0));
          if (!hasTextContent) {
            idx++;
            continue;
          }
          const normalizedMatrix = matrix.map((row) =>
            row.length < maxCols ? [...row, ...new Array(maxCols - row.length).fill('')] : row,
          );
          if (maxCols <= 1) {
            // Tabla de 1 sola columna (ej. Resguardo ético Ley 26.061 o CAJA didáctica en recuadro)
            const cellParagraphs = normalizedMatrix.flat().filter(Boolean);
            const structured = parseCalloutParagraphsToStructured(cellParagraphs);
            const itemsList = Array.isArray(structured.calloutItems) ? structured.calloutItems : [];
            const totalBoxChars =
              structured.text.length + itemsList.reduce((acc, it) => acc + it.length, 0);
            blocks.push({
              kind: 'callout',
              calloutTitle: structured.calloutTitle,
              calloutItems: structured.calloutItems,
              calloutVariant: structured.calloutVariant,
              text: structured.text,
              keepTogether: totalBoxChars < 450 && itemsList.length <= 5,
            });
            markdownLines.push(cellParagraphs.join('\n'));
            stats.callouts++;
          } else {
            const hasHeaderRow = !shouldTreatMultiColTableWithoutHeader(trNodes[0], normalizedMatrix);
            const tableHeaders = normalizedMatrix[0];
            const tableRows = normalizedMatrix.slice(1);
            blocks.push({
              kind: 'table',
              tableHeaders,
              tableRows,
              tableHasHeaderRow: hasHeaderRow,
            });
            markdownLines.push(normalizedMatrix.map((r) => r.join(' | ')).join('\n'));
            stats.tables++;
          }
        }
        idx++;
        continue;
      }

      if (child.localName === 'sdt') {
        if (isTocSdtElement(child, stylesById)) {
          for (const p of getAllByLocal(child, 'p')) {
            const line = extractParagraphPlainText(p);
            if (line) parseTocLine(line);
            stats.ignoredTocBlocks++;
          }
        } else {
          const sdtContent = getLocalChildren(child, 'sdtContent')[0];
          const innerChildren = sdtContent
            ? Array.from(sdtContent.children)
            : Array.from(child.children).filter((el) => el.localName !== 'sdtPr');
          await processContainerChildren(innerChildren);
        }
        idx++;
        continue;
      }

      idx++;
    }
  };

  await processContainerChildren(bodyChildren.slice(i));

  flushChapterFootnotes();

  const poemPass = mergeConsecutiveVerseBlocks(blocks);
  if (poemPass.mergedPoemCount > 0) {
    stats.poems += poemPass.mergedPoemCount;
    stats.paragraphs = Math.max(0, stats.paragraphs - poemPass.replacedParagraphs);
  }

  return {
    plainMarkdownText: markdownLines.join('\n\n').trim(),
    blocks: poemPass.blocks,
    warnings,
    ...(importedTocEntries.length > 0 ? { importedTocEntries } : {}),
    stats,
  };
}
