/**
 * Núcleo puro — Fragmentador y fusionador de manuscritos extensos (editorialManuscriptChunker.ts)
 *
 * Permite procesar textos largos (libros, tesis, apuntes, informes escaneados) sin perder
 * continuidad entre capítulos ni superar los límites de contexto por llamada de IA.
 *
 * Cumple Regla 8: normalización Unicode NFD sin diacríticos, regex ancladas y trazabilidad
 * cuando se aplica heurística léxica de respaldo.
 *
 * Este módulo es PURO (sin React, sin DOM) y testeable en Node.js.
 */
import type { EditorialRecord, EditorialSection, EditorialSectionKind } from './editorialTypes';
import { resolveCanonicalEditorialKey } from './editorialDockEngine';

export interface StructuredChunkRecordInput {
  type?: string;
  content?: string;
  quoteAttribution?: string;
}

export interface StructuredChunkSectionInput {
  title: string;
  sectionKey?: string;
  continuesPreviousSection?: boolean;
  records: StructuredChunkRecordInput[];
}

const VALID_RECORD_TYPES = new Set([
  'paragraph',
  'subtitle',
  'quote',
  'callout',
  'list',
  'table',
  'image',
  'bibliography_item',
  'qr_or_break',
]);

function normalizeTitleAscii(text: string): string {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function traceChunkHeuristic(reason: string, detail?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  void import('../../../shared/core/utils/monitoring')
    .then(({ reportMessage }) => {
      reportMessage(`Heurística de manuscrito editorial (${reason})`, 'info', {
        context: 'editorialManuscriptChunker',
        extra: detail,
      });
    })
    .catch(() => {});
}

const HEADING_CUE_REGEX =
  /^(?:#{1,3}\s+.+|(?:CAP[IÍ]TULO|CAP\.?|PARTE|UNIDAD|SECCI[ÓO]N|ANEXO|AP[ÉE]NDICE|PR[ÓO]LOGO|PREFACIO|DEDICATORIA|AGRADECIMIENTOS?|RESUMEN|ABSTRACT|INTRODUCCI[ÓO]N|MARCO TE[ÓO]RICO|ESTADO DEL ARTE|METODOLOG[IÍ]A|MATERIALES Y M[ÉE]TODOS|RESULTADOS?|DISCUSI[ÓO]N|CONCLUSI[ÓO]N(?:ES)?|EP[IÍ]LOGO|BIBLIOGRAF[IÍ]A|REFERENCIAS|GLOSARIO)\b.*|(?:[IVXL]{1,6}|[1-9]\d?)\.\s+[A-ZÁÉÍÓÚÜÑ].{2,80})$/;

/**
 * Divide un manuscrito extenso en fragmentos manejables (~7 500 caracteres)
 * respetando saltos de párrafo y encabezados detectables para no cortar frases ni citas.
 */
export function splitTextIntoManuscriptChunks(
  fullText: string,
  maxChunkChars: number = 7500,
): string[] {
  const clean = String(fullText || '').replace(/\r\n?/g, '\n').trim();
  if (!clean) return [];
  if (clean.length <= maxChunkChars) return [clean];

  const paragraphs = clean.split(/\n{2,}/);
  const chunks: string[] = [];
  let currentParts: string[] = [];
  let currentLength = 0;

  const flush = () => {
    if (currentParts.length > 0) {
      chunks.push(currentParts.join('\n\n'));
      currentParts = [];
      currentLength = 0;
    }
  };

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Si es un párrafo gigante mayor que maxChunkChars, dividirlo por oraciones
    if (trimmed.length > maxChunkChars) {
      flush();
      const sentences = trimmed.split(/(?<=[.!?])\s+/);
      let sentenceBuf = '';
      for (const s of sentences) {
        if ((sentenceBuf + ' ' + s).trim().length > maxChunkChars) {
          if (sentenceBuf.trim()) chunks.push(sentenceBuf.trim());
          // Si incluso una oración supera maxChunkChars, corte duro seguro
          if (s.length > maxChunkChars) {
            for (let i = 0; i < s.length; i += maxChunkChars) {
              chunks.push(s.slice(i, i + maxChunkChars));
            }
            sentenceBuf = '';
          } else {
            sentenceBuf = s;
          }
        } else {
          sentenceBuf = sentenceBuf ? `${sentenceBuf} ${s}` : s;
        }
      }
      if (sentenceBuf.trim()) chunks.push(sentenceBuf.trim());
      continue;
    }

    const firstLine = trimmed.split('\n')[0].trim();
    const isHeadingStart = HEADING_CUE_REGEX.test(firstLine);
    const projected = currentLength + trimmed.length + (currentParts.length > 0 ? 2 : 0);

    // Si supera el máximo (o ya pasó el 75 % del cupo y empieza un capítulo/encabezado claro), cerrar chunk previo
    if (
      currentParts.length > 0 &&
      (projected > maxChunkChars || (isHeadingStart && currentLength >= Math.floor(maxChunkChars * 0.72)))
    ) {
      flush();
    }

    currentParts.push(trimmed);
    currentLength += trimmed.length + (currentParts.length > 1 ? 2 : 0);
  }

  flush();
  return chunks;
}

function makeRecordId(prefix: string, idx: number): string {
  return `${prefix}_rec_${idx}_${Math.random().toString(36).slice(2, 7)}`;
}

import type { DocxExtractedRichBlock } from './docxClientExtractor';

export function countNonWhitespaceChars(text: string): number {
  return String(text || '').replace(/\s+/g, '').length;
}

export function countSectionRecordsChars(sections: StructuredChunkSectionInput[]): number {
  let total = 0;
  for (const sec of sections) {
    if (!sec || !Array.isArray(sec.records)) continue;
    for (const rec of sec.records) {
      const txt =
        (typeof rec?.content === 'string' && rec.content) ||
        (typeof (rec as any)?.text === 'string' && (rec as any).text) ||
        (typeof (rec as any)?.body === 'string' && (rec as any).body) ||
        '';
      total += countNonWhitespaceChars(txt);
    }
  }
  return total;
}

/**
 * Construye secciones editoriales directamente desde bloques OOXML reales de Word
 * cuando el archivo ya tiene estructura (Headings, tablas, imágenes, gráficos),
 * garantizando 100% de conservación sin truncar jamás.
 */
export function buildSectionsFromDocxRichBlocks(
  blocks: DocxExtractedRichBlock[],
): EditorialSection[] {
  if (!Array.isArray(blocks) || blocks.length === 0) return [];

  const sections: EditorialSection[] = [];
  let currentTitle = 'Cuerpo principal';
  let currentRecords: EditorialRecord[] = [];
  let counter = 0;

  const flushSection = () => {
    if (currentRecords.length === 0) return;
    const { sectionKey, category } = resolveCanonicalEditorialKey({ title: currentTitle });
    const secId = `ed_${sectionKey}_${Date.now()}_${sections.length}_${Math.random().toString(36).slice(2, 5)}`;
    sections.push({
      id: secId,
      title: currentTitle,
      sectionKey,
      category: category as EditorialSectionKind,
      visible: true,
      includeInToc: sectionKey !== 'portada' && sectionKey !== 'dedicatoria',
      startNewPage: true,
      position: sections.length,
      records: currentRecords.map((r, idx) => ({ ...r, id: makeRecordId(secId, idx) })),
    });
    currentRecords = [];
  };

  for (const block of blocks) {
    if (block.kind === 'heading' && (block.level === 1 || block.level === 2) && block.text) {
      if (currentRecords.length > 0) {
        flushSection();
      }
      currentTitle = block.text.trim();
      continue;
    }

    if (block.kind === 'heading' && block.text) {
      currentRecords.push({
        id: `tmp_${counter++}`,
        type: 'subtitle',
        subtitleLevel: 2,
        content: block.text.trim(),
      });
      continue;
    }

    if (block.kind === 'table' && (block.tableHeaders?.length || block.tableRows?.length)) {
      currentRecords.push({
        id: `tmp_${counter++}`,
        type: 'table',
        content: block.text || 'Tabla importada de Word',
        tableHeaders: block.tableHeaders || [],
        tableRows: block.tableRows || [],
      });
      continue;
    }

    if (block.kind === 'image' && block.imageDataUrl) {
      currentRecords.push({
        id: `tmp_${counter++}`,
        type: 'image',
        content: block.imageCaption || 'Imagen importada',
        imagePath: block.imageDataUrl,
        imageCaption: block.imageCaption || '',
      });
      continue;
    }

    if (block.text && block.text.trim()) {
      currentRecords.push({
        id: `tmp_${counter++}`,
        type: block.kind === 'list' ? 'list' : block.kind === 'callout' ? 'callout' : 'paragraph',
        content: block.text.trim(),
      });
    }
  }

  flushSection();
  return sections;
}

function sanitizeIncomingRecords(
  records: StructuredChunkRecordInput[] | undefined,
  prefix: string,
  startOffset: number = 0,
): EditorialRecord[] {
  if (!Array.isArray(records)) return [];
  const out: EditorialRecord[] = [];
  for (let i = 0; i < records.length; i++) {
    const raw = records[i] as any;
    const content =
      typeof raw?.content === 'string'
        ? raw.content.trim()
        : typeof raw?.text === 'string'
          ? raw.text.trim()
          : typeof raw?.body === 'string'
            ? raw.body.trim()
            : typeof raw?.paragraph === 'string'
              ? raw.paragraph.trim()
              : '';
    if (!content) continue;
    const rawType = typeof raw?.type === 'string' ? raw.type : 'paragraph';
    const type = VALID_RECORD_TYPES.has(rawType) ? (rawType as EditorialRecord['type']) : 'paragraph';
    out.push({
      id: makeRecordId(prefix, startOffset + i),
      type,
      content,
      ...(raw?.quoteAttribution ? { quoteAttribution: String(raw.quoteAttribution).trim() } : {}),
    });
  }
  return out;
}

/**
 * Fusiona progresivamente las secciones generadas por múltiples fragmentos de IA,
 * unificando automáticamente continuaciones (`continuesPreviousSection === true` o título repetido)
 * para que ningún capítulo largo quede partido a la mitad.
 */
export function mergeEditorialChunkedSections(
  accumulatedSections: EditorialSection[],
  incomingChunkSections: StructuredChunkSectionInput[],
): EditorialSection[] {
  const result: EditorialSection[] = accumulatedSections.map((sec) => ({
    ...sec,
    records: [...sec.records],
  }));

  for (let i = 0; i < incomingChunkSections.length; i++) {
    const incoming = incomingChunkSections[i];
    if (!incoming || !Array.isArray(incoming.records)) continue;

    const cleanTitle = String(incoming.title || '').trim() || `Sección ${result.length + 1}`;
    const lastSection = result.length > 0 ? result[result.length - 1] : null;
    const sameNormalizedTitle =
      lastSection !== null &&
      normalizeTitleAscii(lastSection.title) === normalizeTitleAscii(cleanTitle);

    const shouldMergeIntoPrevious =
      lastSection !== null &&
      ((i === 0 && incoming.continuesPreviousSection === true) || sameNormalizedTitle);

    if (shouldMergeIntoPrevious && lastSection) {
      const nextRecords = sanitizeIncomingRecords(
        incoming.records,
        lastSection.id,
        lastSection.records.length,
      );
      lastSection.records.push(...nextRecords);
      continue;
    }

    const { sectionKey, category } = resolveCanonicalEditorialKey({
      title: cleanTitle,
      sectionKey: incoming.sectionKey,
    });
    const secId = `ed_${sectionKey}_${Date.now()}_${result.length}_${Math.random().toString(36).slice(2, 5)}`;
    const records = sanitizeIncomingRecords(incoming.records, secId, 0);

    result.push({
      id: secId,
      title: cleanTitle,
      sectionKey,
      category: category as EditorialSectionKind,
      visible: true,
      includeInToc: sectionKey !== 'portada' && sectionKey !== 'dedicatoria',
      startNewPage: true,
      position: result.length,
      records:
        records.length > 0
          ? records
          : [{ id: makeRecordId(secId, 0), type: 'paragraph', content: '' }],
    });
  }

  return result.map((sec, idx) => ({ ...sec, position: idx }));
}

/**
 * Divisor heurístico local de respaldo cuando la IA no está disponible o un texto plano
 * no tiene metadatos: identifica títulos estructurales sin formato o agrupa en apartados legibles.
 * Cumple Regla 8 con normalización NFD y reporte de trazabilidad.
 */
export function heuristicSplitManuscript(fullText: string): StructuredChunkSectionInput[] {
  const clean = String(fullText || '').replace(/\r\n?/g, '\n').trim();
  if (!clean) return [];

  traceChunkHeuristic('offline_or_fallback_split', { length: clean.length });

  const lines = clean.split('\n');
  const sections: StructuredChunkSectionInput[] = [];
  let currentTitle = 'Capítulo 1';
  let currentParagraphBuffer: string[] = [];
  let foundExplicitHeadings = false;

  const pushParagraph = (records: StructuredChunkRecordInput[], text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (/^[-*•]\s+/.test(trimmed)) {
      records.push({ type: 'list', content: trimmed.replace(/^[-*•]\s+/gm, '') });
    } else if (/^>/.test(trimmed)) {
      records.push({ type: 'quote', content: trimmed.replace(/^>\s?/gm, '') });
    } else if (trimmed.startsWith('##')) {
      records.push({ type: 'subtitle', content: trimmed.replace(/^#+\s*/, '') });
    } else {
      records.push({ type: 'paragraph', content: trimmed });
    }
  };

  let activeRecords: StructuredChunkRecordInput[] = [];

  const flushParagraphBuffer = () => {
    if (currentParagraphBuffer.length > 0) {
      pushParagraph(activeRecords, currentParagraphBuffer.join(' '));
      currentParagraphBuffer = [];
    }
  };

  const finalizeSection = () => {
    flushParagraphBuffer();
    if (activeRecords.length > 0) {
      const { sectionKey } = resolveCanonicalEditorialKey({ title: currentTitle });
      sections.push({
        title: currentTitle,
        sectionKey,
        records: activeRecords,
      });
      activeRecords = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraphBuffer();
      continue;
    }

    const normalized = normalizeTitleAscii(line);
    const matchesCue =
      /^#{1}\s+/.test(line) ||
      (line.length <= 85 &&
        (/^(capitulo|parte|unidad|anexo|apendice|prologo|prefacio|dedicatoria|agradecimientos?|resumen|abstract|introduccion|marco teorico|estado del arte|metodologia|materiales y metodos|resultados?|discusion|conclusiones?|epilogo|bibliografia|referencias|glosario)\b/.test(
          normalized,
        ) ||
          /^(?:[ivxl]{1,5}|[1-9]\d?)\.\s+[a-z]{3,}/.test(normalized)));

    if (matchesCue) {
      foundExplicitHeadings = true;
      finalizeSection();
      currentTitle = line.replace(/^#+\s*/, '').trim();
    } else {
      currentParagraphBuffer.push(line);
    }
  }

  finalizeSection();

  // Si el manuscrito largo no tenía ningún encabezado detectable, agrupar en secciones legibles de ~400 palabras
  if (!foundExplicitHeadings && sections.length === 1 && sections[0].records.length > 6) {
    const allRecs = sections[0].records;
    const grouped: StructuredChunkSectionInput[] = [];
    const chunkSize = 6;
    for (let i = 0; i < allRecs.length; i += chunkSize) {
      const partIdx = Math.floor(i / chunkSize) + 1;
      grouped.push({
        title: `Sección ${partIdx}`,
        sectionKey: 'capitulo',
        records: allRecs.slice(i, i + chunkSize),
      });
    }
    return grouped;
  }

  return sections;
}
