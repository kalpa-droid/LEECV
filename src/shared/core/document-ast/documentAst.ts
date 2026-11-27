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
  sectionKey: z.string().optional(),
  category: z.enum(['preliminares', 'cuerpo', 'cierre', 'personalizada']).optional(),
  title: z.string(),
  level: z.number().int().min(1).max(4).default(1),
  blockIds: z.array(z.string()),
  roleOverrides: z.record(z.string(), BlockTypeSchema).optional(),
  rationale: z.string().default(''),
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
  detectedPresetId: z.string().optional(),
  currentStructureScore: z.number().min(0).max(100),
  keepOriginalStructure: z.boolean(),
  extractedMetadata: z
    .object({
      title: z.string().optional(),
      subtitle: z.string().optional(),
      author: z.string().optional(),
    })
    .optional(),
  diagnosis: z.array(z.string()),
  improvementSuggestions: z.array(z.string()),
  proposedSections: z.array(SectionNodeSchema),
});

export type CanonicalBlockType = z.infer<typeof BlockTypeSchema>;
export type CanonicalBlock = z.infer<typeof CanonicalBlockSchema>;
export type DocumentAST = z.infer<typeof DocumentASTSchema>;
export type SectionNode = z.infer<typeof SectionNodeSchema>;
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

  // PDF: "%PDF" -> 25 50 44 46
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
    return 'pdf';
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
  const originalIds = new Set(ast.blocks.map((b) => b.id));
  const seen = new Set<string>();
  const duplicateIds: string[] = [];
  const extraIds: string[] = [];

  for (const sec of proposal.proposedSections) {
    for (const id of sec.blockIds) {
      if (!originalIds.has(id)) {
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
 * elimina IDs inexistentes o duplicados e inserta todo bloque omitido junto a su predecesor contiguo
 * (o en un Anexo recuperado si estaba suelto al inicio).
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
  const originalIds = new Set(ast.blocks.map((b) => b.id));
  const seen = new Set<string>();
  const sectionOfBlock = new Map<string, number>();

  const repairedSections: SectionNode[] = [];
  for (const sec of proposal.proposedSections) {
    const cleanIds: string[] = [];
    for (const id of sec.blockIds) {
      if (!originalIds.has(id) || seen.has(id)) continue;
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
      // evitar duplicar el encabezado dentro del cuerpo del capítulo salvo si difiere.
      if (
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
