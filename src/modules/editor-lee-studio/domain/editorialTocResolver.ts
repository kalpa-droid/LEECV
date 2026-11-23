/**
 * Núcleo puro — Motor de Índice Automático Editorial (editorialTocResolver.ts)
 *
 * Genera entradas de índice para un documento editorial: para cada sección y sus
 * registros relevantes, calcula la página exacta donde aparece mediante dos pasadas
 * con marcadores invisibles (misma técnica probada en TemplateRenderer.tsx) y el motor
 * real de pages (pdfjs-dist) para extraer texto por página.
 *
 * Este módulo es PURO (sin React, sin DOM).
 */

import { EditorialSection, EditorialRecord } from './editorialTypes';
import { countEditorialSectionCoverPages } from './sanitizeEditorialData';

/** Representación mínima de una entrada de índice (para render final). */
export interface EditorialTocEntry {
  id: string;
  label: string;
  pageNumber: number;
  depth?: number;
}

/** Salida intermedia de la pasada 1. */
export interface EditorialAnchor {
  anchorId: string;
  label: string;
  pageNumber: number;
}

/**
 * Genera anchors para cada sección y registros relevantes.
 * `recordsOfSection` mapea sectionId -> registros de esa sección.
 * Solo se consideran records con type !== 'callout' && type !== 'image' como
 * relevantes para el índice (se pueden ampliar en la implementación).
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
      pageNumber: cumulativePageCount > 0 ? cumulativePageCount + 1 : 0,
    };
    anchors.push(anchor);
    cumulativePageCount += dividerPages;

    const sectionRecords = recordsOfSection[section.id] ?? [];
    const relevantRecords = sectionRecords.filter(
      (r) => r.type !== 'callout' && r.type !== 'image',
    );

    // Cada registro relevante agrega líneas; aproximamos 400 chars por página
    // (una línea ~150 chars). Se usa la suma de longitudes como estimación.
    const recordCharCount = relevantRecords.reduce((sum, r) => sum + (r.content?.length ?? 0), 0);
    const sectionLines = (section.title?.length ?? 0) + recordCharCount;
    const linesPerPage = 400 / 150;
    const pageCountForSection = Math.max(1, Math.ceil(sectionLines / linesPerPage));
    cumulativePageCount += pageCountForSection;

    for (let i = 0; i < relevantRecords.length; i++) {
      const subPage = cumulativePageCount + 1 + i;
      anchors.push({
        anchorId: `${section.id}-${relevantRecords[i].id}`,
        label: relevantRecords[i].title ?? relevantRecords[i].content.slice(0, 40),
        pageNumber: subPage,
      });
    }
  }

  return anchors;
}

/**
 * Resuelve pageNumbers reales (0-indexado) contra pageTexts (index -> texto).
 * Si no encuentra el anchorId, mantiene la estimación previa.
 */
export function resolvePageNumbers(
  anchors: EditorialAnchor[],
  pageTexts: Record<number, string>,
): EditorialTocEntry[] {
  const result: EditorialTocEntry[] = [];

  for (const anchor of anchors) {
    let foundPage = anchor.pageNumber;

    for (const [pageKey, text] of Object.entries(pageTexts)) {
      const pageNum = Number(pageKey);
      if (text.includes(anchor.anchorId)) {
        foundPage = pageNum;
        break;
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
 * Devuelve entradas ordenadas por pageNumber ascendente.
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
