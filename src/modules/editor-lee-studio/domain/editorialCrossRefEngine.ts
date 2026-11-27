/**
 * Núcleo puro — Grafo Vivo de Referencias Cruzadas, Citas Importadas y Rótulos Normativos
 * (`editorialCrossRefEngine.ts`)
 *
 * Responsabilidades:
 * 1. Numerar dinámicamente Tablas (`Tabla 1..N`), Figuras (`Figura 1..N`) y Anexos (`Anexo A..Z`)
 *    sobre las secciones visibles en orden real de lectura.
 * 2. Resolver tokens vivos `[[ref:<targetId>]]` junto con `[[cite:<bibId>]]` en UI, PDF y Word.
 * 3. Formatear epígrafes/títulos de Tablas y Figuras según la norma activa (APA 7 en dos líneas
 *    sobre el elemento; Vancouver/IEEE con Figura debajo; Literario limpio sin forzar "Figura N").
 * 4. Convertir bibliografías importadas en texto plano (`.docx`/`.odt`/`.pdf`) a `bibliography_item`
 *    estructurados y vincular menciones inequívocas (`(Autor, Año)`, `[N]`, `Tabla N`, `Figura N`,
 *    `Anexo A`) a tokens sincronizados sin perder ni reescribir el texto original.
 *
 * 100% TypeScript puro (sin React, sin DOM, cero colores hex).
 */

import {
  buildInlineCiteToken,
  collectBibliographyFromSections,
  computeCitationAppearanceOrder,
  normalizeBibliographyStyle,
  resolveInlineCitationsInText,
  syncSectionsBibliographyOrder,
} from './editorialCitationFormatter';
import type {
  EditorialRecord,
  EditorialSection,
} from './editorialTypes';

export type CrossRefKind = 'table' | 'figure' | 'annex';

export interface CrossRefTarget {
  kind: CrossRefKind;
  targetId: string;
  sectionId: string;
  sectionTitle: string;
  index: number;
  letter?: string;
  label: string;
  shortCode: string;
  cleanTitle: string;
}

export interface EditorialCrossRefGraph {
  tables: CrossRefTarget[];
  figures: CrossRefTarget[];
  annexes: CrossRefTarget[];
  byTargetId: Map<string, CrossRefTarget>;
  bySectionAndKind: Map<string, CrossRefTarget[]>;
}

export interface ParsedInlineRefToken {
  rawToken: string;
  targetId: string;
}

export interface FormattedElementCaption {
  placement: 'above' | 'below';
  layout: 'two-line-apa' | 'inline';
  boldPrefix: string;
  titleText: string;
  shouldRender: boolean;
}

export interface ImportedReferenceEnrichmentResult {
  sections: EditorialSection[];
  parsedBibCount: number;
  linkedCitationsCount: number;
  linkedCrossRefsCount: number;
}

const INLINE_REF_REGEX = /\[\[ref:([a-zA-Z0-9_-]+)\]\]/g;

function normalizeNfd(text: string): string {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNfdLower(text: string): string {
  return normalizeNfd(text).toLowerCase();
}

function traceCrossRefHeuristic(reason: string, detail?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  void import('../../../shared/core/utils/monitoring')
    .then(({ reportMessage }) => {
      reportMessage(`Heurística de referencias editoriales (${reason})`, 'info', {
        context: 'editorialCrossRefEngine',
        extra: detail,
      });
    })
    .catch(() => {});
}

export function stripLeadingTableLabel(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^(?:tabla|cuadro)\s+\d+(?:\.\d+)?\s*(?:[:.\u2014\u2013-]\s*)?/i, '')
    .trim();
}

export function stripLeadingFigureLabel(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^(?:figura|fig\.?|ilustraci[oó]n|gr[aá]fico|imagen)\s+\d+(?:\.\d+)?\s*(?:[:.\u2014\u2013-]\s*)?/i, '')
    .trim();
}

export function stripLeadingAnnexLabel(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^(?:anexo|ap[eé]ndice)\s+[a-z0-9]+\s*(?:[:.\u2014\u2013-]\s*)?/i, '')
    .trim();
}

