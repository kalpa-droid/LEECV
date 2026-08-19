import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

const getMonthNameEs = (date = new Date()) => {
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return months[date.getMonth()];
};

/**
 * Extracts visible text nodes with exact relative mm coordinates for ATS overlays
 */
function extractTextNodesForATS(containerElement) {
  if (!containerElement) return [];
  const textNodes = [];
  const containerRect = containerElement.getBoundingClientRect();
  if (!containerRect || containerRect.width === 0) return [];

  const walker = document.createTreeWalker(containerElement, NodeFilter.SHOW_TEXT, null, false);
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent?.trim();
    if (text && text.length > 0) {
      const parent = node.parentElement;
      if (parent && parent.offsetParent !== null) {
        const rect = parent.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const x = ((rect.left - containerRect.left) / containerRect.width) * 210;
          const y = ((rect.top - containerRect.top) / containerRect.height) * 297 + 3; // +3mm baseline alignment
          const computedFont = window.getComputedStyle(parent).fontSize;
          const fontSizePt = Math.max(6, Math.min(24, (parseFloat(computedFont) || 12) * 0.75));
          textNodes.push({ text, x, y, fontSize: fontSizePt });
        }
      }
    }
  }
  return textNodes;
}

/**
 * Ultra HD Hybrid Native A4 PDF Generator
 * Combines 300 DPI High-Res visual rendering with an invisible vector text layer.
 * Result: 100% Visual Fidelity + 100% Selectable, Searchable & ATS-Compatible Text.
 */
export async function exportCVToPDF(cvData) {
  const pageElements = Array.from(document.querySelectorAll('.a4-page-container'));

  if (!pageElements || pageElements.length === 0) {
    throw new Error('No se encontraron hojas A4 en la vista previa.');
  }

  const candidateName = (
    cvData?.personalInfo?.fullName || 
    `${cvData?.personalInfo?.surname || ''} ${cvData?.personalInfo?.givenNames || ''}`.trim() || 
    'Postulante'
  ).trim();

  const monthName = getMonthNameEs();
  const yearNum = new Date().getFullYear();
  const fileName = `CV - ${candidateName} - ${monthName} - ${yearNum}.pdf`;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pdfWidth = 210;
  const pdfHeight = 297;

  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch {}
  }

  const allImages = Array.from(document.querySelectorAll('.a4-page-container img'));
  await Promise.all(
    allImages.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );

  for (let i = 0; i < pageElements.length; i++) {
    const pageEl = pageElements[i];

    // Extract text nodes before canvas capture for exact ATS coordinates
    const atsTextNodes = extractTextNodesForATS(pageEl);

    // Ultra HD 300 DPI Visual Capture
    const canvas = await html2canvas(pageEl, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      imageTimeout: 15000,
      windowWidth: 794,
      onclone: (clonedDoc) => {
        clonedDoc.body.style.fontSmoothing = 'antialiased';
        clonedDoc.body.style.webkitFontSmoothing = 'antialiased';

        const wrapper = clonedDoc.querySelector('.print-wrapper');
        if (wrapper) {
          wrapper.style.transform = 'none';
          wrapper.style.marginBottom = '0';
          wrapper.style.padding = '0';
        }
        const clonedPages = clonedDoc.querySelectorAll('.a4-page-container');
        clonedPages.forEach(p => {
          p.style.transform = 'none';
          p.style.boxShadow = 'none';
          p.style.width = '794px';
          p.style.minHeight = '1123px';
          p.style.height = '1123px';
        });

        const imgs = clonedDoc.querySelectorAll('img');
        imgs.forEach(img => {
          img.style.maxHeight = '100%';
          img.style.maxWidth = '100%';
        });
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

    // Superpose ATS Invisible Vector Text Overlay
    try {
      atsTextNodes.forEach(({ text, x, y, fontSize }) => {
        pdf.setFontSize(fontSize);
        pdf.setTextColor(0, 0, 0);
        pdf.text(text, x, y, { renderingMode: 'invisible' });
      });
    } catch (err) {
      console.warn('Aviso: Capa ATS parcial en página ' + (i + 1), err);
    }
  }

  pdf.save(fileName);
  return true;
}
