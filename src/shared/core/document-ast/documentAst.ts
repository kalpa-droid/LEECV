import { z } from 'zod';

/**
 * NÚCLEO — DocumentAST Canónico Lossless (documentAst.ts)
 *
 * Separa por completo el contenido íntegro (bloques con ID inmutable `blk_00001..` y activos
 * binarios en Asset Vault identificados por hash) del razonamiento estructural de la IA.
 * La IA nunca reescribe el documento: devuelve únicamente punteros `blockIds`, validados
 * matemáticamente con biyección 1:1 antes de reconstruir la obra.
 */

export const MAX_DOCX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;
export const MAX_DOCX_EMBEDDED_IMAGES = 200;

export const BlockTypeSchema = z.enum([
  'heading',
  'paragraph',
  'table',
  'image',
  'diagram',
  'chart',
  'list',
  'quote',
  'callout',
  'poem',
  'epigraph',
  'figure_placeholder',
  'footnote_list',
]);

export const CanonicalBlockSchema = z.object({
  id: z.string().regex(/^blk_\d{5}$/),
  type: BlockTypeSchema,
  page: z.number().int().positive(),
  order: z.number().int().nonnegative(),
  headingLevel: z.number().int().min(1).max(6).optional(),
  isBoldLead: z.boolean().optional(),
  text: z.string().optional(),
  listStyle: z.enum(['bullet', 'numbered']).optional(),
  quoteAttribution: z.string().optional(),
  calloutVariant: z.string().optional(),
  calloutTitle: z.string().optional(),
  calloutItems: z.array(z.string()).optional(),
  preserveLineBreaks: z.boolean().optional(),
  footnotes: z.array(z.object({ number: z.number(), text: z.string() })).optional(),
  figureCaption: z.string().optional(),
  figureHint: z.string().optional(),
  tableData: z
    .object({
      headers: z.array(z.string()),
      rows: z.array(z.array(z.string())),
      caption: z.string().optional(),
      hasHeaderRow: z.boolean().optional(),
    })
    .optional(),
  assetRef: z
    .object({
      assetId: z.string(), // asset://<hash> en IndexedDB o SHA-256
      mimeType: z.enum(['image/png', 'image/webp', 'image/jpeg', 'image/svg+xml']),
      bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
      semanticSummary: z.string(),
      mermaidSource: z.string().optional(),
    })
    .optional(),
  sha256: z.string(),
});

export const DocumentASTSchema = z.object({
  docId: z.string().min(1),
  sourceName: z.string(),
  sourceMime: z.enum([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/png',
  ]),
  totalPages: z.number().int().positive(),
  blocks: z.array(CanonicalBlockSchema).min(1),
});

export const SectionNodeSchema = z.object({
  sectionId: z.string(),
  sectionKey: z.string().nullish(),
  category: z.enum(['preliminares', 'cuerpo', 'cierre', 'personalizada']).nullish(),
  title: z.string(),
  level: z.number().int().min(1).max(4).nullish().transform((v) => v ?? 1),
  blockIds: z.array(z.string()).nullish().transform((v) => v ?? []),
  startBlockId: z.string().nullish(),
  endBlockId: z.string().nullish(),
  excludedBlockIds: z.array(z.string()).nullish(),
  roleOverrides: z.record(z.string(), BlockTypeSchema).nullish(),
  rationale: z.string().nullish().transform((v) => v ?? ''),
});

export const StructureAuditIssueSchema = z.object({
  type: z.enum(['duplicate_heading', 'empty_section', 'toc_mismatch', 'missing_section']),
  title: z.string(),
  detail: z.string(),
  sectionId: z.string().nullish(),
});

export const StructureAnalysisSchema = z.object({
  documentType: z.enum([
    'book',
    'academic_paper',
    'technical_manual',
    'business_report',
    'cv_portfolio',
    'legal_contract',
    'other',
  ]),
  detectedPresetId: z.string().nullish(),
  recommendedStructuralNormId: z.enum(['libre', 'apa7', 'chicago', 'mla']).nullish(),
  recommendedBibliographyStyle: z
    .enum(['apa7', 'vancouver', 'ieee', 'harvard', 'chicago', 'mla', 'tradicional'])
    .nullish(),
  currentStructureScore: z.number().min(0).max(100),
  keepOriginalStructure: z.boolean(),
  extractedMetadata: z
    .object({
      title: z.string().nullish(),
      subtitle: z.string().nullish(),
      author: z.string().nullish(),
    })
    .nullish(),
  extractedLegalFields: z
    .object({
      institucion: z.string().nullish(),
      catedra: z.string().nullish(),
      docente: z.string().nullish(),
      integrantes: z.string().nullish(),
      tema: z.string().nullish(),
    })
    .nullish(),
  coverBlockIds: z.array(z.string()).nullish(),
  tocBlockIds: z.array(z.string()).nullish(),
  auditIssues: z.array(StructureAuditIssueSchema).nullish(),
  diagnosis: z.array(z.string()).nullish().transform((v) => v ?? []),
  improvementSuggestions: z.array(z.string()).nullish().transform((v) => v ?? []),
  proposedSections: z.array(SectionNodeSchema),
});

export type CanonicalBlockType = z.infer<typeof BlockTypeSchema>;
export type CanonicalBlock = z.infer<typeof CanonicalBlockSchema>;
export type DocumentAST = z.infer<typeof DocumentASTSchema>;
export type SectionNode = z.infer<typeof SectionNodeSchema>;
export type StructureAuditIssue = z.infer<typeof StructureAuditIssueSchema>;
export type StructureAnalysis = z.infer<typeof StructureAnalysisSchema>;

export function formatBlockId(index: number): string {
  return `blk_${String(Math.max(1, index + 1)).padStart(5, '0')}`;
}

/**
 * Validación de Magic Bytes reales (nunca confía en extensión ni MIME declarado por el navegador).
 */