export function isAnnexEditorialSection(section?: Partial<EditorialSection> | null): boolean {
  if (!section) return false;
  if (section.sectionKey === 'anexo' || section.sectionKey === 'anexos_apendices') {
    return true;
  }
  if (section.category === 'cierre') {
    const normTitle = normalizeNfdLower(section.title || '');
    if (/^(?:anexo|apendice)\b/.test(normTitle)) {
      traceCrossRefHeuristic('annex_section_title', { sectionId: section.id, title: section.title });
      return true;
    }
  }
  return false;
}

export function isBibliographyEditorialSection(section?: Partial<EditorialSection> | null): boolean {
  if (!section) return false;
  if (section.sectionKey === 'bibliografia') return true;
  if (Array.isArray(section.records) && section.records.some((r) => r?.type === 'bibliography_item')) {
    return true;
  }
  const norm = normalizeNfdLower(section.title || '');
  if (
    /^(?:referencias(?:\s+bibliograficas)?|bibliografia|obras\s+citadas|fuentes(?:\s+consultadas)?)$/.test(
      norm,
    )
  ) {
    traceCrossRefHeuristic('bib_section_title', { sectionId: section.id, title: section.title });
    return true;
  }
  return false;
}

/**
 * Construye el grafo canónico vivo de Tablas, Figuras y Anexos sobre las secciones visibles.
 */
export function buildEditorialCrossRefGraph(
  sections: EditorialSection[] = [],
): EditorialCrossRefGraph {
  const tables: CrossRefTarget[] = [];
  const figures: CrossRefTarget[] = [];
  const annexes: CrossRefTarget[] = [];
  const byTargetId = new Map<string, CrossRefTarget>();
  const bySectionAndKind = new Map<string, CrossRefTarget[]>();

  const registerTarget = (target: CrossRefTarget) => {
    byTargetId.set(target.targetId, target);
    const key = `${target.sectionId}::${target.kind}`;
    const list = bySectionAndKind.get(key) || [];
    list.push(target);
    bySectionAndKind.set(key, list);
  };

  for (const sec of sections) {
    if (!sec || sec.visible === false) continue;

    if (isAnnexEditorialSection(sec)) {
      const idx = annexes.length + 1;
      const letter =
        idx <= 26 ? String.fromCharCode(64 + idx) : `A${idx - 26}`;
      const cleanTitle = stripLeadingAnnexLabel(sec.title || '');
      const target: CrossRefTarget = {
        kind: 'annex',
        targetId: sec.id,
        sectionId: sec.id,
        sectionTitle: sec.title || `Anexo ${letter}`,
        index: idx,
        letter,
        label: `Anexo ${letter}`,
        shortCode: `Anexo ${letter}`,
        cleanTitle,
      };
      annexes.push(target);
      registerTarget(target);
    }

    for (const rec of sec.records || []) {
      if (!rec) continue;
      if (rec.type === 'table') {
        const idx = tables.length + 1;
        const rawCap = rec.tableCaption || '';
        const cleanTitle = stripLeadingTableLabel(rawCap);
        const target: CrossRefTarget = {
          kind: 'table',
          targetId: rec.id,
          sectionId: sec.id,
          sectionTitle: sec.title || 'Sección',
          index: idx,
          label: `Tabla ${idx}`,
          shortCode: `T${idx}`,
          cleanTitle,
        };
        tables.push(target);
        registerTarget(target);
      } else if (rec.type === 'image' || rec.type === 'figure_placeholder') {
        const idx = figures.length + 1;
        const rawCap = rec.imageCaption || rec.figureCaption || '';
        const cleanTitle = stripLeadingFigureLabel(rawCap);
        const target: CrossRefTarget = {
          kind: 'figure',
          targetId: rec.id,
          sectionId: sec.id,
          sectionTitle: sec.title || 'Sección',
          index: idx,
          label: `Figura ${idx}`,
          shortCode: `F${idx}`,
          cleanTitle,
        };
        figures.push(target);
        registerTarget(target);
      }
    }
  }

  return { tables, figures, annexes, byTargetId, bySectionAndKind };
}

export function buildInlineRefToken(targetId: string): string {
  return `[[ref:${String(targetId || '').trim()}]]`;
}

export function extractInlineRefTokens(text: string): ParsedInlineRefToken[] {
  if (!text || !text.includes('[[ref:')) return [];
  const out: ParsedInlineRefToken[] = [];
  const re = new RegExp(INLINE_REF_REGEX.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ rawToken: m[0], targetId: m[1] });
  }
  return out;
}

