import { PAGE_SIZES } from './pageSizes';

export interface ComputePageBreaksOptions {
  reservedHeaderFooterPx?: number;
  safetyMarginPx?: number;
}

export interface PageBreakResult {
  pages: number[][];
  pageCount: number;
}

export function computePageBreaks(
  itemEls: (HTMLElement | null)[], 
  paperSizeId: string = 'a4', 
  opts: ComputePageBreaksOptions = {}
): PageBreakResult {
  const paper = (PAGE_SIZES as any)[paperSizeId] || PAGE_SIZES.a4;

  const reservedRatio = 65 / 297;
  const reservedHeaderFooterPx = opts.reservedHeaderFooterPx
    ?? Math.round(paper.pxHeight * reservedRatio);

  const safetyMarginPx = opts.safetyMarginPx ?? 12;

  const usableHeightPx = paper.pxHeight - reservedHeaderFooterPx - safetyMarginPx;

  const pages: number[][] = [[]];
  let currentPageHeight = 0;

  itemEls.forEach((el, index) => {
    if (!el) return;
    const itemHeight = el.getBoundingClientRect().height;

    if (itemHeight > usableHeightPx) {
      if (currentPageHeight > 0) {
        pages.push([]);
        currentPageHeight = 0;
      }
      pages[pages.length - 1].push(index);
      pages.push([]);
      currentPageHeight = 0;
      return;
    }

    if (currentPageHeight + itemHeight > usableHeightPx) {
      pages.push([]);
      currentPageHeight = 0;
    }

    pages[pages.length - 1].push(index);
    currentPageHeight += itemHeight;
  });

  const cleanedPages = pages.filter(p => p.length > 0);

  return { pages: cleanedPages, pageCount: cleanedPages.length || 1 };
}

export async function waitForMeasurableContent(containerEl: Element | null): Promise<void> {
  if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
    await (document as any).fonts.ready;
  }
  if (!containerEl) return;
  const images = Array.from(containerEl.querySelectorAll('img')) as HTMLImageElement[];
  await Promise.all(images.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>(resolve => {
      img.addEventListener('load', () => resolve(), { once: true });
      img.addEventListener('error', () => resolve(), { once: true });
    });
  }));
}
