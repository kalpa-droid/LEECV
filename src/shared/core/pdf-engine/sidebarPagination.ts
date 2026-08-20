import { PAGE_SIZES, getItemHeightMm } from './pageSizes.ts';

/**
 * Estimates the height in mm of a sidebar section based on its items and title header.
 */
export function estimateSidebarSectionHeightMm(secId: string, cvData: any): number {
  if (!cvData) return 30;

  const headerMm = 15;

  switch (secId) {
    case 'contacto':
      return 45;
    case 'competencias':
      return 35;
    case 'personales':
      return 40;
    case 'formacion': {
      const edu = cvData.education || [];
      if (edu.length === 0) return 0;
      const itemsMm = edu.reduce((acc: number, item: any) => acc + getItemHeightMm(item, 'exp'), 0);
      return headerMm + itemsMm;
    }
    case 'profesion': {
      const prof = cvData.profession || [];
      if (prof.length === 0) return 0;
      const itemsMm = prof.reduce((acc: number, item: any) => acc + getItemHeightMm(item, 'prof'), 0);
      return headerMm + itemsMm;
    }
    case 'cursos': {
      const courses = cvData.coursesAndCertificates || [];
      if (courses.length === 0) return 0;
      const itemsMm = courses.reduce((acc: number, item: any) => acc + getItemHeightMm(item, 'course'), 0);
      return headerMm + itemsMm;
    }
    case 'informatica': {
      const info = cvData.informatics || [];
      if (info.length === 0) return 0;
      return headerMm + info.length * 15;
    }
    case 'experiencia': {
      const exp = cvData.experience || [];
      if (exp.length === 0) return 0;
      const itemsMm = exp.reduce((acc: number, item: any) => acc + getItemHeightMm(item, 'exp'), 0);
      return headerMm + itemsMm;
    }
    case 'ecologia': {
      const eco = cvData.ecology || {};
      const totalItems = (eco.rural || []).length + (eco.environmental || []).length + (eco.community || []).length;
      if (totalItems === 0) return 0;
      return headerMm + totalItems * 16;
    }
    default:
      return 30;
  }
}

/**
 * Splits section IDs for the secondary column into page chunks based on real paper height.
 */
export function getSidebarPageChunks(
  sectionIds: string[],
  cvData: any,
  paperSizeId: string = 'a4',
  reservedHeaderFooterMm: number = 115
): string[][] {
  if (!Array.isArray(sectionIds) || sectionIds.length === 0) return [];

  const paper = PAGE_SIZES[paperSizeId] || PAGE_SIZES.a4;
  const availableHeightMm = Math.max(paper.heightMm - reservedHeaderFooterMm, 120);

  const pageChunks: string[][] = [];
  let currentChunk: string[] = [];
  let currentHeightMm = 0;

  for (const secId of sectionIds) {
    const secMm = estimateSidebarSectionHeightMm(secId, cvData);
    if (secMm === 0) continue;

    if (currentChunk.length > 0 && (currentHeightMm + secMm > availableHeightMm)) {
      pageChunks.push(currentChunk);
      currentChunk = [secId];
      currentHeightMm = secMm;
    } else {
      currentChunk.push(secId);
      currentHeightMm += secMm;
    }
  }

  if (currentChunk.length > 0) {
    pageChunks.push(currentChunk);
  }

  return pageChunks;
}