export function resolveCrossRefsInText(
  text: string,
  graph: EditorialCrossRefGraph | undefined,
  rawBibStyle?: string,
): string {
  if (!text || !text.includes('[[ref:')) return text;
  const bibStyle = rawBibStyle ? normalizeBibliographyStyle(rawBibStyle) : 'apa7';
  return text.replace(INLINE_REF_REGEX, (_match, targetId: string) => {
    const target = graph?.byTargetId.get(targetId);
    if (!target) return '[Ref. pendiente]';
    if (bibStyle === 'ieee' && target.kind === 'figure') {
      return `Fig. ${target.index}`;
    }
    return target.label;
  });
}

/**
 * Resolutor único canónico para texto editorial (UI, PDF y Word):
 * resuelve citas bibliográficas (`[[cite:...]]`) y referencias cruzadas (`[[ref:...]]`).
 */
export function resolveAllEditorialInlineTokens(
  text: string,
  opts: {
    bibMap: Map<string, EditorialRecord>;
    bibStyle?: string;
    appearanceOrderMap?: Map<string, number>;
    crossRefGraph?: EditorialCrossRefGraph;
  },
): string {
  if (!text) return text;
  const afterCitations = resolveInlineCitationsInText(
    text,
    opts.bibMap,
    opts.bibStyle,
    opts.appearanceOrderMap,
  );
  return resolveCrossRefsInText(afterCitations, opts.crossRefGraph, opts.bibStyle);
}

/**
 * Formatea el título visible de una sección de Anexo sincronizado con `Anexo A`, `Anexo B`, etc.
 */
export function formatAnnexSectionDisplayTitle(
  rawTitle: string,
  target?: CrossRefTarget,
): string {
  if (!target || target.kind !== 'annex') return rawTitle;
  const clean = stripLeadingAnnexLabel(rawTitle);
  if (!clean) return target.label;
  if (normalizeNfdLower(clean) === normalizeNfdLower(target.label)) return target.label;
  return `${target.label} \u2014 ${clean}`;
}

/**
 * Formatea la etiqueta y ubicación normativa de una Tabla o Figura.
 */
export function formatNormativeElementCaption(
  kind: 'table' | 'figure',
  target: CrossRefTarget | undefined,
  rawCaption: string | undefined,
  opts: {
    structuralNormId?: string;
    bibliographyStyle?: string;
    interiorArchetype?: string;
  } = {},
): FormattedElementCaption {
  const bibStyle = normalizeBibliographyStyle(opts.bibliographyStyle || 'apa7');
  const structuralNorm = opts.structuralNormId || 'libre';
  const archetype = opts.interiorArchetype || 'literario';
  const cleanCaption =
    kind === 'table'
      ? stripLeadingTableLabel(rawCaption || '')
      : stripLeadingFigureLabel(rawCaption || '');

  const fallbackLabel = kind === 'table' ? 'Tabla' : 'Figura';
  const numberLabel = target?.label || fallbackLabel;

  const usesTwoLineApa =
    structuralNorm === 'apa7' &&
    (bibStyle === 'apa7' || bibStyle === 'harvard');

  if (usesTwoLineApa) {
    return {
      placement: 'above',
      layout: 'two-line-apa',
      boldPrefix: numberLabel,
      titleText: cleanCaption || (kind === 'table' ? 'Datos del apartado' : ''),
      shouldRender: kind === 'table' || Boolean(cleanCaption),
    };
  }

  if (bibStyle === 'vancouver' || bibStyle === 'ieee') {
    const prefix =
      kind === 'figure' && bibStyle === 'ieee' && target
        ? `Fig. ${target.index}.`
        : `${numberLabel}.`;
    return {
      placement: kind === 'table' ? 'above' : 'below',
      layout: 'inline',
      boldPrefix: prefix,
      titleText: cleanCaption,
      shouldRender: kind === 'table' ? Boolean(cleanCaption || target) : Boolean(cleanCaption),
    };
  }

  if (archetype === 'literario' && structuralNorm === 'libre') {
    return {
      placement: kind === 'table' ? 'above' : 'below',
      layout: 'inline',
      boldPrefix: kind === 'table' ? (cleanCaption ? `${numberLabel} \u2014` : numberLabel) : '',
      titleText: cleanCaption,
      shouldRender: Boolean(cleanCaption),
    };
  }

  // Ejecutivo, didáctico, Chicago, MLA o escolar
  return {
    placement: kind === 'table' ? 'above' : 'below',
    layout: 'inline',
    boldPrefix:
      kind === 'table'
        ? `${numberLabel}.`
        : cleanCaption
          ? `${numberLabel}.`
          : '',
    titleText: cleanCaption,
    shouldRender: kind === 'table' ? Boolean(cleanCaption || target) : Boolean(cleanCaption),
  };
}

