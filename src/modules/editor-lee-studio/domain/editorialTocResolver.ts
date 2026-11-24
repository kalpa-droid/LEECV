/**
 * Núcleo puro — Motor de Índice Automático Editorial (editorialTocResolver.ts)
 *
 * Genera entradas de índice exactas para un documento editorial mediante
 * marcadores invisibles `__TOC_ID:<id>__` escaneados en dos pasadas sobre el
 * PDF real renderizado (`pdfjs-dist`), más numeración romana en preliminares
 * (`i, ii, iii...`) y arábiga reiniciada en `1` al iniciar el cuerpo de la obra.
 *
 * Este módulo es PURO (sin React, sin DOM, sin @react-pdf/renderer).
 */

import { EditorialSection, EditorialRecord } from './editorialTypes';
import { countEditorialSectionCoverPages } from './sanitizeEditorialData';

export const EDITORIAL_TOC_ANCHOR_PREFIX = '__TOC_ID:';
export const EDITORIAL_TOC_ANCHOR_SUFFIX = '__';

const PRELIMINARY_SECTION_KEYS = new Set<string>([
  'portada',
  'portadilla',
  'dedicatoria',
  'agradecimientos',
  'prologo',
  'prefacio',
  'indice',
  'resumen',
  'abstract',
  'derechos',
  'nota_autor',
  'epigrafe',
]);

/** Representación mínima de una entrada de índice (para render final). */
export interface EditorialTocEntry {
  id: string;
  label: string;
  pageNumber: number;
  displayPage?: string;
  depth?: number;
}

/** Salida intermedia de la pasada 1. */
export interface EditorialAnchor {
  anchorId: string;
  label: string;
  pageNumber: number;
}

/**
 * Formatea un identificador como token marcador invisible `__TOC_ID:<id>__`
 * que el motor PDF coloca dentro de la página para la pasada 1.
 */
export function formatTocAnchorToken(id: string): string {
  return `${EDITORIAL_TOC_ANCHOR_PREFIX}${id}${EDITORIAL_TOC_ANCHOR_SUFFIX}`;
}

/** Convierte un entero positivo (1..3999) a números romanos en minúsculas (i, ii, iii, iv...). */
export function toLowerRoman(num: number): string {
  const n = Math.floor(Number(num));
  if (!Number.isFinite(n) || n < 1 || n > 3999) {
    return String(num);
  }
  const numerals: Array<[number, string]> = [
    [1000, 'm'],
    [900, 'cm'],
    [500, 'd'],
    [400, 'cd'],
    [100, 'c'],
    [90, 'xc'],
    [50, 'l'],
    [40, 'xl'],
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
  ];
  let rem = n;
  let out = '';
  for (const [val, sym] of numerals) {
    while (rem >= val) {
      out += sym;
      rem -= val;
    }
  }
  return out;
}

/**
 * Extrae el mapa `{ anchorId -> página física 1-indexada }` recorriendo los textos
 * por página reportados por `pdfjs-dist` (`getTextContent()`).
 */
export function extractTocAnchorMapFromPageTexts(
  pageTexts: Record<number, string>,
): Record<string, number> {
  const anchorMap: Record<string, number> = {};
  if (!pageTexts || typeof pageTexts !== 'object') return anchorMap;

  const sortedPages = Object.keys(pageTexts)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n) && n >= 1)
    .sort((a, b) => a - b);

  const tokenRegex = /__TOC_ID:(.+?)__/g;

  for (const pageNum of sortedPages) {
    const rawText = String(pageTexts[pageNum] || '');
    if (!rawText.includes(EDITORIAL_TOC_ANCHOR_PREFIX)) continue;

    tokenRegex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = tokenRegex.exec(rawText)) !== null) {
      const id = (match[1] || '').trim();
      if (id && anchorMap[id] === undefined) {
        anchorMap[id] = pageNum;
      }
    }
  }

  return anchorMap;
}

/** Determina si una sección editorial corresponde a preliminares o al cuerpo principal. */
export function isEditorialPreliminarySection(section: Partial<EditorialSection>): boolean {
  if (section.masterPageMode === 'body') return false;
  if (section.masterPageMode === 'preliminary' || section.masterPageMode === 'clean') return true;
  if (section.category === 'preliminares') return true;
  if (section.category === 'cuerpo' || section.category === 'cierre') return false;
  if (section.sectionKey && PRELIMINARY_SECTION_KEYS.has(section.sectionKey)) return true;
  return false;
}

/**
 * Calcula la página física (1-indexada) donde comienza el cuerpo principal
 * (donde arranca la numeración arábiga `1, 2, 3...`).
 */
export function computeBodyStartPage(
  sections: EditorialSection[],
  rawAnchorMap: Record<string, number>,
  usePreliminaryRoman: boolean,
): number {
  if (!usePreliminaryRoman) return 1;
  const visible = (sections || []).filter((s) => s.visible !== false);
  for (const sec of visible) {
    if (!isEditorialPreliminarySection(sec)) {
      const phys = rawAnchorMap[sec.id];
      if (typeof phys === 'number' && phys >= 1) {
        return phys;
      }
    }
  }
  return 1;
}

/**
 * Formatea el número de folio visible de una página física según si pertenece a preliminares
 * (`i, ii, iii...`) o al cuerpo principal (`1, 2, 3...` reiniciando en `bodyStartPage`).
 */
