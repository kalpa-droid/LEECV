import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Bulletproof Native Browser PDF Generator
 * Uses native browser SVG foreignObject rendering via `html-to-image`
 * to completely eliminate Tailwind v4 "unsupported color function oklch" errors.
 * 
 * Includes an automatic fallback to sanitized `html2canvas` for maximum compatibility.
 */
export async function exportCVToPDF(cvData) {
  const pageElements = Array.from(document.querySelectorAll('.a4-page-container'));

  if (!pageElements || pageElements.length === 0) {
    throw new Error('No se encontraron hojas A4 en la vista previa.');
  }

  const surname = (cvData?.personalInfo?.surname || 'DOCENTE').trim().replace(/\s+/g, '_');
  const given = (cvData?.personalInfo?.givenNames || 'CV').trim().replace(/\s+/g, '_');
  const fileName = `CV_${surname}_${given}_A4.pdf`;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pdfWidth = 210;
  const pdfHeight = 297;

  for (let i = 0; i < pageElements.length; i++) {
    const pageEl = pageElements[i];
    let imgData = null;

    try {
      // Primary Native Engine: html-to-image (Uses browser native SVG renderer, 0 oklch parsing errors)
      imgData = await toJpeg(pageEl, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        filter: (node) => {
          // Exclude any element marked as no-print if embedded inside page
          if (node.classList && node.classList.contains('no-print')) {
            return false;
          }
          return true;
        }
      });
    } catch (primaryErr) {
      console.warn('html-to-image failed, falling back to html2canvas with oklch sanitizer:', primaryErr);

      // Fallback Engine: html2canvas with style sanitization for oklch
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const styleEls = Array.from(clonedDoc.querySelectorAll('style'));
          styleEls.forEach(s => {
            if (s.textContent) {
              s.textContent = s.textContent.replace(/oklch\([^)]+\)/g, 'rgb(15, 23, 42)');
            }
          });
        }
      });
      imgData = canvas.toDataURL('image/jpeg', 0.95);
    }

    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
  }

  pdf.save(fileName);
}
