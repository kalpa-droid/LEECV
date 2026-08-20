/**
 * pageSizes.ts
 * Single source of truth for document paper dimensions and dynamic pagination math.
 * Supports A4, Carta, Legal, and Oficio.
 *
 * ARCHITECTURE (Paged.js-inspired):
 *   - This file provides a GENEROUS initial packing estimate only.
 *   - The REAL pagination is done in CVPreview.tsx via native browser
 *     overflow detection (scrollHeight > clientHeight), which removes
 *     items from overflowing pages until they fit, exactly like Paged.js.
 *   - This eliminates ALL manual font/line-height guesswork.
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
 * Optimistic height estimate used as initial OVER-PACKING pass.
 * The browser's native overflow detection (scrollHeight > clientHeight)
 * trims excess items down to exact 100% capacity per page.
 */
export function getItemHeightMm(item: any, itemType: 'exp' | 'prof' | 'course' = 'exp'): number {
  if (!item) return 10;

  const detailsLength = (item.details || item.description || '').length;
  const titleLength = (item.role || item.degree || item.title || item.name || item.course || '').length;
  const instLength = (item.institution || item.company || '').length;

  if (itemType === 'course') {
    let h = 7;
    if (titleLength > 55) h += 2.5;
    if (instLength > 55) h += 2.5;
    return h;
  }

  if (itemType === 'prof') {
    let h = 11;
    if (detailsLength > 0) {
      const lines = Math.ceil(detailsLength / 90);
      h += lines * 3 + 1.5;
    }
    if (titleLength > 55) h += 3;
    if (instLength > 55) h += 3;
    return h;
  }

  // exp
  let h = 13;
  if (detailsLength > 0) {
    const lines = Math.ceil(detailsLength / 90);
    h += lines * 3 + 1.5;
  }
  if (titleLength > 55) h += 3;
  if (instLength > 55) h += 3;
  return h;
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
  _minLastPageItems: number = 1
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

  return chunks;
}

export interface PrimarySectionBlock {
  secId: string;
  items: any[];
  itemType?: 'exp' | 'prof' | 'course';
}

export interface PagePrimaryGroup {
  pageIndex: number;
  blocks: PrimarySectionBlock[];
}

/**
 * INITIAL over-packing pass of primary section blocks into pages.
 * Uses optimistic height estimates so pages start full/over-packed.
 * The browser's native overflow detection in CVPreview.tsx will trim
 * excess items from overflowing pages until they fit 100% full.
 */
export function packPrimarySectionsIntoPages(
  blocks: PrimarySectionBlock[],
  paperSizeId: string = 'a4',
  reservedHeaderFooterMm: number = 35
): PagePrimaryGroup[] {
  const paper = PAGE_SIZES[paperSizeId] || PAGE_SIZES.a4;
  const availableHeightMm = Math.max(paper.heightMm - reservedHeaderFooterMm, 180);

  const pages: PagePrimaryGroup[] = [];
  let currentPageBlocks: PrimarySectionBlock[] = [];
  let currentHeightMm = 0;
  let currentPageIndex = 0;

  for (const block of blocks) {
    if (!block.items || block.items.length === 0) continue;

    const headerMm = 12;
    let itemsForBlockOnThisPage: any[] = [];
    let isHeaderOnThisPage = false;

    for (let i = 0; i < block.items.length; i++) {
      const item = block.items[i];
      const itemMm = getItemHeightMm(item, block.itemType || 'exp');
      const headerCost = isHeaderOnThisPage ? 0 : headerMm;
      const totalItemCost = headerCost + itemMm;

      if (currentHeightMm + totalItemCost > availableHeightMm && (currentPageBlocks.length > 0 || itemsForBlockOnThisPage.length > 0)) {
        if (itemsForBlockOnThisPage.length > 0) {
          currentPageBlocks.push({ secId: block.secId, items: itemsForBlockOnThisPage, itemType: block.itemType });
        }
        pages.push({ pageIndex: currentPageIndex, blocks: currentPageBlocks });

        currentPageIndex++;
        currentPageBlocks = [];
        currentHeightMm = 0;
        itemsForBlockOnThisPage = [item];
        isHeaderOnThisPage = true;
        currentHeightMm = headerMm + itemMm;
      } else {
        itemsForBlockOnThisPage.push(item);
        if (!isHeaderOnThisPage) {
          isHeaderOnThisPage = true;
          currentHeightMm += headerMm;
        }
        currentHeightMm += itemMm;
      }
    }

    if (itemsForBlockOnThisPage.length > 0) {
      currentPageBlocks.push({ secId: block.secId, items: itemsForBlockOnThisPage, itemType: block.itemType });
    }
  }

  if (currentPageBlocks.length > 0) {
    pages.push({ pageIndex: currentPageIndex, blocks: currentPageBlocks });
  }

  return pages;
}
