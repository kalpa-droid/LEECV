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

  for (let i = 0; i < pageElements.length; i++) {
    const pageEl = pageElements[i];

    // Ultra HD Resolution Pass (scale: 3.2 = ~300 DPI for crystal clear text)
    const canvas = await html2canvas(pageEl, {
      scale: 3.2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      imageTimeout: 0
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
  }

  pdf.save(fileName);
}
