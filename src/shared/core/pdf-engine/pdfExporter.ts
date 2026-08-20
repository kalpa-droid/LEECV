import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { CVData } from '../../../types/cv';

const getMonthNameEs = (date = new Date()) => {
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return months[date.getMonth()];
};

interface ATSTextNode {
  text: string;
  x: number;
  y: number;
  fontSize: number;
}

/**
 * Extracts visible text nodes with exact relative mm coordinates for ATS overlays
 */
function extractTextNodesForATS(containerElement: Element): ATSTextNode[] {
  if (!containerElement) return [];
  const textNodes: ATSTextNode[] = [];
  const containerRect = containerElement.getBoundingClientRect();
  if (!containerRect || containerRect.width === 0) return [];

  const walker = document.createTreeWalker(containerElement, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.textContent?.trim();
    if (text && text.length > 0) {
      const parent = node.parentElement;
      if (parent && parent.offsetParent !== null) {
        const rect = parent.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const x = ((rect.left - containerRect.left) / containerRect.width) * 210;
          const y = ((rect.top - containerRect.top) / containerRect.height) * 297 + 3;
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
 */
export async function exportCVToPDF(cvData: CVData | null | undefined): Promise<boolean> {
  const pageElements = Array.from(document.querySelectorAll('.a4-page-container'));

  if (!pageElements || pageElements.length === 0) {
    throw new Error('No se encontraron hojas A4 en la vista previa.');
  }

  const candidateName = (
    cvData?.personalInfo?.fullName || 
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

  if (typeof document !== 'undefined' && (document as any).fonts && (document as any).fonts.ready) {
    try { await (document as any).fonts.ready; } catch {}
  }

  const allImages = Array.from(document.querySelectorAll('.a4-page-container img')) as HTMLImageElement[];
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

    const atsTextNodes = extractTextNodesForATS(pageEl);

    const canvas = await html2canvas(pageEl as HTMLElement, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      imageTimeout: 15000,
      windowWidth: 794,
      onclone: (clonedDoc: Document) => {
        (clonedDoc.body.style as any).fontSmoothing = 'antialiased';
        (clonedDoc.body.style as any).webkitFontSmoothing = 'antialiased';

        const wrapper = clonedDoc.querySelector('.print-wrapper') as HTMLElement | null;
        if (wrapper) {
          wrapper.style.transform = 'none';
          wrapper.style.marginBottom = '0';
          wrapper.style.padding = '0';
        }
        const clonedPages = clonedDoc.querySelectorAll('.a4-page-container');
        clonedPages.forEach(p => {
          const el = p as HTMLElement;
          el.style.transform = 'none';
          el.style.boxShadow = 'none';
          el.style.width = '794px';
          el.style.minHeight = '1123px';
          el.style.height = '1123px';
        });

        const imgs = clonedDoc.querySelectorAll('img');
        imgs.forEach(img => {
          const el = img as HTMLImageElement;
          el.style.maxHeight = '100%';
          el.style.maxWidth = '100%';
        });
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

    try {
      atsTextNodes.forEach(({ text, x, y, fontSize }) => {
        pdf.setFontSize(fontSize);
        pdf.setTextColor(0, 0, 0);
        (pdf as any).text(text, x, y, { renderingMode: 'invisible' });
      });
    } catch (err) {
      console.warn('Aviso: Capa ATS parcial en página ' + (i + 1), err);
    }
  }

  pdf.save(fileName);
  return true;
}
