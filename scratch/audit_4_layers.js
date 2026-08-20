import fs from 'fs';

const PAGE_SIZES = {
  a4: { id: 'a4', name: 'A4', widthMm: 210, heightMm: 297 }
};

function getItemHeightMm(item, itemType = 'exp') {
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

  let expMm = 24;
  if (detailsLength > 0) {
    const lines = Math.ceil(detailsLength / 65);
    expMm += lines * 4.5 + 4;
  }
  if (titleLength > 40) expMm += 6;
  if (instLength > 40) expMm += 6;
  return expMm;
}

function packPrimarySectionsIntoPages(blocks, paperSizeId = 'a4', reservedHeaderFooterMm = 45) {
  const paper = PAGE_SIZES[paperSizeId] || PAGE_SIZES.a4;
  const availableHeightMm = Math.max(paper.heightMm - reservedHeaderFooterMm, 180);

  const pages = [];
  let currentPageBlocks = [];
  let currentHeightMm = 0;
  let currentPageIndex = 0;

  for (const block of blocks) {
    if (!block.items || block.items.length === 0) continue;

    const headerMm = 10;
    let itemsForBlockOnThisPage = [];
    let isHeaderOnThisPage = false;
    const totalBlockItems = block.items.length;

    for (let i = 0; i < block.items.length; i++) {
      const item = block.items[i];
      const itemMm = getItemHeightMm(item, block.itemType || 'exp');
      const headerCost = isHeaderOnThisPage ? 0 : headerMm;
      const totalItemCost = headerCost + itemMm;

      const isFirstItemOfSection = !isHeaderOnThisPage;

      let needsNextItemCheck = false;
      if (isFirstItemOfSection && totalBlockItems > 1 && (i + 1 < block.items.length)) {
        const nextItem = block.items[i + 1];
        const nextItemMm = getItemHeightMm(nextItem, block.itemType || 'exp');
        if (currentHeightMm + totalItemCost + nextItemMm > availableHeightMm) {
          needsNextItemCheck = true;
        }
      }

      if ((currentHeightMm + totalItemCost > availableHeightMm || needsNextItemCheck) && (currentPageBlocks.length > 0 || itemsForBlockOnThisPage.length > 0)) {
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

const rawData = fs.readFileSync('/home/mappo/Descargas/cv Daniela/MONICA_DANIELA_BURGOS_CV_2026.json', 'utf8');
const json = JSON.parse(rawData);
const cvData = json.cvData;

console.log("=========================================");
console.log(" AUDITORÍA CON SALTOS MULTILÍNEA Y MULTITEXTO REALES");
console.log("=========================================");

const availableHeightMm = 297 - 45; // 252mm

const education = cvData.education || [];
const profession = cvData.profession || [];
const experience = cvData.experience || [];
const courses = cvData.coursesAndCertificates || [];
const personalInfo = cvData.personalInfo || {};

const primaryOrder = cvData.layout.sectionOrders.primaria;

const primaryBlocks = primaryOrder.map(secId => {
  if (secId === 'formacion') return { secId: 'formacion', items: education, itemType: 'exp' };
  if (secId === 'profesion') return { secId: 'profesion', items: profession, itemType: 'prof' };
  if (secId === 'experiencia') return { secId: 'experiencia', items: experience, itemType: 'exp' };
  if (secId === 'cursos') return { secId: 'cursos', items: courses, itemType: 'course' };
  if (secId === 'personales') return { secId: 'personales', items: [personalInfo], itemType: 'exp' };
  return { secId, items: [], itemType: 'exp' };
}).filter(b => b.items.length > 0);

const pages = packPrimarySectionsIntoPages(primaryBlocks, 'a4', 45);

pages.forEach((p, idx) => {
  console.log(`\n--- HOJA DE CUERPO ${idx + 1} (Hoja Física ${idx + 2}) ---`);
  let totalHeight = 0;
  p.blocks.forEach(b => {
    console.log(`  Sección [${b.secId}]: ${b.items.length} ítems`);
    let blockHeight = 10;
    b.items.forEach((item, i) => {
      const h = getItemHeightMm(item, b.itemType);
      blockHeight += h;
      console.log(`    - Ítem ${i+1}: "${(item.role || item.degree || item.title || item.name || '').substring(0, 40)}" => ${h}mm`);
    });
    totalHeight += blockHeight;
    console.log(`    Subtotal Sección: ${blockHeight}mm`);
  });
  console.log(`  TOTAL ALTURA EN HOJA ${idx + 1}: ${totalHeight}mm / ${availableHeightMm}mm libre (${Math.round(totalHeight/availableHeightMm*100)}% ocupado)`);
});
