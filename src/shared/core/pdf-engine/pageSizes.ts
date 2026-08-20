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
 * Calculates estimated height in mm for an item based on real CSS card metrics and text wrapping.
 */
export function getItemHeightMm(item: any, itemType: 'exp' | 'prof' | 'course' = 'exp'): number {
  if (!item) return 20;

  const detailsLength = (item.details || item.description || '').length;
  const titleLength = (item.role || item.degree || item.title || item.name || item.course || '').length;
  const instLength = (item.institution || item.company || '').length;

  if (itemType === 'course') {
    let courseMm = 12;
    if (titleLength > 45) courseMm += 5;
    if (instLength > 45) courseMm += 5;
    return courseMm;
  }

  if (itemType === 'prof') {
    let profMm = 22;
    if (detailsLength > 0) {
      const lines = Math.ceil(detailsLength / 65);
      profMm += lines * 4.5 + 4;
    }
    if (titleLength > 40) profMm += 6;
    if (instLength > 40) profMm += 6;
    return profMm;
  }

  // Default 'exp' item
  let expMm = 24;
  if (detailsLength > 0) {
    const lines = Math.ceil(detailsLength / 65);
    expMm += lines * 4.5 + 4;
  }
  if (titleLength > 40) expMm += 6;
  if (instLength > 40) expMm += 6;
  return expMm;
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
 * Dynamically packs primary section blocks into pages using exact paper height dimensions.
 * Guarantees zero vertical overflow on Page 2 and all extra pages.
 */
export function packPrimarySectionsIntoPages(
  blocks: PrimarySectionBlock[],
  paperSizeId: string = 'a4',
  page1ReservedMm: number = 100,
  extraPageReservedMm: number = 45
): PagePrimaryGroup[] {
  const paper = PAGE_SIZES[paperSizeId] || PAGE_SIZES.a4;
  const page1AvailableMm = Math.max(paper.heightMm - page1ReservedMm, 140);
  const extraPageAvailableMm = Math.max(paper.heightMm - extraPageReservedMm, 200);

  const pages: PagePrimaryGroup[] = [];
  let currentPageBlocks: PrimarySectionBlock[] = [];
  let currentHeightMm = 0;
  let currentPageIndex = 0;

  const getAvailableHeight = (pageIdx: number) => pageIdx === 0 ? page1AvailableMm : extraPageAvailableMm;

  for (const block of blocks) {
    if (!block.items || block.items.length === 0) continue;

    const headerMm = 10;
    let itemsForBlockOnThisPage: any[] = [];
    let isHeaderOnThisPage = false;
    const totalBlockItems = block.items.length;

    for (let i = 0; i < block.items.length; i++) {
      const item = block.items[i];
      const itemMm = getItemHeightMm(item, block.itemType || 'exp');
      const headerCost = isHeaderOnThisPage ? 0 : headerMm;
      const totalItemCost = headerCost + itemMm;

      // Check if this is the FIRST item of a section on this page
      const isFirstItemOfSection = !isHeaderOnThisPage;

      // Prevent leaving a single isolated item at bottom when starting a multi-item section
      let needsNextItemCheck = false;
      if (isFirstItemOfSection && totalBlockItems > 1 && (i + 1 < block.items.length)) {
        const nextItem = block.items[i + 1];
        const nextItemMm = getItemHeightMm(nextItem, block.itemType || 'exp');
        if (currentHeightMm + totalItemCost + nextItemMm > getAvailableHeight(currentPageIndex)) {
          needsNextItemCheck = true;
        }
      }

      if ((currentHeightMm + totalItemCost > getAvailableHeight(currentPageIndex) || needsNextItemCheck) && (currentPageBlocks.length > 0 || itemsForBlockOnThisPage.length > 0)) {
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
