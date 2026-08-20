/**
 * pageSizes.js
 * Single source of truth for document paper dimensions and dynamic pagination math.
 * Supports A4, Carta, Legal, and Oficio.
 */

export const PAGE_SIZES = {
  a4:     { id: 'a4',     name: 'A4',     widthMm: 210, heightMm: 297, pxWidth: 794, pxHeight: 1123, label: 'A4 (210 × 297 mm)' },
  carta:  { id: 'carta',  name: 'Carta',  widthMm: 216, heightMm: 279, pxWidth: 816, pxHeight: 1054, label: 'Carta (216 × 279 mm)' },
  legal:  { id: 'legal',  name: 'Legal',  widthMm: 216, heightMm: 356, pxWidth: 816, pxHeight: 1345, label: 'Legal (216 × 356 mm)' },
  oficio: { id: 'oficio', name: 'Oficio', widthMm: 216, heightMm: 330, pxWidth: 816, pxHeight: 1247, label: 'Oficio (216 × 330 mm)' }
};

/**
 * Calculates dynamic items per page based on paper height available.
 * @param {string} paperSizeId - 'a4' | 'carta' | 'legal' | 'oficio'
 * @param {number} itemHeightMm - Estimated height of each item block in mm
 * @param {number} reservedHeaderFooterMm - Reserved padding/header/footer space in mm
 */
export function calculateItemsPerPage(paperSizeId = 'a4', itemHeightMm = 40, reservedHeaderFooterMm = 65) {
  const paper = PAGE_SIZES[paperSizeId] || PAGE_SIZES.a4;
  const availableHeightMm = Math.max(paper.heightMm - reservedHeaderFooterMm, 100);
  return Math.max(1, Math.floor(availableHeightMm / itemHeightMm));
}