function splitUrlFromTail(rawTail: string): { tail: string; url: string } {
  const m = rawTail.match(/\b((?:https?:\/\/|10\.\d{4,9}\/)\S+)/i);
  if (!m) return { tail: rawTail.trim(), url: '' };
  const url = m[1].replace(/[.,;)\]]+$/, '');
  const tail = rawTail.replace(m[0], '').replace(/\s{2,}/g, ' ').trim();
  return { tail, url };
}

function parseSingleImportedBibliographyLine(
  line: string,
  seqIdx: number,
  activeStyle: string,
): EditorialRecord | null {
  const clean = line.replace(/\s+/g, ' ').trim();
  if (clean.length < 16) return null;

  const baseId = `bib_imp_${Date.now().toString(36)}_${seqIdx}_${Math.random().toString(36).slice(2, 5)}`;

  // 1. Entrada numerada estilo Vancouver / IEEE: "[1] Autor. Titulo..." o "1. Autor. Titulo..."
  const numMatch = clean.match(/^(?:\[(\d{1,3})\]|(\d{1,3})[.)])\s+(.+)$/);
  if (numMatch) {
    const orderNum = Number(numMatch[1] || numMatch[2]);
    const rest = numMatch[3].trim();
    const { tail, url } = splitUrlFromTail(rest);
    const yearMatch = tail.match(/\b(19\d{2}|20\d{2})\b/);
    const sentences = tail.split(/\.\s+/).map((s) => s.trim()).filter(Boolean);
    const author = sentences[0] || '';
    const title = sentences[1] || rest;
    const venue = sentences.slice(2).join('. ').trim();
    return {
      id: baseId,
      type: 'bibliography_item',
      content: clean,
      bibStyle: normalizeBibliographyStyle(activeStyle),
      bibSourceType: url && !venue ? 'web' : venue ? 'articulo' : 'libro',
      bibAuthor: author,
      bibYear: yearMatch?.[1] || '',
      bibTitle: title,
      ...(venue ? { bibJournal: venue } : {}),
      ...(url ? { bibDoiOrUrl: url } : {}),
      bibOrderNumber: Number.isFinite(orderNum) && orderNum > 0 ? orderNum : seqIdx + 1,
    };
  }

  // 2. Entrada Autor (Año). Título. Fuente. (APA 7 / Harvard)
  const apaMatch = clean.match(
    /^([^()]{2,110}?)\s*\((\d{4}[a-z]?|s\.\s*f\.|n\.d\.)\)\.?\s*(.+)$/i,
  );
  if (apaMatch) {
    const author = apaMatch[1].replace(/\.+$/, '').trim();
    const year = apaMatch[2].trim();
    const { tail, url } = splitUrlFromTail(apaMatch[3]);
    const parts = tail.split(/\.\s+/).map((s) => s.trim()).filter(Boolean);
    const title = parts[0] || tail;
    const publisher = parts.slice(1).join('. ').trim();
    return {
      id: baseId,
      type: 'bibliography_item',
      content: clean,
      bibStyle: normalizeBibliographyStyle(activeStyle),
      bibSourceType: url && !publisher ? 'web' : 'libro',
      bibAuthor: author,
      bibYear: year,
      bibTitle: title,
      ...(publisher ? { bibEditorial: publisher } : {}),
      ...(url ? { bibDoiOrUrl: url } : {}),
      bibOrderNumber: seqIdx + 1,
    };
  }

  // 3. Fallback lossless: conservar texto completo como referencia editable
  const { tail, url } = splitUrlFromTail(clean);
  const yearMatch = tail.match(/\b(19\d{2}|20\d{2})\b/);
  return {
    id: baseId,
    type: 'bibliography_item',
    content: clean,
    bibStyle: normalizeBibliographyStyle(activeStyle),
    bibSourceType: url ? 'web' : 'libro',
    bibTitle: tail,
    bibYear: yearMatch?.[1] || '',
    ...(url ? { bibDoiOrUrl: url } : {}),
    bibOrderNumber: seqIdx + 1,
  };
}

