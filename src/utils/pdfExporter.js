import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

/**
 * Bulletproof Native A4 PDF Generator using html2canvas-pro + jsPDF.
 * html2canvas-pro natively supports Tailwind CSS v4 `oklch()`, `oklab()` and modern CSS color spaces.
 * Renders each .a4-page-container independently to prevent memory overflow
 * and guarantee 100% reliable 1-click PDF download for any CV size (1-10+ pages).
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

    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
  }

  pdf.save(fileName);
}