export function formatEditorialDisplayPageNumber(
  physicalPage: number,
  bodyStartPage: number,
  usePreliminaryRoman: boolean,
): string {
  const safePhys = Math.max(1, Math.floor(physicalPage));
  if (!usePreliminaryRoman) {
    return String(safePhys);
  }
  const safeBodyStart = Math.max(1, Math.floor(bodyStartPage));
  if (safePhys < safeBodyStart) {
    return toLowerRoman(safePhys);
  }
  return String(safePhys - safeBodyStart + 1);
}

/**
 * Traduce todos los anchors detectados en la pasada 1 a sus folios visibles exactos
 * (`i, ii...` o arábigos `1+`), listos para inyectar en el render final del Índice.
 */
export function buildResolvedTocPageLabels(
  sections: EditorialSection[],
  rawAnchorMap: Record<string, number>,
  usePreliminaryRoman: boolean,
): {
  map: Record<string, string>;
  bodyStartPage: number;
  rawMap: Record<string, number>;
} {
  const bodyStartPage = computeBodyStartPage(sections, rawAnchorMap, usePreliminaryRoman);
  const map: Record<string, string> = {};
  for (const [anchorId, physPage] of Object.entries(rawAnchorMap)) {
    if (typeof physPage === 'number' && physPage >= 1) {
      map[anchorId] = formatEditorialDisplayPageNumber(physPage, bodyStartPage, usePreliminaryRoman);
    }
  }
  return { map, bodyStartPage, rawMap: rawAnchorMap };
}

/** Compara igualdad estructural entre dos mapas de folios resueltos (evita loops de re-render). */
export function areTocMapsEqual(
  a: Record<string, string> | undefined,
  b: Record<string, string> | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

/**
 * Genera anchors iniciales de respaldo (estimación determinística previa a la pasada 1 real).
 * Conservado para compatibilidad con callers y tests previos.
 */
export function generateSectionAnchors(
  sections: EditorialSection[],
  recordsOfSection: Partial<Record<string, EditorialRecord[]>>,
  design?: Record<string, any> | null,
  cover?: Record<string, any> | null,
): EditorialAnchor[] {
  const anchors: EditorialAnchor[] = [];
  let cumulativePageCount = 0;

  for (const section of sections) {
    const dividerPages = countEditorialSectionCoverPages(section, design, cover);
    const anchor: EditorialAnchor = {
      anchorId: section.id,
      label: section.title,
      pageNumber: cumulativePageCount > 0 ? cumulativePageCount + 1 : 1,
    };
    anchors.push(anchor);
    cumulativePageCount += dividerPages;

    const sectionRecords = recordsOfSection[section.id] ?? [];
    const relevantRecords = sectionRecords.filter(
      (r) => r.type !== 'callout' && r.type !== 'image',
    );

    const recordCharCount = relevantRecords.reduce((sum, r) => sum + (r.content?.length ?? 0), 0);
    const sectionLines = (section.title?.length ?? 0) + recordCharCount;
    const approxCharsPerPage = 1800;
    const pageCountForSection = Math.max(1, Math.ceil(sectionLines / approxCharsPerPage));
    const sectionStart = anchor.pageNumber + dividerPages;
    cumulativePageCount += pageCountForSection;

    for (let i = 0; i < relevantRecords.length; i++) {
      anchors.push({
        anchorId: `${section.id}-${relevantRecords[i].id}`,
        label: relevantRecords[i].title ?? relevantRecords[i].content.slice(0, 40),
        pageNumber: sectionStart + Math.floor((i * pageCountForSection) / Math.max(1, relevantRecords.length)),
      });
    }
  }

  return anchors;
}

/**
 * Resuelve pageNumbers reales contra `pageTexts` (1-indexado o `__TOC_ID:` tokens).
 */
export function resolvePageNumbers(
  anchors: EditorialAnchor[],
  pageTexts: Record<number, string>,
): EditorialTocEntry[] {
  const tokenMap = extractTocAnchorMapFromPageTexts(pageTexts);
  const result: EditorialTocEntry[] = [];

  for (const anchor of anchors) {
    let foundPage = tokenMap[anchor.anchorId] ?? anchor.pageNumber;

    if (tokenMap[anchor.anchorId] === undefined) {
      for (const [pageKey, text] of Object.entries(pageTexts)) {
        const pageNum = Number(pageKey);
        if (text.includes(anchor.anchorId)) {
          foundPage = pageNum;
          break;
        }
      }
    }

    result.push({
      id: anchor.anchorId,
      label: anchor.label,
      pageNumber: foundPage,
      depth: anchor.anchorId.includes('-') ? 1 : 0,
    });
  }

  return result;
}

/**
 * Genera el índice editorial final para un documento.
 */
export function generateEditorialToc(
  sections: EditorialSection[],
  recordsOfSection: Partial<Record<string, EditorialRecord[]>>,
  pageTexts: Record<number, string>,
): EditorialTocEntry[] {
  const anchors = generateSectionAnchors(sections, recordsOfSection);
  const resolved = resolvePageNumbers(anchors, pageTexts);
  return resolved.sort((a, b) => a.pageNumber - b.pageNumber);
}