function extractFirstSurnameNormalized(rawAuthor?: string): string {
  const clean = String(rawAuthor || '').trim();
  if (!clean) return '';
  const firstAuthor = clean.split(/\s*(?:;| y | and | & )\s*/i)[0]?.trim() || clean;
  const beforeComma = firstAuthor.includes(',')
    ? firstAuthor.split(',')[0]
    : firstAuthor.split(/\s+/)[0];
  return normalizeNfdLower(beforeComma || '');
}

/**
 * Parsea referencias importadas en apartados bibliográficos hacia `bibliography_item`
 * y vincula citas inequívocas (`(Autor, Año)`, `[N]`) y menciones cruzadas (`Tabla N`,
 * `Figura N`, `Anexo A`) en los capítulos del cuerpo.
 */
export function enrichImportedSectionsWithReferences(
  sections: EditorialSection[] = [],
  rawStyle?: string,
): ImportedReferenceEnrichmentResult {
  const style = normalizeBibliographyStyle(rawStyle || 'apa7');
  let parsedBibCount = 0;

  // Paso A: convertir párrafos/listas dentro de secciones bibliográficas en bibliography_item
  const sectionsWithBib: EditorialSection[] = sections.map((sec) => {
    if (!sec || !isBibliographyEditorialSection(sec)) return sec;
    const nextRecords: EditorialRecord[] = [];
    for (const rec of sec.records || []) {
      if (!rec) continue;
      if (rec.type === 'bibliography_item') {
        nextRecords.push(rec);
        continue;
      }
      if (rec.type !== 'paragraph' && rec.type !== 'list') {
        nextRecords.push(rec);
        continue;
      }
      const rawContent = String(rec.content || '').trim();
      if (!rawContent) continue;
      const candidateLines = rawContent
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      for (const line of candidateLines) {
        const parsed = parseSingleImportedBibliographyLine(
          line,
          nextRecords.filter((r) => r.type === 'bibliography_item').length,
          style,
        );
        if (parsed) {
          nextRecords.push(parsed);
          parsedBibCount++;
        }
      }
    }
    return { ...sec, records: nextRecords };
  });

  // Preparar índices inequívocos de fuentes bibliográficas
  const { items: bibItems } = collectBibliographyFromSections(sectionsWithBib);
  const byOrderNum = new Map<number, EditorialRecord>();
  const bySurnameYear = new Map<string, EditorialRecord | null>();

  for (const item of bibItems) {
    if (typeof item.bibOrderNumber === 'number' && item.bibOrderNumber > 0 && !byOrderNum.has(item.bibOrderNumber)) {
      byOrderNum.set(item.bibOrderNumber, item);
    }
    const surname = extractFirstSurnameNormalized(item.bibAuthor);
    const year = normalizeNfdLower(item.bibYear || '');
    if (surname && year) {
      const k = `${surname}|${year}`;
      if (!bySurnameYear.has(k)) {
        bySurnameYear.set(k, item);
      } else {
        // Colisión ambigua (mismo primer apellido y mismo año): no adivinar automáticamente
        bySurnameYear.set(k, null);
      }
    }
  }

  // Grafo de tablas, figuras y anexos reales
  const graph = buildEditorialCrossRefGraph(sectionsWithBib);
  const tableByIdx = new Map(graph.tables.map((t) => [t.index, t]));
  const figureByIdx = new Map(graph.figures.map((f) => [f.index, f]));
  const annexByLetter = new Map(
    graph.annexes.filter((a) => a.letter).map((a) => [a.letter!.toUpperCase(), a]),
  );

  const numberedEntriesRatio =
    bibItems.length > 0
      ? bibItems.filter((b) => typeof b.bibOrderNumber === 'number').length / bibItems.length
      : 0;
  const allowNumericBracketLinking =
    byOrderNum.size > 0 && (style === 'vancouver' || style === 'ieee' || numberedEntriesRatio >= 0.6);

  let linkedCitationsCount = 0;
  let linkedCrossRefsCount = 0;

  const linkText = (rawText: string): string => {
    if (!rawText) return rawText;
    let out = rawText;

    // Paso B1: citas parentéticas inequívocas "(García, 2024)" o "(García, 2024, p. 15)"
    if (bySurnameYear.size > 0) {
      out = out.replace(
        /(^|[^[\w])\(([A-ZÁÉÍÓÚÜÑ][^()\d\n]{1,42}?),\s*(\d{4}[a-z]?)(?:,\s*(pp?\.\s*\d+(?:[-–]\d+)?))?\)/g,
        (full, lead: string, authorGroup: string, year: string, locator?: string) => {
          const surname = extractFirstSurnameNormalized(authorGroup);
          const matched = bySurnameYear.get(`${surname}|${normalizeNfdLower(year)}`);
          if (!matched) return full;
          linkedCitationsCount++;
          return `${lead}${buildInlineCiteToken(matched.id, locator)}`;
        },
      );
    }

    // Paso B2: citas numéricas "[1]" o "[1, 2]" (sin tocar notas al pie "[^1]" ni "[[cite:")
    if (allowNumericBracketLinking) {
      out = out.replace(
        /(^|[^\[^\w])\[(\d{1,3}(?:\s*,\s*\d{1,3})*)\]/g,
        (full, lead: string, innerNums: string) => {
          const nums = innerNums
            .split(',')
            .map((s) => Number(s.trim()))
            .filter((n) => Number.isFinite(n) && n > 0);
          if (nums.length === 0 || nums.some((n) => !byOrderNum.has(n))) return full;
          const tokens = nums.map((n) => {
            const target = byOrderNum.get(n)!;
            linkedCitationsCount++;
            return buildInlineCiteToken(target.id);
          });
          return `${lead}${tokens.join(' ')}`;
        },
      );
    }

    // Paso C: menciones cruzadas explícitas a Tabla N, Figura N y Anexo A
    if (tableByIdx.size > 0) {
      out = out.replace(
        /(^|[^\[^\w])(?:Tabla|Cuadro)\s+(\d{1,3})\b/g,
        (full, lead: string, numStr: string) => {
          const target = tableByIdx.get(Number(numStr));
          if (!target) return full;
          linkedCrossRefsCount++;
          return `${lead}${buildInlineRefToken(target.targetId)}`;
        },
      );
    }

    if (figureByIdx.size > 0) {
      out = out.replace(
        /(^|[^\[^\w])(?:Figura|Fig\.)\s+(\d{1,3})\b/g,
        (full, lead: string, numStr: string) => {
          const target = figureByIdx.get(Number(numStr));
          if (!target) return full;
          linkedCrossRefsCount++;
          return `${lead}${buildInlineRefToken(target.targetId)}`;
        },
      );
    }

    if (annexByLetter.size > 0) {
      out = out.replace(
        /(^|[^\[^\w])Anexo\s+([A-Z])\b/g,
        (full, lead: string, letter: string) => {
          const target = annexByLetter.get(letter.toUpperCase());
          if (!target) return full;
          linkedCrossRefsCount++;
          return `${lead}${buildInlineRefToken(target.targetId)}`;
        },
      );
    }

    return out;
  };

  const LINKABLE_RECORD_TYPES = new Set(['paragraph', 'quote', 'callout', 'list']);

  const linkedSections = sectionsWithBib.map((sec) => {
    if (!sec || isBibliographyEditorialSection(sec)) return sec;
    return {
      ...sec,
      records: (sec.records || []).map((rec) => {
        if (!rec || !LINKABLE_RECORD_TYPES.has(rec.type) || typeof rec.content !== 'string') {
          return rec;
        }
        const updated = linkText(rec.content);
        return updated === rec.content ? rec : { ...rec, content: updated };
      }),
    };
  });

  if (parsedBibCount > 0 || linkedCitationsCount > 0 || linkedCrossRefsCount > 0) {
    traceCrossRefHeuristic('enrich_imported_references', {
      parsedBibCount,
      linkedCitationsCount,
      linkedCrossRefsCount,
      style,
    });
  }

  const finalSections = syncSectionsBibliographyOrder(linkedSections, style);
  // Asegurar que orden de aparición Vancouver siga siendo consistente
  computeCitationAppearanceOrder(finalSections);

  return {
    sections: finalSections,
    parsedBibCount,
    linkedCitationsCount,
    linkedCrossRefsCount,
  };
}
