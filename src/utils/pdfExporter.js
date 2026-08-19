import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

const getMonthNameEs = (date = new Date()) => {
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return months[date.getMonth()];
};

/**
 * Ultra HD High-Definition Native A4 PDF Generator
 * Format name: `CV - [Nombre Persona] - [Mes] - [Año].pdf`
 * Uses 300 DPI high resolution rendering (scale: 3.2) for crystal clear, sharp vector-like text.
 */
export async function exportCVToPDF(cvData) {
  const pageElements = Array.from(document.querySelectorAll('.a4-page-container'));

  if (!pageElements || pageElements.length === 0) {
    throw new Error('No se encontraron hojas A4 en la vista previa.');
  }

  // Exact Requested Naming Convention: CV - [Nombre] - [Mes] - [Año].pdf
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

  // Preload all image assets across all A4 pages to ensure complete rendering
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

    // Ultra HD Resolution Pass (scale 3 = ~300 DPI for sharp vector-like text & sharp photos)
    const canvas = await html2canvas(pageEl, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      imageTimeout: 15000,
      windowWidth: 1200,
      onclone: (clonedDoc) => {
        // Reset scale/transform on cloned document so html2canvas captures exact A4 dimensions
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
          p.style.width = '794px'; // 210mm at 96 DPI
          p.style.minHeight = '1123px'; // 297mm at 96 DPI
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
  }

  pdf.save(fileName);
}
