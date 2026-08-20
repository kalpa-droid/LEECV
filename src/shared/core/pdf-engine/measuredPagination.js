import { PAGE_SIZES } from './pageSizes';

/**
 * Calcula en qué página debería caer cada ítem, midiendo su alto REAL
 * en el DOM en vez de estimarlo con una constante fija.
 *
 * Uso típico:
 *   1. Renderizar todos los ítems dentro de un contenedor oculto
 *      (visibility: hidden; position: absolute; pointer-events: none)
 *      con un ref por cada ítem.
 *   2. Esperar a que fuentes e imágenes estén cargadas.
 *   3. Llamar a computePageBreaks(itemRefs, paperSizeId) para obtener
 *      el índice de página de cada ítem.
 *   4. Usar ese resultado para el render final (visible / a exportar).
 *
 * @param {Array<HTMLElement>} itemEls - elementos ya renderizados a medir, en orden.
 * @param {string} paperSizeId - 'a4' | 'carta' | 'legal' | 'oficio'
 * @param {object} opts
 * @param {number} opts.reservedHeaderFooterPx - espacio reservado para header/footer/margen (default 65mm equivalentes en px según el papel).
 * @param {number} opts.safetyMarginPx - margen de seguridad para evitar desbordes por diferencias sutiles pantalla/impresión.
 * @returns {{ pages: number[][], pageCount: number }} - pages[i] = índices de ítems que van en la página i.
 */
export function computePageBreaks(itemEls, paperSizeId = 'a4', opts = {}) {
  const paper = PAGE_SIZES[paperSizeId] || PAGE_SIZES.a4;

  // Reservamos header/footer proporcional al alto real de la hoja, no una
  // constante fija en mm — así escala bien entre A4, Carta, Legal y Oficio,
  // que tienen relaciones de aspecto distintas.
  const reservedRatio = 65 / 297; // 65mm reservados sobre una A4 de 297mm, como referencia
  const reservedHeaderFooterPx = opts.reservedHeaderFooterPx
    ?? Math.round(paper.pxHeight * reservedRatio);

  const safetyMarginPx = opts.safetyMarginPx ?? 12; // ~3mm de colchón

  const usableHeightPx = paper.pxHeight - reservedHeaderFooterPx - safetyMarginPx;

  const pages = [[]];
  let currentPageHeight = 0;

  itemEls.forEach((el, index) => {
    if (!el) return;
    const itemHeight = el.getBoundingClientRect().height;

    // Si un solo ítem ya es más alto que la página entera, lo dejamos solo
    // en su propia página en vez de partirlo (evita loop infinito y evita
    // cortar un certificado o bloque a la mitad).
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

  // Sacar la última página si quedó vacía por el manejo de ítems gigantes
  const cleanedPages = pages.filter(p => p.length > 0);

  return { pages: cleanedPages, pageCount: cleanedPages.length || 1 };
}

/**
 * Espera a que fuentes web e imágenes visibles estén completamente
 * cargadas antes de medir — si no, la medición sale corta y el corte
 * de página queda mal (mismo problema que afectaba la exportación a PDF).
 */
export async function waitForMeasurableContent(containerEl) {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }
  if (!containerEl) return;
  const images = Array.from(containerEl.querySelectorAll('img'));
  await Promise.all(images.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });
  }));
}
