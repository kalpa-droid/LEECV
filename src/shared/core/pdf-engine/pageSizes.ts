/**
 * pageSizes.ts
 * Single source of truth for document paper dimensions and dynamic pagination math.
 * Supports A4, Carta, Legal, and Oficio.
 */

export interface PaperSize {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  pxWidth: number;
  pxHeight: number;
  label: string;
}

export const PAGE_SIZES: Record<string, PaperSize> = {
  a4:     { id: 'a4',     name: 'A4',     widthMm: 210, heightMm: 297, pxWidth: 794, pxHeight: 1123, label: 'A4 (210 × 297 mm)' },
  carta:  { id: 'carta',  name: 'Carta',  widthMm: 216, heightMm: 279, pxWidth: 816, pxHeight: 1054, label: 'Carta (216 × 279 mm)' },
  legal:  { id: 'legal',  name: 'Legal',  widthMm: 216, heightMm: 356, pxWidth: 816, pxHeight: 1345, label: 'Legal (216 × 356 mm)' },
  oficio: { id: 'oficio', name: 'Oficio', widthMm: 216, heightMm: 330, pxWidth: 816, pxHeight: 1247, label: 'Oficio (216 × 330 mm)' }
};

/**
 * Calculates dynamic items per page based on paper height available.
 */
export function calculateItemsPerPage(paperSizeId: string = 'a4', itemHeightMm: number = 40, reservedHeaderFooterMm: number = 65): number {
  const paper = PAGE_SIZES[paperSizeId] || PAGE_SIZES.a4;
  const availableHeightMm = Math.max(paper.heightMm - reservedHeaderFooterMm, 100);
  return Math.max(1, Math.floor(availableHeightMm / itemHeightMm));
}

/**
 * Calculates estimated height in mm for an item based on text length and content fields.
 */
export function getItemHeightMm(item: any, itemType: 'exp' | 'prof' | 'course' = 'exp'): number {
  if (!item) return 20;

  const detailsLength = (item.details || item.description || '').length;
  const titleLength = (item.role || item.degree || item.title || item.name || '').length;
  const instLength = (item.institution || item.company || '').length;

  let baseMm = itemType === 'exp' ? 24 : itemType === 'prof' ? 20 : 22;

  if (detailsLength > 0) {
    const lines = Math.ceil(detailsLength / 55);
    baseMm += lines * 5 + 6;
  }
  if (titleLength > 45) {
    baseMm += 5;
  }
  if (instLength > 45) {
    baseMm += 5;
  }

  return baseMm;
}

/**
 * Dynamically splits items into pages based on exact paper dimensions (A4, Carta, Oficio, Legal)
 * and real text content height to prevent overflow.
 */
export function getDynamicHeightChunks(
  items: any[], 
  paperSizeId: string = 'a4', 
  itemType: 'exp' | 'prof' | 'course' = 'exp',
  reservedHeaderFooterMm: number = 75,
  minLastPageItems: number = 1
): any[][] {
  if (!Array.isArray(items) || items.length === 0) return [];

  const paper = PAGE_SIZES[paperSizeId] || PAGE_SIZES.a4;
  const availableHeightMm = Math.max(paper.heightMm - reservedHeaderFooterMm, 120);

  const chunks: any[][] = [];
  let currentChunk: any[] = [];
  let currentHeightMm = 0;

  for (const item of items) {
    const itemMm = getItemHeightMm(item, itemType);

    if (currentChunk.length > 0 && (currentHeightMm + itemMm > availableHeightMm)) {
      chunks.push(currentChunk);
      currentChunk = [item];
      currentHeightMm = itemMm;
    } else {
      currentChunk.push(item);
      currentHeightMm += itemMm;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  // Self-balancing: avoid single orphan item on last page if possible
  if (chunks.length > 1 && chunks[chunks.length - 1].length < minLastPageItems && chunks[chunks.length - 2].length > 1) {
    const prevChunk = chunks[chunks.length - 2];
    const movedItem = prevChunk.pop();
    chunks[chunks.length - 1].unshift(movedItem);
  }

  return chunks;
}