export function detectSafeDocumentMime(
  buf: Uint8Array,
): 'pdf' | 'docx' | 'png' | 'jpeg' | 'webp' | 'text' | null {
  if (!buf || buf.length < 4) return null;

  // PDF: "%PDF" en los primeros 1024 bytes (tolera BOM o bytes previos válidos según spec PDF)
  const pdfSearchLimit = Math.min(buf.length - 4, 1024);
  for (let i = 0; i <= pdfSearchLimit; i++) {
    if (buf[i] === 0x25 && buf[i + 1] === 0x50 && buf[i + 2] === 0x44 && buf[i + 3] === 0x46) {
      return 'pdf';
    }
  }
  // DOCX / ODT / ZIP container: "PK\x03\x04" -> 50 4B 03 04
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    return 'docx';
  }
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return 'png';
  }
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'jpeg';
  }
  // WebP: RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'webp';
  }

  // Texto plano legible (sin NUL bytes en los primeros 512 bytes)
  const sampleLen = Math.min(buf.length, 512);
  for (let i = 0; i < sampleLen; i++) {
    const b = buf[i];
    if (b === 0) return null;
    if (b < 0x09 || (b > 0x0d && b < 0x20)) return null;
  }
  return 'text';
}

export async function computeSha256Hex(input: string | Uint8Array): Promise<string> {
  const data =
    typeof input === 'string' ? new TextEncoder().encode(input) : input;
  if (typeof globalThis.crypto?.subtle?.digest === 'function') {
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', copy.buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback determinista para entornos sin WebCrypto subtle
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < data.length; i++) {
    h1 ^= data[i];
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= data[i] ^ (i & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

export interface ImportedTocRef {
  title: string;
  pageLabel?: string;
  level: number;
}

function normalizeAstAscii(raw: string): string {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function isHeadingLikeAstBlock(b: CanonicalBlock): boolean {
  if (b.type === 'heading') return true;
  if (b.type !== 'paragraph') return false;
  const txt = (b.text || '').trim();
  if (!txt || txt.length > 130) return false;
  if (/^(?:\d+(?:\.\d+)?|[IVXL]{1,5})\.\s+[A-ZÁÉÍÓÚÜÑ]/.test(txt)) return true;
  if (
    /^(?:CAP[IÍ]TULO|UNIDAD|SECCI[ÓO]N|ANEXO|AP[ÉE]NDICE|PR[ÓO]LOGO|INTRODUCCI[ÓO]N|RESUMEN|ABSTRACT|MARCO TE[ÓO]RICO|METODOLOG[IÍ]A|RESULTADOS|DISCUSI[ÓO]N|CONCLUSI[ÓO]N(?:ES)?|BIBLIOGRAF[IÍ]A|REFERENCIAS|GLOSARIO)\b/i.test(
      txt,
    )
  ) {
    return true;
  }
  return Boolean(b.isBoldLead && txt.length <= 95 && !txt.endsWith('.'));
}

function inferSectionKeyFromHeading(title: string): {
  sectionKey: string;
  category: 'preliminares' | 'cuerpo' | 'cierre';
} {
  const norm = normalizeAstAscii(title).replace(/^(?:\d+(?:\.\d+)?|[ivxl]+)[.)]\s*/, '');
  if (/^(?:prologo|prefacio)\b/.test(norm)) return { sectionKey: 'prologo', category: 'preliminares' };
  if (/^(?:dedicatoria)\b/.test(norm)) return { sectionKey: 'dedicatoria', category: 'preliminares' };
  if (/^(?:agradecimientos?)\b/.test(norm)) return { sectionKey: 'agradecimientos', category: 'preliminares' };
  if (/^(?:resumen\s+ejecutivo)\b/.test(norm)) return { sectionKey: 'resumen_ejecutivo', category: 'preliminares' };
  if (/^(?:resumen|abstract)\b/.test(norm)) return { sectionKey: 'resumen', category: 'preliminares' };
  if (/^(?:introduccion|fundamentacion)\b/.test(norm)) return { sectionKey: 'introduccion', category: 'preliminares' };
  if (/^(?:objetivos?|alcance)\b/.test(norm)) return { sectionKey: 'objetivos_alcance', category: 'cuerpo' };
  if (/^(?:diagnostico)\b/.test(norm)) return { sectionKey: 'diagnostico', category: 'cuerpo' };
  if (/^(?:marco\s+teorico|estado\s+del\s+arte|antecedentes)\b/.test(norm)) return { sectionKey: 'marco_teorico', category: 'cuerpo' };
  if (/^(?:metodologia|materiales\s+y\s+metodos)\b/.test(norm)) return { sectionKey: 'metodologia', category: 'cuerpo' };
  if (/^(?:resultados?)\b/.test(norm)) return { sectionKey: 'resultados', category: 'cuerpo' };
  if (/^(?:discusion)\b/.test(norm)) return { sectionKey: 'discusion', category: 'cuerpo' };
  if (/^(?:conclusiones?)\b/.test(norm)) return { sectionKey: 'conclusiones', category: 'cierre' };
  if (/^(?:recomendaciones)\b/.test(norm)) return { sectionKey: 'recomendaciones', category: 'cierre' };
  if (/^(?:epilogo)\b/.test(norm)) return { sectionKey: 'epilogo', category: 'cierre' };
  if (/^(?:bibliografia|referencias|fuentes|obras\s+citadas)\b/.test(norm)) return { sectionKey: 'bibliografia', category: 'cierre' };
  if (/^(?:glosario)\b/.test(norm)) return { sectionKey: 'glosario', category: 'cierre' };
  if (/^(?:anexo|apendice)\b/.test(norm)) return { sectionKey: 'anexo', category: 'cierre' };
  if (/^(?:unidad)\b/.test(norm)) return { sectionKey: 'unidad', category: 'cuerpo' };
  return { sectionKey: 'capitulo', category: 'cuerpo' };
}

/**
 * Construye un Mapa Panorámico de la obra completa (100% de la estructura en pocos miles de caracteres):
 * - Comprime rachas largas de párrafos comunes contiguos en 1 sola línea de rango (`blk_00014..blk_00031`).
 * - Muestra íntegros los encabezados, candidatos en negrita, tablas, imágenes/diagramas y notas.
 * - Incluye `<imported_toc>` (si el archivo traía índice) y `<local_pre_audit>` (duplicados y huecos vacíos).
 */
export function buildPanoramicDocumentMap(
  ast: DocumentAST,
  options?: { importedTocEntries?: ImportedTocRef[]; maxSnippetChars?: number },
): string {
  const maxChars = options?.maxSnippetChars ?? 200;
  const lines: string[] = [];
  const blocks = ast.blocks;

  let i = 0;
  const headingHistory = new Map<string, string[]>();
  const emptyCandidates: string[] = [];

  while (i < blocks.length) {
    const b = blocks[i];

    if (
      b.type === 'paragraph' &&
      !isHeadingLikeAstBlock(b) &&
      i + 2 < blocks.length &&
      blocks[i + 1].type === 'paragraph' &&
      !isHeadingLikeAstBlock(blocks[i + 1]) &&
      blocks[i + 2].type === 'paragraph' &&
      !isHeadingLikeAstBlock(blocks[i + 2])
    ) {
      let end = i + 2;
      let totalChars = (b.text?.length || 0) + (blocks[i + 1].text?.length || 0) + (blocks[i + 2].text?.length || 0);
      while (
        end + 1 < blocks.length &&
        blocks[end + 1].type === 'paragraph' &&
        !isHeadingLikeAstBlock(blocks[end + 1])
      ) {
        end++;
        totalChars += blocks[end].text?.length || 0;
      }
      const startText = (b.text || '').replace(/\s+/g, ' ').trim().slice(0, 95);
      const endText = (blocks[end].text || '').replace(/\s+/g, ' ').trim().slice(0, 95);
      lines.push(
        `[${b.id}..${blocks[end].id}|P${b.page}-P${blocks[end].page}|PARAGRAPHS:${end - i + 1}|chars:${totalChars}] "${startText}" ... "${endText}"`,
      );
      i = end + 1;
      continue;
    }

    if (b.type === 'table' && b.tableData) {
      const hdrs = b.tableData.headers.filter(Boolean).join(', ');
      lines.push(
        `[${b.id}|P${b.page}|TABLE|${b.tableData.headers.length}x${b.tableData.rows.length}|headers:${hdrs}]`,
      );
    } else if (b.assetRef) {
      lines.push(
        `[${b.id}|P${b.page}|${b.type.toUpperCase()}|asset:${b.assetRef.assetId.slice(0, 14)}|desc:${b.assetRef.semanticSummary.slice(0, maxChars)}]`,
      );
    } else {
      const snippet = (b.text ?? '').replace(/\s+/g, ' ').trim().slice(0, maxChars);
      const isHead = isHeadingLikeAstBlock(b);
      const lvl = b.headingLevel ? `H${b.headingLevel}` : isHead ? 'HEADING_CANDIDATE' : b.type.toUpperCase();
      lines.push(`[${b.id}|P${b.page}|${lvl}] ${snippet}`);

      if (isHead && snippet) {
        const normH = normalizeAstAscii(snippet).replace(/^(?:\d+(?:\.\d+)?|[ivxl]+)[.)]\s*/, '');
        if (normH.length >= 3) {
          const list = headingHistory.get(normH) || [];
          list.push(b.id);
          headingHistory.set(normH, list);
        }
        const nextBlk = blocks[i + 1];
        if (!nextBlk || isHeadingLikeAstBlock(nextBlk)) {
          emptyCandidates.push(`${b.id} ("${snippet.slice(0, 60)}")`);
        }
      }
    }

    i++;
  }

  const extraSections: string[] = [];
  if (options?.importedTocEntries && options.importedTocEntries.length > 0) {
    const tocStr = options.importedTocEntries
      .slice(0, 60)
      .map((t) => `- ${t.title}${t.pageLabel ? ` (pág. ${t.pageLabel})` : ''}`)
      .join('\n');
    extraSections.push(`<imported_toc>\n${tocStr}\n</imported_toc>`);
  }

  const dupNotes: string[] = [];
  for (const [hKey, ids] of headingHistory.entries()) {
    if (ids.length > 1) {
      dupNotes.push(`Título repetido "${hKey}" en [${ids.join(', ')}]`);
    }
  }
  if (dupNotes.length > 0 || emptyCandidates.length > 0) {
    const auditLines = [
      ...dupNotes.map((d) => `- DUPLICADO: ${d}`),
      ...emptyCandidates.map((e) => `- SIN_CONTENIDO: ${e}`),
    ];
    extraSections.push(`<local_pre_audit>\n${auditLines.join('\n')}\n</local_pre_audit>`);
  }

  return [...extraSections, lines.join('\n')].filter(Boolean).join('\n\n');
}

/**
 * Expande rangos `startBlockId..endBlockId` (y `excludedBlockIds`) de un `SectionNode`
 * hacia la lista exacta de IDs presentes en el AST.
 */
function normalizeLexicalText(text: string): string {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const COVER_LABEL_RE =
  /^(?:tema|proyecto|t[ií]tulo|subt[ií]tulo|autor(?:es|a)?|alum(?:no|na|nos)|integrantes?|docente|profesor(?:a)?|tutor(?:a)?|c[aá]tedra|materia|asignatura|instituci[oó]n|universidad|facultad|colegio|escuela|fecha|curso|grado|a[ñn]o|carrera|comisi[oó]n|sede)\s*:/i;

const SPECIAL_SECTION_KEYS = new Set([
  'anexo',
  'bibliografia',
  'glosario',
  'dedicatoria',
  'agradecimientos',
]);

const SPECIAL_SECTION_TITLE_RE =
  /\b(?:anexo|apendice|bibliografia|referencias|glosario)\b/;

/**
 * Evita que la IA use `coverBlockIds` como agujero negro para absorber párrafos de cuerpo real.
 */
export function isGenuineCoverMetadataBlock(blk: CanonicalBlock): boolean {
  if (!blk) return false;
  if (
    blk.type === 'table' ||
    blk.type === 'footnote_list' ||
    blk.type === 'diagram' ||
    blk.type === 'chart'
  ) {
    return false;
  }
  const text = String(blk.text || '').trim();
  if (!text) return true;
  if (blk.type === 'image') return text.length <= 140;
  if (COVER_LABEL_RE.test(text) && text.length <= 260) return true;
  if (blk.type === 'heading') return text.length <= 200;

  const sentencePunct = (text.match(/[.!?](?:\s|$)/g) || []).length;
  if (text.length > 220 || (text.length > 140 && sentencePunct >= 2)) {
    return false;
  }
  return true;
}

/**
 * Evita que párrafos reales de la obra terminen descartados dentro de `tocBlockIds`.
 */
export function isGenuineTocBlock(blk: CanonicalBlock): boolean {
  if (!blk) return false;
  if (
    blk.type === 'table' ||
    blk.type === 'image' ||
    blk.type === 'footnote_list' ||
    blk.type === 'diagram' ||
    blk.type === 'chart' ||
    blk.type === 'quote' ||
    blk.type === 'poem'
  ) {
    return false;
  }
  const raw = String(blk.text || '').trim();
  if (!raw) return true;
  const norm = normalizeLexicalText(raw);
  if (/^(?:indice(?:\s+general)?|tabla\s+de\s+contenido(?:s)?|contenido|sumario)\s*:?$/.test(norm) && raw.length <= 80) {
    return true;
  }
  if (/(?:\.{2,}|…|\t|\s{2,})\s*(?:\d{1,4}|[ivxlcdm]{1,6})\s*$/i.test(raw) && raw.length <= 180) {
    return true;
  }
  if (/^(?:\d+(?:\.\d+)*|[ivxlcdm]+)[.)]?\s+\S.{1,120}?\s+(?:\d{1,4}|[ivxlcdm]{1,6})\s*$/i.test(norm)) {
    return true;
  }
  return false;
}

/**
 * Expande tanto IDs individuales como rangos string del tipo `"blk_00001..blk_00005"`
 * que la IA puede emitir dentro de `blockIds`.
 */
export function expandBlockIdListOrRanges(
  ast: DocumentAST,
  rawIds: string[] = [],
): string[] {
  const indexById = new Map<string, number>();
  ast.blocks.forEach((b, idx) => indexById.set(b.id, idx));
  const out: string[] = [];

  for (const item of rawIds) {
    const trimmed = String(item || '').trim();
    if (!trimmed) continue;
    const rangeMatch = /^(blk_[A-Za-z0-9_-]+)\s*(?:\.\.|[-–—]|to)\s*(blk_[A-Za-z0-9_-]+)$/i.exec(
      trimmed,
    );
    if (rangeMatch) {
      const startIdx = indexById.get(rangeMatch[1]);
      const endIdx = indexById.get(rangeMatch[2]);
      if (startIdx !== undefined && endIdx !== undefined && endIdx >= startIdx) {
        for (let k = startIdx; k <= endIdx; k++) {
          out.push(ast.blocks[k].id);
        }
        continue;
      }
    }
    out.push(trimmed);
  }
  return out;
}

export function expandSectionNodeBlockIds(
  ast: DocumentAST,
  node: SectionNode,
  nextSectionStartBlockId?: string | null,
): string[] {
  const excluded = new Set(Array.isArray(node.excludedBlockIds) ? node.excludedBlockIds : []);
  const explicit = expandBlockIdListOrRanges(
    ast,
    Array.isArray(node.blockIds) ? node.blockIds.filter(Boolean) : [],
  );

  if (!node.startBlockId && !node.endBlockId) {
    return explicit.filter((id) => !excluded.has(id));
  }

  const indexById = new Map<string, number>();
  ast.blocks.forEach((b, idx) => indexById.set(b.id, idx));

  const startIdx = node.startBlockId ? (indexById.get(node.startBlockId) ?? -1) : -1;
  let endIdx = node.endBlockId ? (indexById.get(node.endBlockId) ?? -1) : -1;

  if (startIdx >= 0 && endIdx < 0) {
    if (nextSectionStartBlockId) {
      const nextIdx = indexById.get(nextSectionStartBlockId) ?? -1;
      if (nextIdx > startIdx) {
        endIdx = nextIdx - 1;
      }
    } else if (nextSectionStartBlockId === null) {
      endIdx = ast.blocks.length - 1;
    }
    if (endIdx < startIdx) {
      let maxExplicit = startIdx;
      for (const id of explicit) {
        const idx = indexById.get(id);
        if (idx !== undefined && idx > maxExplicit) maxExplicit = idx;
      }
      endIdx = maxExplicit;
    }
  }

  const rangeIds: string[] = [];
  if (startIdx >= 0) {
    const safeEnd = endIdx >= startIdx ? endIdx : startIdx;
    for (let i = startIdx; i <= safeEnd && i < ast.blocks.length; i++) {
      const id = ast.blocks[i].id;
      if (!excluded.has(id)) rangeIds.push(id);
    }
  }

  const merged = new Set<string>(rangeIds);
  for (const id of explicit) {
    if (!excluded.has(id)) merged.add(id);
  }
  return Array.from(merged);
}

function getSectionStartCandidateId(ast: DocumentAST, node?: SectionNode): string | undefined {
  if (!node) return undefined;
  if (node.startBlockId) return node.startBlockId;
  const expanded = expandBlockIdListOrRanges(ast, node.blockIds || []);
  return expanded[0];
}

function hasLexicalEvidenceForSpecialSection(
  sec: SectionNode,
  blocks: CanonicalBlock[],
): boolean {
  if (blocks.some((b) => b.type === 'heading')) return true;
  const key = normalizeLexicalText(sec.sectionKey || '');
  const titleNorm = normalizeLexicalText(sec.title || '');
  const isBib = key === 'bibliografia' || /\b(?:bibliografia|referencias)\b/.test(titleNorm);

  for (const blk of blocks.slice(0, 4)) {
    const norm = normalizeLexicalText(blk.text || '');
    if (!norm) continue;
    if (SPECIAL_SECTION_TITLE_RE.test(norm)) return true;
    if (isBib && (/\(\s*(?:19|20)\d{2}[a-z]?\s*\)/.test(norm) || /https?:\/\/|doi:/i.test(norm))) {
      return true;
    }
  }
  return false;
}

/**
 * Neutraliza cortes alucinados (p. ej. "Anexo A", "Bibliografía", "Glosario" o secciones vacías
 * inventadas por la IA sin respaldo en los bloques reales del AST), fusionando sus bloques reales
 * de vuelta al capítulo anterior para garantizar 0% invención y 0% pérdida de texto.
 */
export function sanitizeHallucinatedSections(
  ast: DocumentAST,
  sections: SectionNode[],
): { sections: SectionNode[]; removedCount: number } {
  const blockMap = new Map<string, CanonicalBlock>();
  for (const b of ast.blocks) blockMap.set(b.id, b);

  const sanitized: SectionNode[] = [];
  let removedCount = 0;

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const nextStart =
      i + 1 < sections.length ? (getSectionStartCandidateId(ast, sections[i + 1]) ?? null) : null;
    const resolvedIds = expandSectionNodeBlockIds(ast, sec, nextStart);
    const existingBlocks = resolvedIds
      .map((id) => blockMap.get(id))
      .filter((b): b is CanonicalBlock => Boolean(b));

    if (existingBlocks.length === 0) {
      removedCount++;
      continue;
    }

    const keyNorm = normalizeLexicalText(sec.sectionKey || '');
    const titleNorm = normalizeLexicalText(sec.title || '');
    const isSpecialSection =
      SPECIAL_SECTION_KEYS.has(keyNorm) || SPECIAL_SECTION_TITLE_RE.test(titleNorm);

    if (
      sanitized.length > 0 &&
      isSpecialSection &&
      !hasLexicalEvidenceForSpecialSection(sec, existingBlocks)
    ) {
      const prev = sanitized[sanitized.length - 1];
      const prevIds = prev.blockIds || [];
      const mergedSet = new Set(prevIds);
      for (const blk of existingBlocks) mergedSet.add(blk.id);
      sanitized[sanitized.length - 1] = {
        ...prev,
        blockIds: Array.from(mergedSet),
      };
      removedCount++;
      continue;
    }

    sanitized.push({
      ...sec,
      title: String(sec.title || '').trim() || existingBlocks[0]?.text?.slice(0, 90) || 'Contenido principal',
      blockIds: existingBlocks.map((b) => b.id),
    });
  }

  return { sections: sanitized, removedCount };
}

/**
 * Respaldo determinista multi-capítulo real sobre el AST (sin aplastar en "Capítulo 1"):
 * - Extrae metadatos de portada de página 1 (`Tema:`, `Proyecto:`, `Autor:`, etc.).
 * - Separa cada capítulo/sección por encabezados y títulos numerados reales.
 * - Detecta títulos duplicados, secciones vacías y diferencias contra el índice original.
 */
export function buildDeterministicProposalFromAst(
  ast: DocumentAST,
  options?: { importedTocEntries?: ImportedTocRef[] },
): StructureAnalysis {
  const blocks = ast.blocks;
  const coverBlockIds: string[] = [];
  const extractedMetadata: { title?: string; subtitle?: string; author?: string } = {};
  const extractedLegalFields: {
    institucion?: string;
    catedra?: string;
    docente?: string;
    integrantes?: string;
    tema?: string;
  } = {};

  let bodyStartIdx = 0;
  while (bodyStartIdx < blocks.length && bodyStartIdx < 8 && blocks[bodyStartIdx].page === 1) {
    const blk = blocks[bodyStartIdx];
    const txt = (blk.text || '').trim();
    if (!txt || blk.type !== 'paragraph') break;
    const temaM = /^tema\s*:\s*(.+)$/i.exec(txt);
    const proyM = /^(?:proyecto|t[ií]tulo|trabajo)\s*:\s*(.+)$/i.exec(txt);
    const autorM = /^(?:autor(?:es)?|alumn[oa]s?|integrantes?)\s*:\s*(.+)$/i.exec(txt);
    const docM = /^(?:docente|profesor(?:a)?|tutor(?:a)?)\s*:\s*(.+)$/i.exec(txt);
    const instM = /^(?:instituci[oó]n|universidad|escuela|colegio|facultad)\s*:\s*(.+)$/i.exec(txt);
    if (temaM || proyM || autorM || docM || instM) {
      if (temaM) extractedLegalFields.tema = temaM[1].trim();
      if (proyM && !extractedMetadata.title) extractedMetadata.title = proyM[1].trim();
      if (autorM && !extractedMetadata.author) extractedMetadata.author = autorM[1].trim();
      if (docM) extractedLegalFields.docente = docM[1].trim();
      if (instM) extractedLegalFields.institucion = instM[1].trim();
      coverBlockIds.push(blk.id);
      bodyStartIdx++;
      continue;
    }
    break;
  }

  const sections: SectionNode[] = [];
  let curTitle = 'Contenido inicial';
  let curKey = 'introduccion';
  let curCat: 'preliminares' | 'cuerpo' | 'cierre' = 'preliminares';
  let curIds: string[] = [];

  const auditIssues: StructureAuditIssue[] = [];
  const seenHeadingNorms = new Map<string, string>();

  const flush = () => {
    if (curIds.length === 0) return;
    sections.push({
      sectionId: `sec_det_${sections.length + 1}`,
      sectionKey: curKey,
      category: curCat,
      title: curTitle,
      level: 1,
      blockIds: curIds,
      rationale: 'Estructuración automática por encabezados y jerarquía del documento.',
    });
    curIds = [];
  };

  for (let i = bodyStartIdx; i < blocks.length; i++) {
    const blk = blocks[i];
    const txt = (blk.text || '').trim();
    const isH = isHeadingLikeAstBlock(blk);
    const isSub = blk.type === 'heading' && (blk.headingLevel || 1) >= 2 && sections.length > 0;

    if (isH && !isSub && txt) {
      const cleanTitle = txt.replace(/^#+\s*/, '').trim();
      const normTitle = normalizeAstAscii(cleanTitle).replace(/^(?:\d+(?:\.\d+)?|[ivxl]+)[.)]\s*/, '');

      if (curIds.length === 1 && isHeadingLikeAstBlock(blocks[i - 1])) {
        auditIssues.push({
          type: 'empty_section',
          title: `Apartado sin contenido: "${curTitle}"`,
          detail: 'Este título apareció sin párrafos debajo antes del siguiente apartado.',
        });
      }

      if (seenHeadingNorms.has(normTitle) && normTitle.length >= 4) {
        auditIssues.push({
          type: 'duplicate_heading',
          title: `Título repetido: "${cleanTitle}"`,
          detail: `Coincide con "${seenHeadingNorms.get(normTitle)}". Podés unirlos o renombrar uno.`,
        });
      } else if (normTitle.length >= 4) {
        seenHeadingNorms.set(normTitle, cleanTitle);
      }

      if (/^(?:\d+\.\s*)?t[ií]tulo\s+del\s+proyecto$/i.test(cleanTitle) && blocks[i + 1]?.text) {
        const nextLine = blocks[i + 1].text!.trim();
        if (nextLine.length <= 120 && !extractedMetadata.title) {
          extractedMetadata.title = nextLine;
        }
      }

      flush();
      const inferred = inferSectionKeyFromHeading(cleanTitle);
      curTitle = cleanTitle;
      curKey = inferred.sectionKey;
      curCat = inferred.category;
      curIds = [blk.id];
      continue;
    }

    curIds.push(blk.id);
  }
  flush();

  if (sections.length === 0 && blocks.length > 0) {
    sections.push({
      sectionId: 'sec_det_1',
      sectionKey: 'capitulo',
      category: 'cuerpo',
      title: extractedMetadata.title || 'Cuerpo principal',
      level: 1,
      blockIds: blocks.map((b) => b.id),
      rationale: 'Preservación íntegra del contenido.',
    });
  }

  if (options?.importedTocEntries && options.importedTocEntries.length > 0) {
    const bodyTitlesNorm = sections.map((s) => normalizeAstAscii(s.title));
    for (const tocItem of options.importedTocEntries) {
      const tocNorm = normalizeAstAscii(tocItem.title);
      if (!tocNorm || tocNorm.length < 3) continue;
      const found = bodyTitlesNorm.some((bt) => bt.includes(tocNorm) || tocNorm.includes(bt));
      if (!found) {
        auditIssues.push({
          type: 'toc_mismatch',
          title: `Falta apartado del índice: "${tocItem.title}"`,
          detail: 'Figura en el índice original pero no se detectó como sección en el cuerpo.',
        });
      }
    }
  }

  return {
    documentType: 'other',
    currentStructureScore: Math.max(40, 88 - auditIssues.length * 10),
    keepOriginalStructure: true,
    ...(Object.keys(extractedMetadata).length > 0 ? { extractedMetadata } : {}),
    ...(Object.keys(extractedLegalFields).length > 0 ? { extractedLegalFields } : {}),
    ...(coverBlockIds.length > 0 ? { coverBlockIds } : {}),
    auditIssues,
    diagnosis:
      auditIssues.length > 0
        ? auditIssues.map((a) => a.title)
        : [`Se identificaron ${sections.length} apartado(s) manteniendo el 100% del contenido.`],
    improvementSuggestions: [],
    proposedSections: sections,
  };
}

/**
 * Convierte el AST en un esqueleto liviano (ahorra 80-90% de tokens)
 * preservando cada bloque y sus metadatos visuales/tabulares.
 */
export function buildCompactSkeleton(ast: DocumentAST, maxCharsPerBlock = 220): string {
  return ast.blocks
    .map((b) => {
      if (b.type === 'table' && b.tableData) {
        const hdrs = b.tableData.headers.filter(Boolean).join(', ');
        return `[${b.id}|P${b.page}|TABLE|${b.tableData.headers.length}x${b.tableData.rows.length}|headers:${hdrs}]`;
      }
      if (b.assetRef) {
        return `[${b.id}|P${b.page}|${b.type.toUpperCase()}|asset:${b.assetRef.assetId.slice(0, 14)}|desc:${b.assetRef.semanticSummary.slice(0, maxCharsPerBlock)}]`;
      }
      const snippet = (b.text ?? '').replace(/\s+/g, ' ').trim().slice(0, maxCharsPerBlock);
      const lvl = b.headingLevel ? `H${b.headingLevel}` : b.isBoldLead ? 'BOLD_LEAD' : b.type.toUpperCase();
      return `[${b.id}|P${b.page}|${lvl}] ${snippet}`;
    })
    .join('\n');
}

export interface IntegrityAuditResult {
  valid: boolean;
  missingIds: string[];
  extraIds: string[];
  duplicateIds: string[];
}

/**
 * Verificador determinista: garantiza que la propuesta de la IA
 * no pierda, duplique ni invente ningún bloque (texto, tabla o imagen).
 */
export function assertLosslessIntegrity(
  ast: DocumentAST,
  proposal: StructureAnalysis,
): IntegrityAuditResult {
  const blockMap = new Map<string, CanonicalBlock>();
  for (const b of ast.blocks) blockMap.set(b.id, b);
  const seen = new Set<string>();
  const duplicateIds: string[] = [];
  const extraIds: string[] = [];

  for (const id of expandBlockIdListOrRanges(ast, proposal.coverBlockIds || [])) {
    const blk = blockMap.get(id);
    if (blk && isGenuineCoverMetadataBlock(blk)) seen.add(id);
  }
  for (const id of expandBlockIdListOrRanges(ast, proposal.tocBlockIds || [])) {
    const blk = blockMap.get(id);
    if (blk && isGenuineTocBlock(blk)) seen.add(id);
  }

  for (let i = 0; i < proposal.proposedSections.length; i++) {
    const sec = proposal.proposedSections[i];
    const nextStart =
      i + 1 < proposal.proposedSections.length
        ? (getSectionStartCandidateId(ast, proposal.proposedSections[i + 1]) ?? null)
        : null;
    const resolvedIds = expandSectionNodeBlockIds(ast, sec, nextStart);
    for (const id of resolvedIds) {
      if (!blockMap.has(id)) {
        extraIds.push(id);
      }
      if (seen.has(id)) {
        duplicateIds.push(id);
      }
      seen.add(id);
    }
  }

  const missingIds = ast.blocks.map((b) => b.id).filter((id) => !seen.has(id));
  return {
    valid: missingIds.length === 0 && extraIds.length === 0 && duplicateIds.length === 0,
    missingIds,
    extraIds,
    duplicateIds,
  };
}

/**
 * Repara determinísticamente cualquier propuesta de IA para garantizar biyección 1:1 exacta:
 * neutraliza secciones/anexos alucinados, expande rangos `startBlockId..endBlockId` o `"blk_A..blk_B"`,
 * evita absorber cuerpo real en portada/índice, elimina IDs inexistentes o duplicados e inserta
 * todo bloque omitido junto a su predecesor contiguo.
 */
export function repairProposalToLosslessBijection(
  ast: DocumentAST,
  proposal: StructureAnalysis,
): {
  repaired: StructureAnalysis;
  auditBefore: IntegrityAuditResult;
  recoveredCount: number;
  dedupedCount: number;
} {
  const auditBefore = assertLosslessIntegrity(ast, proposal);
  const blockMap = new Map<string, CanonicalBlock>();
  for (const b of ast.blocks) blockMap.set(b.id, b);
  const seen = new Set<string>();
  const sectionOfBlock = new Map<string, number>();

  const cleanCoverIds: string[] = [];
  for (const id of expandBlockIdListOrRanges(ast, proposal.coverBlockIds || [])) {
    const blk = blockMap.get(id);
    if (blk && isGenuineCoverMetadataBlock(blk) && !seen.has(id)) {
      seen.add(id);
      cleanCoverIds.push(id);
    }
  }

  const cleanTocIds: string[] = [];
  for (const id of expandBlockIdListOrRanges(ast, proposal.tocBlockIds || [])) {
    const blk = blockMap.get(id);
    if (blk && isGenuineTocBlock(blk) && !seen.has(id)) {
      seen.add(id);
      cleanTocIds.push(id);
    }
  }

  const { sections: sanitizedSections } = sanitizeHallucinatedSections(
    ast,
    proposal.proposedSections,
  );

  const repairedSections: SectionNode[] = [];
  for (let i = 0; i < sanitizedSections.length; i++) {
    const sec = sanitizedSections[i];
    const nextStart =
      i + 1 < sanitizedSections.length
        ? (getSectionStartCandidateId(ast, sanitizedSections[i + 1]) ?? null)
        : null;
    const expandedIds = expandSectionNodeBlockIds(ast, sec, nextStart);
    const cleanIds: string[] = [];
    for (const id of expandedIds) {
      if (!blockMap.has(id) || seen.has(id)) continue;
      seen.add(id);
      cleanIds.push(id);
    }
    if (cleanIds.length > 0) {
      const secIdx = repairedSections.length;
      for (const id of cleanIds) sectionOfBlock.set(id, secIdx);
      repairedSections.push({ ...sec, blockIds: cleanIds });
    }
  }

  const missing = ast.blocks.map((b) => b.id).filter((id) => !seen.has(id));
  const unplacedHead: string[] = [];

  if (missing.length > 0) {
    const missingSet = new Set(missing);
    for (let i = 0; i < ast.blocks.length; i++) {
      const id = ast.blocks[i].id;
      if (!missingSet.has(id)) continue;

      let targetSecIdx: number | undefined;
      let predecessorId: string | undefined;
      for (let back = i - 1; back >= 0; back--) {
        const candidate = sectionOfBlock.get(ast.blocks[back].id);
        if (candidate !== undefined) {
          targetSecIdx = candidate;
          predecessorId = ast.blocks[back].id;
          break;
        }
      }

      if (targetSecIdx !== undefined) {
        const list = repairedSections[targetSecIdx].blockIds;
        const predPos = predecessorId ? list.indexOf(predecessorId) : -1;
        if (predPos >= 0) {
          list.splice(predPos + 1, 0, id);
        } else {
          list.push(id);
        }
        sectionOfBlock.set(id, targetSecIdx);
        seen.add(id);
      } else {
        unplacedHead.push(id);
      }
    }
  }

  if (unplacedHead.length > 0) {
    if (repairedSections.length > 0) {
      repairedSections[0] = {
        ...repairedSections[0],
        blockIds: [...unplacedHead, ...repairedSections[0].blockIds],
      };
    } else {
      repairedSections.push({
        sectionId: 'sec_recovered',
        sectionKey: 'capitulo',
        category: 'cuerpo',
        title: 'Contenido principal',
        level: 1,
        blockIds: unplacedHead,
        rationale: 'Recuperación automática completa para preservar el 100% del documento.',
      });
    }
  }

  return {
    repaired: {
      ...proposal,
      coverBlockIds: cleanCoverIds,
      tocBlockIds: cleanTocIds,
      proposedSections: repairedSections,
    },
    auditBefore,
    recoveredCount: missing.length,
    dedupedCount: auditBefore.duplicateIds.length + auditBefore.extraIds.length,
  };
}

export interface ReconstructedEditorialRecord {
  id: string;
  type:
    | 'paragraph'
    | 'subtitle'
    | 'quote'
    | 'callout'
    | 'poem'
    | 'epigraph'
    | 'list'
    | 'table'
    | 'image'
    | 'figure_placeholder'
    | 'footnote_list'
    | 'bibliography_item'
    | 'qr_or_break';
  content: string;
  subtitleLevel?: number;
  quoteAttribution?: string;
  calloutVariant?: string;
  calloutTitle?: string;
  calloutItems?: string[];
  listStyle?: 'bullet' | 'numbered';
  preserveLineBreaks?: boolean;
  footnotes?: { number: number; text: string }[];
  figureCaption?: string;
  figureHint?: string;
  tableHeaders?: string[];
  tableRows?: string[][];
  tableCaption?: string;
  tableHasHeaderRow?: boolean;
  imagePath?: string;
  imageCaption?: string;
  imageLayoutMode?: 'centered';
}

export interface ReconstructedEditorialSection {
  id: string;
  title: string;
  sectionKey: string;
  category: 'preliminares' | 'cuerpo' | 'cierre' | 'personalizada';
  visible: boolean;
  includeInToc: boolean;
  startNewPage: boolean;
  position: number;
  records: ReconstructedEditorialRecord[];
}

/**
 * Reconstruye secciones editoriales tomando el texto íntegro, tablas e imágenes
 * exclusivamente desde `Map<string, CanonicalBlock>` del DocumentAST original (0% reescritura IA).
 */
export function reconstructEditorialSectionsFromAst(
  ast: DocumentAST,
  proposal: StructureAnalysis,
  opts?: {
    sourceOrigin?: 'docx' | 'pdf_imported' | 'manual';
    assetUrlMap?: Record<string, string>;
  },
): ReconstructedEditorialSection[] {
  const { repaired } = repairProposalToLosslessBijection(ast, proposal);
  const blockMap = new Map<string, CanonicalBlock>();
  for (const b of ast.blocks) blockMap.set(b.id, b);

  const sections: ReconstructedEditorialSection[] = [];
  repaired.proposedSections.forEach((secNode, idx) => {
    const records: ReconstructedEditorialRecord[] = [];
    const roleMap = secNode.roleOverrides || {};

    secNode.blockIds.forEach((blkId, rIdx) => {
      const blk = blockMap.get(blkId);
      if (!blk) return;

      const resolvedType = roleMap[blkId] || blk.type;
      const recId = `rec_${blk.id}_${rIdx}`;

      // Si el bloque fue ascendido exactamente para nombrar esta sección y es un heading idéntico al título,
      // evitar duplicar el encabezado dentro del cuerpo cuando la sección ya tiene otros bloques debajo.
      if (
        secNode.blockIds.length > 1 &&
        rIdx === 0 &&
        (resolvedType === 'heading' || blk.type === 'heading') &&
        (blk.text || '').trim().toLowerCase() === secNode.title.trim().toLowerCase()
      ) {
        return;
      }

      if (resolvedType === 'table' || blk.type === 'table') {
        if (blk.tableData) {
          records.push({
            id: recId,
            type: 'table',
            content: blk.tableData.caption || blk.text || 'Tabla',
            tableHeaders: blk.tableData.headers,
            tableRows: blk.tableData.rows,
            tableCaption: blk.tableData.caption,
            tableHasHeaderRow: blk.tableData.hasHeaderRow,
          });
          return;
        }
      }

      if (
        resolvedType === 'image' ||
        resolvedType === 'diagram' ||
        resolvedType === 'chart' ||
        blk.assetRef
      ) {
        if (blk.assetRef) {
          records.push({
            id: recId,
            type: 'image',
            content: blk.assetRef.semanticSummary || blk.text || 'Imagen',
            imagePath: opts?.assetUrlMap?.[blk.assetRef.assetId] || blk.assetRef.assetId,
            imageCaption: blk.assetRef.semanticSummary || blk.text || '',
            imageLayoutMode: 'centered',
          });
          return;
        }
      }

      if (resolvedType === 'figure_placeholder') {
        records.push({
          id: recId,
          type: 'figure_placeholder',
          content: blk.figureCaption || blk.text || 'Figura',
          figureCaption: blk.figureCaption || blk.text || '',
          figureHint: blk.figureHint,
        });
        return;
      }

      if (resolvedType === 'footnote_list' && blk.footnotes?.length) {
        records.push({
          id: recId,
          type: 'footnote_list',
          content: blk.text || '',
          footnotes: blk.footnotes,
        });
        return;
      }

      if (resolvedType === 'heading') {
        records.push({
          id: recId,
          type: 'subtitle',
          subtitleLevel: blk.headingLevel === 3 ? 3 : 2,
          content: blk.text || '',
        });
        return;
      }

      if (resolvedType === 'callout') {
        records.push({
          id: recId,
          type: 'callout',
          calloutTitle: blk.calloutTitle,
          calloutVariant: blk.calloutVariant,
          calloutItems: blk.calloutItems,
          content: blk.text || '',
        });
        return;
      }

      if (resolvedType === 'poem') {
        records.push({
          id: recId,
          type: 'poem',
          preserveLineBreaks: true,
          content: blk.text || '',
        });
        return;
      }

      if (resolvedType === 'quote' || resolvedType === 'epigraph') {
        records.push({
          id: recId,
          type: resolvedType,
          quoteAttribution: blk.quoteAttribution,
          content: blk.text || '',
        });
        return;
      }

      if (resolvedType === 'list') {
        records.push({
          id: recId,
          type: 'list',
          listStyle: blk.listStyle || 'bullet',
          content: blk.text || '',
        });
        return;
      }

      records.push({
        id: recId,
        type: 'paragraph',
        content: blk.text || '',
        ...(opts?.sourceOrigin ? { sourceOrigin: opts.sourceOrigin } : {}),
      } as ReconstructedEditorialRecord);
    });

    const secKey = secNode.sectionKey || (idx === 0 ? 'introduccion' : 'capitulo');
    const category =
      secNode.category ||
      (secKey === 'bibliografia' || secKey === 'conclusiones' || secKey === 'glosario' || secKey === 'anexo' || secKey === 'epilogo'
        ? 'cierre'
        : secKey === 'prologo' || secKey === 'dedicatoria' || secKey === 'agradecimientos' || secKey === 'resumen' || secKey === 'introduccion'
          ? 'preliminares'
          : 'cuerpo');

    sections.push({
      id: `ed_${secKey}_${Date.now()}_${idx}`,
      title: secNode.title || `Sección ${idx + 1}`,
      sectionKey: secKey,
      category,
      visible: true,
      includeInToc: true,
      startNewPage: true,
      position: idx,
      records,
    });
  });

  return sections;
}
